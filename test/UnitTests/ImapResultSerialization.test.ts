import { ImapFlow } from 'imapflow';
import { IExecuteFunctions } from 'n8n-workflow';
import { moveEmailOperation } from '../../nodes/Imap/operations/email/functions/EmailMove';
import { copyEmailOperation } from '../../nodes/Imap/operations/email/functions/EmailCopy';
import { createDraftOperation } from '../../nodes/Imap/operations/email/functions/EmailCreateDraft';
import { getMailboxStatusOperation } from '../../nodes/Imap/operations/mailbox/functions/MailboxGetStatus';
import { getMailboxListOperation } from '../../nodes/Imap/operations/mailbox/functions/MailboxGetList';
import { createMockLogger } from '../TestUtils/N8nMocks';

describe('IMAP result serialization (issue #148)', () => {
  const logger = createMockLogger(false, false, false, false);
  const bigIntPrototype = BigInt.prototype;
  let originalBigIntToJson: PropertyDescriptor | undefined;
  let context: IExecuteFunctions;

  beforeEach(() => {
    originalBigIntToJson = Object.getOwnPropertyDescriptor(bigIntPrototype, 'toJSON');
    // n8n installs a global serializer. These operations must also work without it.
    Reflect.deleteProperty(bigIntPrototype, 'toJSON');
    const parameters: Record<string, unknown> = {
      sourceMailbox: { value: 'INBOX' },
      destinationMailbox: { value: 'Archive' },
      mailboxPath: { value: 'INBOX' },
      emailUid: '42,43',
      includeStatusFields: ['includeUidValidity', 'includeHighestModseq'],
      inputFormat: 'rfc822',
      rfc822: 'Subject: Test\r\n\r\nDraft body',
    };
    context = {
      getNodeParameter: jest.fn((name: string) => parameters[name]),
      getNode: jest.fn(() => ({ name: 'IMAP' })),
      logger,
    } as unknown as IExecuteFunctions;
  });

  afterEach(() => {
    if (originalBigIntToJson) {
      Object.defineProperty(bigIntPrototype, 'toJSON', originalBigIntToJson);
    } else {
      Reflect.deleteProperty(bigIntPrototype, 'toJSON');
    }
    jest.clearAllMocks();
  });

  describe.each([
    ['Move', moveEmailOperation, 'messageMove'],
    ['Copy', copyEmailOperation, 'messageCopy'],
  ] as const)('%s', (_name, operation, method) => {
    function createClient(response: unknown): ImapFlow {
      return {
        mailboxOpen: jest.fn().mockResolvedValue({}),
        [method]: jest.fn().mockResolvedValue(response),
      } as unknown as ImapFlow;
    }

    it('preserves the source-to-destination UID mapping', async () => {
      const response = {
        path: 'Archive',
        uidValidity: 123,
        uidMap: new Map([[42, 101], [43, 102]]),
      };
      const result = await operation.executeImapAction(context, logger, 0, createClient(response));

      expect(result?.[0].json).toEqual({
        path: 'Archive',
        uidValidity: 123,
        uidMap: { '42': 101, '43': 102 },
      });
      expect(response.uidMap).toBeInstanceOf(Map);
    });

    it('serializes native BigInt UIDVALIDITY without a host-provided toJSON', async () => {
      const result = await operation.executeImapAction(context, logger, 0, createClient({
        path: 'Archive',
        uidValidity: BigInt('4294967295'),
        uidMap: new Map([[42, 101]]),
      }));

      expect(result?.[0].json).toEqual({
        path: 'Archive',
        uidValidity: '4294967295',
        uidMap: { '42': 101 },
      });
      expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('accepts a successful response without COPYUID mapping', async () => {
      const result = await operation.executeImapAction(context, logger, 0, createClient({
        path: 'Archive',
      }));

      expect(result?.[0].json).toEqual({ path: 'Archive' });
    });
  });

  it('serializes mailbox status BigInts without losing modseq precision', async () => {
    const client = {
      status: jest.fn().mockResolvedValue({
        path: 'INBOX',
        messages: 2,
        uidValidity: BigInt('4294967295'),
        highestModseq: BigInt('9007199254740993'),
      }),
    } as unknown as ImapFlow;

    const result = await getMailboxStatusOperation.executeImapAction(context, logger, 0, client);

    expect(result?.[0].json).toEqual({
      path: 'INBOX',
      messages: 2,
      uidValidity: '4294967295',
      highestModseq: '9007199254740993',
    });
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it.each([false, true])('normalizes mailbox list status with host BigInt serializer = %s', async (hostSerializer) => {
    if (hostSerializer) {
      Object.defineProperty(bigIntPrototype, 'toJSON', {
        configurable: true,
        value(this: bigint) { return this.toString(); },
      });
    }
    const status = {
      uidValidity: BigInt('4294967295'),
      highestModseq: BigInt('9007199254740993'),
    };
    const client = {
      list: jest.fn().mockResolvedValue([{ path: 'INBOX', name: 'INBOX', status }]),
    } as unknown as ImapFlow;

    const result = await getMailboxListOperation.executeImapAction(context, logger, 0, client);

    // Assert the actual returned values, not JSON.stringify's host-specific coercion.
    expect(result?.[0].json).toEqual({
      path: 'INBOX',
      name: 'INBOX',
      status: { uidValidity: '4294967295', highestModseq: '9007199254740993' },
    });
    Reflect.deleteProperty(bigIntPrototype, 'toJSON');
    expect(() => JSON.stringify(result)).not.toThrow();
    expect(status.highestModseq).toBe(BigInt('9007199254740993'));
  });

  it('serializes APPENDUID BigInt when creating a draft', async () => {
    const client = {
      mailboxOpen: jest.fn().mockResolvedValue({}),
      append: jest.fn().mockResolvedValue({
        path: 'Archive',
        uid: 101,
        uidValidity: BigInt('4294967295'),
      }),
    } as unknown as ImapFlow;

    const result = await createDraftOperation.executeImapAction(context, logger, 0, client);

    expect(result?.[0].json).toEqual({ path: 'Archive', uid: 101, uidValidity: '4294967295' });
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});
