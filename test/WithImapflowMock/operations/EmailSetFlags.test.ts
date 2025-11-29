import { IExecuteFunctions } from 'n8n-workflow';
import { ImapFlow, type MailboxObject } from 'imapflow';
import { setEmailFlagsOperation, ImapFlags } from '../../../nodes/Imap/operations/email/functions/EmailSetFlags';
import { createMockLogger, createNodeParametersCheckerMock } from '../../TestUtils/N8nMocks';
import { NodeImapError, ImapFlowErrorCatcher } from '../../../nodes/Imap/utils/ImapUtils';

describe('EmailSetFlags operation', () => {
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
      messageFlagsAdd: jest.fn(),
      messageFlagsRemove: jest.fn(),
    } as unknown as jest.Mocked<ImapFlow>;

    // Default mock parameters
    (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
      if (paramName === 'mailboxPath') {
        return { value: MAILBOX_PATH };
      }
      if (paramName === 'emailUid') {
        return EMAIL_UID;
      }
      if (paramName === 'flags') {
        return {};
      }
      return undefined;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset error catcher state between tests
    ImapFlowErrorCatcher.getInstance().startErrorCatching();
    ImapFlowErrorCatcher.getInstance().stopAndGetErrorsList();
  });

  describe('Basic functionality', () => {
    it('should set flags on email successfully', async () => {
      const flags = {
        [ImapFlags.Seen]: true,
        [ImapFlags.Flagged]: true,
      };

      (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
        if (paramName === 'mailboxPath') return { value: MAILBOX_PATH };
        if (paramName === 'emailUid') return EMAIL_UID;
        if (paramName === 'flags') return flags;
        return undefined;
      });

      mockClient.mailboxOpen.mockResolvedValue({ path: MAILBOX_PATH } as MailboxObject);
      mockClient.messageFlagsAdd.mockResolvedValue(true as any);

      const result = await setEmailFlagsOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient);

      expect(mockClient.mailboxOpen).toHaveBeenCalledWith(MAILBOX_PATH, { readOnly: false });
      expect(mockClient.messageFlagsAdd).toHaveBeenCalledWith(EMAIL_UID, [ImapFlags.Seen, ImapFlags.Flagged], { uid: true });
      expect(mockClient.messageFlagsRemove).not.toHaveBeenCalled();
      expect(result).toEqual([
        {
          json: {
            uid: EMAIL_UID,
          },
        },
      ]);
    });

    it('should remove flags from email successfully', async () => {
      const flags = {
        [ImapFlags.Seen]: false,
        [ImapFlags.Flagged]: false,
      };

      (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
        if (paramName === 'mailboxPath') return { value: MAILBOX_PATH };
        if (paramName === 'emailUid') return EMAIL_UID;
        if (paramName === 'flags') return flags;
        return undefined;
      });

      mockClient.mailboxOpen.mockResolvedValue({ path: MAILBOX_PATH } as MailboxObject);
      mockClient.messageFlagsRemove.mockResolvedValue(true as any);

      const result = await setEmailFlagsOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient);

      expect(mockClient.mailboxOpen).toHaveBeenCalledWith(MAILBOX_PATH, { readOnly: false });
      expect(mockClient.messageFlagsAdd).not.toHaveBeenCalled();
      expect(mockClient.messageFlagsRemove).toHaveBeenCalledWith(EMAIL_UID, [ImapFlags.Seen, ImapFlags.Flagged], { uid: true });
      expect(result).toEqual([
        {
          json: {
            uid: EMAIL_UID,
          },
        },
      ]);
    });

    it('should set and remove flags simultaneously', async () => {
      const flags = {
        [ImapFlags.Seen]: true,
        [ImapFlags.Flagged]: false,
        [ImapFlags.Answered]: true,
        [ImapFlags.Deleted]: false,
      };

      (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
        if (paramName === 'mailboxPath') return { value: MAILBOX_PATH };
        if (paramName === 'emailUid') return EMAIL_UID;
        if (paramName === 'flags') return flags;
        return undefined;
      });

      mockClient.mailboxOpen.mockResolvedValue({ path: MAILBOX_PATH } as MailboxObject);
      mockClient.messageFlagsAdd.mockResolvedValue(true as any);
      mockClient.messageFlagsRemove.mockResolvedValue(true as any);

      const result = await setEmailFlagsOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient);

      expect(mockClient.mailboxOpen).toHaveBeenCalledWith(MAILBOX_PATH, { readOnly: false });
      expect(mockClient.messageFlagsAdd).toHaveBeenCalledWith(EMAIL_UID, [ImapFlags.Seen, ImapFlags.Answered], { uid: true });
      expect(mockClient.messageFlagsRemove).toHaveBeenCalledWith(EMAIL_UID, [ImapFlags.Flagged, ImapFlags.Deleted], { uid: true });
      expect(result).toEqual([
        {
          json: {
            uid: EMAIL_UID,
          },
        },
      ]);
    });

    it('should handle empty flags collection', async () => {
      const flags = {};

      (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
        if (paramName === 'mailboxPath') return { value: MAILBOX_PATH };
        if (paramName === 'emailUid') return EMAIL_UID;
        if (paramName === 'flags') return flags;
        return undefined;
      });

      mockClient.mailboxOpen.mockResolvedValue({ path: MAILBOX_PATH } as MailboxObject);

      const result = await setEmailFlagsOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient);

      expect(mockClient.mailboxOpen).toHaveBeenCalledWith(MAILBOX_PATH, { readOnly: false });
      expect(mockClient.messageFlagsAdd).not.toHaveBeenCalled();
      expect(mockClient.messageFlagsRemove).not.toHaveBeenCalled();
      expect(result).toEqual([
        {
          json: {
            uid: EMAIL_UID,
          },
        },
      ]);
    });
  });

  describe('Custom Flags', () => {
    it('should handle single custom flag for setting', async () => {
      const flags = {
        setFlags: '$label1',
      };

      (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
        if (paramName === 'mailboxPath') return { value: MAILBOX_PATH };
        if (paramName === 'emailUid') return EMAIL_UID;
        if (paramName === 'flags') return flags;
        return undefined;
      });

      mockClient.mailboxOpen.mockResolvedValue({ path: MAILBOX_PATH } as MailboxObject);
      mockClient.messageFlagsAdd.mockResolvedValue(true as any);

      const result = await setEmailFlagsOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient);

      expect(mockClient.messageFlagsAdd).toHaveBeenCalledWith(EMAIL_UID, ['$label1'], { uid: true });
      expect(result).toEqual([
        {
          json: {
            uid: EMAIL_UID,
          },
        },
      ]);
    });

    it('should handle space-separated custom flags for setting', async () => {
      const flags = {
        setFlags: '$label1 $label2',
      };

      (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
        if (paramName === 'mailboxPath') return { value: MAILBOX_PATH };
        if (paramName === 'emailUid') return EMAIL_UID;
        if (paramName === 'flags') return flags;
        return undefined;
      });

      mockClient.mailboxOpen.mockResolvedValue({ path: MAILBOX_PATH } as MailboxObject);
      mockClient.messageFlagsAdd.mockResolvedValue(true as any);

      const result = await setEmailFlagsOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient);

      expect(mockClient.messageFlagsAdd).toHaveBeenCalledWith(EMAIL_UID, ['$label1', '$label2'], { uid: true });
      expect(result).toEqual([
        {
          json: {
            uid: EMAIL_UID,
          },
        },
      ]);
    });

    it('should handle mixed spaces and trimming in custom flags', async () => {
      const flags = {
        setFlags: '  $label1   $label2  ',
      };

      (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
        if (paramName === 'mailboxPath') return { value: MAILBOX_PATH };
        if (paramName === 'emailUid') return EMAIL_UID;
        if (paramName === 'flags') return flags;
        return undefined;
      });

      mockClient.mailboxOpen.mockResolvedValue({ path: MAILBOX_PATH } as MailboxObject);
      mockClient.messageFlagsAdd.mockResolvedValue(true as any);

      await setEmailFlagsOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient);

      expect(mockClient.messageFlagsAdd).toHaveBeenCalledWith(EMAIL_UID, ['$label1', '$label2'], { uid: true });
    });

    it('should handle single custom flag for removal', async () => {
      const flags = {
        removeFlags: '$label1',
      };

      (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
        if (paramName === 'mailboxPath') return { value: MAILBOX_PATH };
        if (paramName === 'emailUid') return EMAIL_UID;
        if (paramName === 'flags') return flags;
        return undefined;
      });

      mockClient.mailboxOpen.mockResolvedValue({ path: MAILBOX_PATH } as MailboxObject);
      mockClient.messageFlagsRemove.mockResolvedValue(true as any);

      const result = await setEmailFlagsOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient);

      expect(mockClient.messageFlagsRemove).toHaveBeenCalledWith(EMAIL_UID, ['$label1'], { uid: true });
      expect(result).toEqual([
        {
          json: {
            uid: EMAIL_UID,
          },
        },
      ]);
    });

    it('should handle space-separated custom flags for removal', async () => {
      const flags = {
        removeFlags: '$label1 $label2',
      };

      (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
        if (paramName === 'mailboxPath') return { value: MAILBOX_PATH };
        if (paramName === 'emailUid') return EMAIL_UID;
        if (paramName === 'flags') return flags;
        return undefined;
      });

      mockClient.mailboxOpen.mockResolvedValue({ path: MAILBOX_PATH } as MailboxObject);
      mockClient.messageFlagsRemove.mockResolvedValue(true as any);

      const result = await setEmailFlagsOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient);

      expect(mockClient.messageFlagsRemove).toHaveBeenCalledWith(EMAIL_UID, ['$label1', '$label2'], { uid: true });
      expect(result).toEqual([
        {
          json: {
            uid: EMAIL_UID,
          },
        },
      ]);
    });
  });

  describe('Error handling', () => {
    it('should throw NodeImapError when messageFlagsAdd fails', async () => {
      const flags = {
        [ImapFlags.Seen]: true,
      };

      (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
        if (paramName === 'mailboxPath') return { value: MAILBOX_PATH };
        if (paramName === 'emailUid') return EMAIL_UID;
        if (paramName === 'flags') return flags;
        return undefined;
      });

      mockClient.mailboxOpen.mockResolvedValue({ path: MAILBOX_PATH } as MailboxObject);
      mockClient.messageFlagsAdd.mockResolvedValue(false as any);

      await expect(
        setEmailFlagsOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient),
      ).rejects.toThrow(NodeImapError);

      expect(mockClient.messageFlagsAdd).toHaveBeenCalledWith(EMAIL_UID, [ImapFlags.Seen], { uid: true });
    });

    it('should throw NodeImapError when messageFlagsRemove fails', async () => {
      const flags = {
        [ImapFlags.Seen]: false,
      };

      (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
        if (paramName === 'mailboxPath') return { value: MAILBOX_PATH };
        if (paramName === 'emailUid') return EMAIL_UID;
        if (paramName === 'flags') return flags;
        return undefined;
      });

      mockClient.mailboxOpen.mockResolvedValue({ path: MAILBOX_PATH } as MailboxObject);
      mockClient.messageFlagsRemove.mockResolvedValue(false as any);

      await expect(
        setEmailFlagsOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient),
      ).rejects.toThrow(NodeImapError);

      expect(mockClient.messageFlagsRemove).toHaveBeenCalledWith(EMAIL_UID, [ImapFlags.Seen], { uid: true });
    });

    it('should throw NodeImapError when messageFlagsAdd fails but messageFlagsRemove succeeds', async () => {
      const flags = {
        [ImapFlags.Seen]: true,
        [ImapFlags.Flagged]: false,
      };

      (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
        if (paramName === 'mailboxPath') return { value: MAILBOX_PATH };
        if (paramName === 'emailUid') return EMAIL_UID;
        if (paramName === 'flags') return flags;
        return undefined;
      });

      mockClient.mailboxOpen.mockResolvedValue({ path: MAILBOX_PATH } as MailboxObject);
      mockClient.messageFlagsAdd.mockResolvedValue(false as any);
      mockClient.messageFlagsRemove.mockResolvedValue(true as any);

      await expect(
        setEmailFlagsOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient),
      ).rejects.toThrow(NodeImapError);

      expect(mockClient.messageFlagsAdd).toHaveBeenCalledWith(EMAIL_UID, [ImapFlags.Seen], { uid: true });
      expect(mockClient.messageFlagsRemove).not.toHaveBeenCalled(); // Should not be called due to early failure
    });
  });

  describe('Logger integration', () => {
    it('should log flag operations correctly', async () => {
      const flags = {
        [ImapFlags.Seen]: true,
        [ImapFlags.Flagged]: false,
      };

      (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
        if (paramName === 'mailboxPath') return { value: MAILBOX_PATH };
        if (paramName === 'emailUid') return EMAIL_UID;
        if (paramName === 'flags') return flags;
        return undefined;
      });

      mockClient.mailboxOpen.mockResolvedValue({ path: MAILBOX_PATH } as MailboxObject);
      mockClient.messageFlagsAdd.mockResolvedValue(true as any);
      mockClient.messageFlagsRemove.mockResolvedValue(true as any);

      await setEmailFlagsOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient);

      // The exact log message depends on the implementation, checking if it contains key info
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Setting flags')
      );
      expect(mockContext.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('removing flags')
      );
    });
  });

  describe('Parameter handling', () => {
    it('should handle all available flags', async () => {
      const flags = {
        [ImapFlags.Answered]: true,
        [ImapFlags.Deleted]: true,
        [ImapFlags.Draft]: true,
        [ImapFlags.Flagged]: true,
        [ImapFlags.Seen]: true,
      };

      (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
        if (paramName === 'mailboxPath') return { value: MAILBOX_PATH };
        if (paramName === 'emailUid') return EMAIL_UID;
        if (paramName === 'flags') return flags;
        return undefined;
      });

      mockClient.mailboxOpen.mockResolvedValue({ path: MAILBOX_PATH } as MailboxObject);
      mockClient.messageFlagsAdd.mockResolvedValue(true as any);

      const result = await setEmailFlagsOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient);

      expect(mockClient.messageFlagsAdd).toHaveBeenCalledWith(
        EMAIL_UID,
        [ImapFlags.Answered, ImapFlags.Deleted, ImapFlags.Draft, ImapFlags.Flagged, ImapFlags.Seen],
        { uid: true }
      );
      expect(result).toEqual([
        {
          json: {
            uid: EMAIL_UID,
          },
        },
      ]);
    });

    it('should handle comma-separated UID list', async () => {
      const MULTIPLE_UIDS = '123,456,789';
      const flags = {
        [ImapFlags.Seen]: true,
      };

      (mockContext.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
        if (paramName === 'mailboxPath') return { value: MAILBOX_PATH };
        if (paramName === 'emailUid') return MULTIPLE_UIDS;
        if (paramName === 'flags') return flags;
        return undefined;
      });

      mockClient.mailboxOpen.mockResolvedValue({ path: MAILBOX_PATH } as MailboxObject);
      mockClient.messageFlagsAdd.mockResolvedValue(true as any);

      const result = await setEmailFlagsOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient);

      expect(mockClient.messageFlagsAdd).toHaveBeenCalledWith(MULTIPLE_UIDS, [ImapFlags.Seen], { uid: true });
      expect(result).toEqual([
        {
          json: {
            uid: MULTIPLE_UIDS,
          },
        },
      ]);
    });
  });

  describe('Using createNodeParametersCheckerMock', () => {
    it('should work with parameter validation', async () => {
      const paramValues = {
        mailboxPath: { value: 'INBOX' },
        emailUid: '123',
        flags: {
          [ImapFlags.Seen]: true,
        },
      };

      const mockContextWithValidator = createNodeParametersCheckerMock(
        setEmailFlagsOperation.parameters,
        paramValues
      );

      mockClient.mailboxOpen.mockResolvedValue({ path: MAILBOX_PATH } as MailboxObject);
      mockClient.messageFlagsAdd.mockResolvedValue(true as any);

      const result = await setEmailFlagsOperation.executeImapAction(
        mockContextWithValidator as IExecuteFunctions,
        mockContextWithValidator.logger!,
        ITEM_INDEX,
        mockClient
      );

      expect(result).toEqual([
        {
          json: {
            uid: '123',
          },
        },
      ]);
    });
  });
});
