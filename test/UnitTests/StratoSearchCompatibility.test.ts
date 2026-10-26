import { createServer, Socket } from 'net';
import { IExecuteFunctions } from 'n8n-workflow';
import { STARTTLS_USAGE } from '../../credentials/ImapCredentials.credentials';
import { getEmailsListOperation } from '../../nodes/Imap/operations/email/functions/EmailGetList';
import { createNodeParametersCheckerMock } from '../TestUtils/N8nMocks';

async function createSearchServer(serverName: string) {
  const commands: string[] = [];
  const sockets = new Set<Socket>();
  const capabilities = 'IMAP4rev1 IMAP4rev2 ID ENABLE NAMESPACE CONDSTORE ESEARCH WITHIN AUTH=PLAIN SASL-IR';
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    let buffer = '';
    let rev2Enabled = false;
    let selected = false;
    const send = (line: string) => socket.write(`${line}\r\n`);
    send(`* OK [CAPABILITY ${capabilities}] Search compatibility fixture`);

    socket.on('data', (data) => {
      buffer += data.toString();
      let end: number;
      while ((end = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        commands.push(line);
        const [tag, command] = line.split(' ');
        const ok = () => send(`${tag} OK ${command} completed`);

        switch (command) {
          case 'CAPABILITY':
            send(`* CAPABILITY ${capabilities}`);
            ok();
            break;
          case 'ID':
            send(`* ID ("name" "${serverName}" "vendor" "Strato GmbH")`);
            ok();
            break;
          case 'AUTHENTICATE':
            ok();
            break;
          case 'NAMESPACE':
            send('* NAMESPACE (("" ".")) NIL NIL');
            ok();
            break;
          case 'ENABLE':
            rev2Enabled = /\bIMAP4rev2\b/i.test(line);
            send(`* ENABLED CONDSTORE${rev2Enabled ? ' IMAP4rev2' : ''}`);
            ok();
            break;
          case 'LIST':
          case 'LSUB':
            send(`* ${command} (\\HasNoChildren) "." "INBOX"`);
            ok();
            break;
          case 'SELECT':
            selected = true;
            send('* FLAGS (\\Seen)');
            send('* 1 EXISTS');
            send('* OK [UIDVALIDITY 1] UIDs valid');
            send('* OK [UIDNEXT 43] Next UID');
            send(`${tag} OK [READ-WRITE] SELECT completed`);
            break;
          case 'UID':
            if (!selected) {
              send(`${tag} BAD Select a mailbox first`);
            } else if (/ UID SEARCH /.test(line)) {
              // RZimapd accepts rev2 but then omits ALL even when messages match.
              // https://github.com/postalsys/imapflow/issues/411
              if (rev2Enabled) {
                send(`* ESEARCH (TAG "${tag}") UID${serverName === 'RZimapd' ? '' : ' ALL 42'}`);
              } else {
                send('* SEARCH 42');
              }
              ok();
            } else if (/ UID FETCH /.test(line)) {
              send('* 1 FETCH (UID 42 ENVELOPE (NIL "Fixture" NIL NIL NIL NIL NIL NIL NIL "<fixture@example.invalid>"))');
              ok();
            } else {
              send(`${tag} BAD Unsupported UID command`);
            }
            break;
          case 'LOGOUT':
            send('* BYE Closing fixture');
            ok();
            socket.end();
            break;
          default:
            send(`${tag} BAD Unsupported fixture command`);
        }
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No local fixture port');

  return {
    port: address.port,
    commands,
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    },
  };
}

describe('Strato SEARCH dependency compatibility', () => {
  it.each(['RZimapd', 'Other IMAP server'])(
    'fetches matching emails from %s while keeping WITHIN search enabled',
    async (serverName) => {
      const server = await createSearchServer(serverName);
      // DebugMode mocks this factory globally; this test needs the real client.
      const { createImapClient } = jest.requireActual<typeof import('../../nodes/Imap/utils/ImapUtils')>(
        '../../nodes/Imap/utils/ImapUtils',
      );
      const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, {
        mailboxPath: { value: 'INBOX' },
        emailDateRange: { since: new Date(Date.now() - 86400000).toISOString() },
        emailFlags: {},
        emailSearchFilters: {},
        limit: 5,
        includeParts: [],
      });
      const client = createImapClient({
        host: '127.0.0.1', port: server.port,
        user: 'fixture@example.invalid', password: 'fixture',
        tls: false, allowUnauthorizedCerts: false, startTLSUsage: STARTTLS_USAGE.NEVER,
      }, context.logger);

      try {
        await client.connect();
        const result = await getEmailsListOperation.executeImapAction(
          context as IExecuteFunctions, context.logger!, 0, client,
        );

        expect(result?.map(item => item.json.uid)).toEqual([42]);
        expect(server.commands.some(command => / UID SEARCH YOUNGER [1-9]\d*/.test(command))).toBe(true);
        expect(server.commands.some(command => / ENABLE .*IMAP4rev2/i.test(command)))
          .toBe(serverName !== 'RZimapd');
        await client.logout();
      } finally {
        client.close();
        await server.close();
      }
    },
    10000,
  );
});
