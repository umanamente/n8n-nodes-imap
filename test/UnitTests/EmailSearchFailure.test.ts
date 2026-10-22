import { IExecuteFunctions } from 'n8n-workflow';
import { getEmailsListOperation } from '../../nodes/Imap/operations/email/functions/EmailGetList';
import { ImapFlowErrorCatcher, NodeImapError } from '../../nodes/Imap/utils/ImapUtils';
import { DEFAULT_STARTTLS_USAGE } from '../../credentials/ImapCredentials.credentials';
import { executeWithHandler } from '../../nodes/Imap/Imap.node';
import { ImapNodeDebugUtils } from '../../nodes/Imap/utils/debug/ImapNodeDebugUtils';
import { createNodeParametersCheckerMock } from '../TestUtils/N8nMocks';

describe('Email Get Many SEARCH results', () => {
  function setup(searchResult: unknown) {
    const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, {
      mailboxPath: { value: 'INBOX' },
      emailDateRange: {},
      emailFlags: {},
      emailSearchFilters: {},
      limit: 50,
      includeParts: [],
    });
    const client = {
      mailboxOpen: jest.fn().mockResolvedValue(undefined),
      search: jest.fn().mockResolvedValue(searchResult),
      fetch: jest.fn(),
    };
    const execute = () => getEmailsListOperation.executeImapAction(
      context as IExecuteFunctions, context.logger!, 0, client as any,
    );
    return { client, execute, context };
  }

  function setupLoggedClient() {
    const { createImapClient } = jest.requireActual<typeof import('../../nodes/Imap/utils/ImapUtils')>(
      '../../nodes/Imap/utils/ImapUtils',
    );
    const { context } = setup([]);
    const client = createImapClient({
      host: 'localhost', port: 993, tls: true, allowUnauthorizedCerts: false,
      user: 'diagnostic@example.com', password: 'unused', startTLSUsage: DEFAULT_STARTTLS_USAGE,
    }, context.logger);
    jest.spyOn(client, 'mailboxOpen').mockResolvedValue({} as any);
    return { context, client };
  }

  it.each([false, undefined, null])('rejects an unsuccessful or invalid SEARCH result: %p', async (result) => {
    const { client, execute } = setup(result);

    await expect(execute()).rejects.toThrow(NodeImapError);
    expect(client.search).toHaveBeenCalledWith(expect.any(Object), { uid: true });
    expect(client.fetch).not.toHaveBeenCalled();
  });

  it('returns no items for a successful SEARCH with no matches', async () => {
    const { client, execute } = setup([]);

    await expect(execute()).resolves.toEqual([]);
    expect(client.fetch).not.toHaveBeenCalled();
  });

  it('propagates a SEARCH exception instead of treating it as no matches', async () => {
    const { client, execute } = setup([]);
    const error = new Error('Connection closed while searching');
    client.search.mockRejectedValue(error);

    await expect(execute()).rejects.toBe(error);
    expect(client.fetch).not.toHaveBeenCalled();
  });

  it('includes server warning details when SEARCH fails outside the node wrapper', async () => {
    const { context, client } = setupLoggedClient();
    jest.spyOn(client, 'search').mockImplementation(async () => {
      (client as any).log.warn({ msg: 'SEARCH rejected', responseText: 'Permission denied' });
      return false;
    });
    const fetch = jest.spyOn(client, 'fetch');

    await expect(getEmailsListOperation.executeImapAction(
      context as IExecuteFunctions, context.logger!, 0, client,
    )).rejects.toMatchObject({
      message: 'Unable to search emails',
      description: expect.stringContaining('Permission denied'),
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('retains warning details for a SEARCH exception handled by the node wrapper', async () => {
    const { context, client } = setupLoggedClient();
    const debugMode = jest.spyOn(ImapNodeDebugUtils, 'ImapNodeDebugUtilsEnabled').mockReturnValue(false);
    context.getInputData = jest.fn().mockReturnValue([{ json: {} }]);
    jest.spyOn(client, 'connect').mockResolvedValue(undefined as any);
    jest.spyOn(client, 'logout').mockResolvedValue(undefined);
    jest.spyOn(client, 'search').mockImplementation(async () => {
      client.log.warn({ msg: 'SEARCH connection lost', responseText: 'Server disconnected' });
      throw new Error('Connection closed while searching');
    });

    try {
      await expect(executeWithHandler(context as IExecuteFunctions, client, getEmailsListOperation)).rejects.toMatchObject({
        message: 'Connection closed while searching',
        description: expect.stringContaining('Server disconnected'),
      });
    } finally {
      debugMode.mockRestore();
    }
  });

  it.each(['empty', 'failure', 'exception'] as const)('stops direct SEARCH diagnostic collection after %s', async (outcome) => {
    const { context, client } = setupLoggedClient();
    jest.spyOn(client, 'search').mockImplementation(async () => {
      if (outcome === 'exception') throw new Error('SEARCH disconnected');
      return outcome === 'failure' ? false : [];
    });
    const result = getEmailsListOperation.executeImapAction(context as IExecuteFunctions, context.logger!, 0, client);
    if (outcome === 'empty') {
      await expect(result).resolves.toEqual([]);
    } else {
      await expect(result).rejects.toThrow();
    }

    client.log.warn({ msg: 'Unrelated warning after SEARCH finished' });
    expect(ImapFlowErrorCatcher.getInstance(client).stopAndGetErrorsList().caughtEntries).toEqual([]);
  });
});
