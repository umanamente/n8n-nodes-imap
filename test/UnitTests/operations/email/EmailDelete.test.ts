import { IExecuteFunctions } from 'n8n-workflow';
import { ImapFlow, type MailboxObject } from 'imapflow';
import { deleteEmailOperation } from '../../../../nodes/Imap/operations/email/functions/EmailDelete';
import { createMockLogger } from '../../../TestUtils/N8nMocks';
import { NodeImapError, ImapFlowErrorCatcher } from '../../../../nodes/Imap/utils/ImapUtils';

describe('EmailDelete operation', () => {
  let mockContext: jest.Mocked<IExecuteFunctions>;
  let mockClient: jest.Mocked<ImapFlow>;
  const ITEM_INDEX = 0;
  const MAILBOX_PATH = 'INBOX';
  const EMAIL_UID = '123';

  beforeEach(() => {
    mockContext = {
      getNodeParameter: jest.fn(),
      logger: createMockLogger(),
      getNode: jest.fn().mockReturnValue({ name: 'Imap Test Node' }),
    } as unknown as jest.Mocked<IExecuteFunctions>;

    mockClient = {
      mailboxOpen: jest.fn(),
      messageDelete: jest.fn(),
    } as unknown as jest.Mocked<ImapFlow>;

    (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
      if (paramName === 'mailboxPath') {
        return { value: MAILBOX_PATH };
      }
      if (paramName === 'emailUid') {
        return EMAIL_UID;
      }
      return undefined;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    // reset error catcher state between tests
    ImapFlowErrorCatcher.getInstance().startErrorCatching();
    ImapFlowErrorCatcher.getInstance().stopAndGetErrorsList();
  });

  it('should delete email and return confirmation', async () => {
    mockClient.mailboxOpen.mockResolvedValue({ path: MAILBOX_PATH } as MailboxObject);
    mockClient.messageDelete.mockResolvedValue(true as any);

    const result = await deleteEmailOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient);

    expect(mockClient.mailboxOpen).toHaveBeenCalledWith(MAILBOX_PATH, { readOnly: false });
    expect(mockClient.messageDelete).toHaveBeenCalledWith(EMAIL_UID, { uid: true });
    expect(result).toEqual([
      {
        json: {
          uid: EMAIL_UID,
          deleted: true,
        },
      },
    ]);
  });

  it('should throw NodeImapError when messageDelete fails', async () => {
    mockClient.mailboxOpen.mockResolvedValue({ path: MAILBOX_PATH } as MailboxObject);
    mockClient.messageDelete.mockResolvedValue(false as any);

    await expect(
      deleteEmailOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient),
    ).rejects.toThrow(NodeImapError);
  });
});
