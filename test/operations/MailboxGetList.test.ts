import { IExecuteFunctions } from 'n8n-workflow';
import { ImapFlow } from 'imapflow';
import { getMailboxListOperation } from '../../nodes/Imap/operations/mailbox/functions/MailboxGetList';
import { createMockLogger } from '../TestUtils/N8nMocks';
import { Imap } from '../../nodes/Imap/Imap.node';

describe('MailboxGetList', () => {
  let mockContext: jest.Mocked<IExecuteFunctions>;
  let mockClient: jest.Mocked<ImapFlow>;
  let imapNode: Imap;
  const ITEM_INDEX = 0;

  beforeEach(() => {
    // Create mock logger
    const mockLogger = createMockLogger();

    // Create mock IExecuteFunctions context
    mockContext = {
      getNodeParameter: jest.fn(),
      logger: mockLogger,
    } as unknown as jest.Mocked<IExecuteFunctions>;

    // Create mock ImapFlow client
    mockClient = {
      list: jest.fn(),
      connect: jest.fn(),
      logout: jest.fn(),
      authenticated: false,
    } as unknown as jest.Mocked<ImapFlow>;

    // Instantiate Imap node
    imapNode = new Imap();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('operation definition', () => {
    it('should have correct operation metadata', () => {
      expect(getMailboxListOperation.operation).toBeDefined();
      expect(getMailboxListOperation.operation.name).toBe('Get Many');
      expect(getMailboxListOperation.operation.value).toBe('loadMailboxList');
      expect(getMailboxListOperation.operation.description).toBe('Get a list of mailboxes');
    });

    it('should have parameters defined', () => {
      expect(getMailboxListOperation.parameters).toBeDefined();
      expect(Array.isArray(getMailboxListOperation.parameters)).toBe(true);
      expect(getMailboxListOperation.parameters.length).toBeGreaterThan(0);
    });

    it('should have includeStatusFields parameter', () => {
      const statusFieldsParam = getMailboxListOperation.parameters.find(
        p => p.name === 'includeStatusFields'
      );
      expect(statusFieldsParam).toBeDefined();
      expect(statusFieldsParam?.type).toBe('multiOptions');
      expect(statusFieldsParam?.default).toEqual([]);
    });

    it('should have notice about slow response', () => {
      const noticeParam = getMailboxListOperation.parameters.find(
        p => p.name === 'noticeSlowResponse'
      );
      expect(noticeParam).toBeDefined();
      expect(noticeParam?.type).toBe('notice');
    });

    it('should have all status field options', () => {
      const statusFieldsParam = getMailboxListOperation.parameters.find(
        p => p.name === 'includeStatusFields'
      );
      expect(statusFieldsParam?.options).toBeDefined();
      const options = statusFieldsParam?.options as any[];
      expect(options.length).toBe(6);
      
      const optionValues = options.map(opt => opt.value);
      expect(optionValues).toContain('includeMessageCount');
      expect(optionValues).toContain('includeRecentCount');
      expect(optionValues).toContain('includeUnseenCount');
      expect(optionValues).toContain('includeUidNext');
      expect(optionValues).toContain('includeUidValidity');
      expect(optionValues).toContain('includeHighestModseq');
    });
  });

  describe('executeImapAction - basic functionality', () => {
    it('should return empty array when no mailboxes exist', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([]);
      mockClient.list.mockResolvedValue([]);

      // Act
      const result = await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(result).toBeDefined();
      expect(result).toEqual([]);
      expect(mockClient.list).toHaveBeenCalledTimes(1);
      expect(mockContext.getNodeParameter).toHaveBeenCalledWith('includeStatusFields', ITEM_INDEX);
    });

    it('should return mailbox list without status fields', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([]);
      
      const mockMailboxes = [
        {
          path: 'INBOX',
          name: 'INBOX',
          status: undefined,
        },
        {
          path: 'Sent',
          name: 'Sent',
          status: undefined,
        },
      ];
      
      mockClient.list.mockResolvedValue(mockMailboxes as any);

      // Act
      const result = await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(2);
      expect(result?.[0].json).toEqual({
        path: 'INBOX',
        name: 'INBOX',
        status: undefined,
      });
      expect(result?.[1].json).toEqual({
        path: 'Sent',
        name: 'Sent',
        status: undefined,
      });
    });

    it('should call client.list with correct statusQuery for no status fields', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([]);
      mockClient.list.mockResolvedValue([]);

      // Act
      await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(mockClient.list).toHaveBeenCalledWith({
        statusQuery: {
          messages: false,
          recent: false,
          unseen: false,
          uidnext: false,
          uidvalidity: false,
          highestmodseq: false,
        },
      });
    });
  });

  describe('executeImapAction - status fields', () => {
    it('should include message count when requested', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue(['includeMessageCount']);
      mockClient.list.mockResolvedValue([]);

      // Act
      await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(mockClient.list).toHaveBeenCalledWith({
        statusQuery: {
          messages: true,
          recent: false,
          unseen: false,
          uidnext: false,
          uidvalidity: false,
          highestmodseq: false,
        },
      });
    });

    it('should include recent count when requested', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue(['includeRecentCount']);
      mockClient.list.mockResolvedValue([]);

      // Act
      await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(mockClient.list).toHaveBeenCalledWith({
        statusQuery: {
          messages: false,
          recent: true,
          unseen: false,
          uidnext: false,
          uidvalidity: false,
          highestmodseq: false,
        },
      });
    });

    it('should include unseen count when requested', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue(['includeUnseenCount']);
      mockClient.list.mockResolvedValue([]);

      // Act
      await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(mockClient.list).toHaveBeenCalledWith({
        statusQuery: {
          messages: false,
          recent: false,
          unseen: true,
          uidnext: false,
          uidvalidity: false,
          highestmodseq: false,
        },
      });
    });

    it('should include UID next when requested', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue(['includeUidNext']);
      mockClient.list.mockResolvedValue([]);

      // Act
      await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(mockClient.list).toHaveBeenCalledWith({
        statusQuery: {
          messages: false,
          recent: false,
          unseen: false,
          uidnext: true,
          uidvalidity: false,
          highestmodseq: false,
        },
      });
    });

    it('should include UID validity when requested', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue(['includeUidValidity']);
      mockClient.list.mockResolvedValue([]);

      // Act
      await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(mockClient.list).toHaveBeenCalledWith({
        statusQuery: {
          messages: false,
          recent: false,
          unseen: false,
          uidnext: false,
          uidvalidity: true,
          highestmodseq: false,
        },
      });
    });

    it('should include highest modseq when requested', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue(['includeHighestModseq']);
      mockClient.list.mockResolvedValue([]);

      // Act
      await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(mockClient.list).toHaveBeenCalledWith({
        statusQuery: {
          messages: false,
          recent: false,
          unseen: false,
          uidnext: false,
          uidvalidity: false,
          highestmodseq: true,
        },
      });
    });

    it('should include multiple status fields when requested', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([
        'includeMessageCount',
        'includeUnseenCount',
        'includeUidNext',
      ]);
      mockClient.list.mockResolvedValue([]);

      // Act
      await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(mockClient.list).toHaveBeenCalledWith({
        statusQuery: {
          messages: true,
          recent: false,
          unseen: true,
          uidnext: true,
          uidvalidity: false,
          highestmodseq: false,
        },
      });
    });

    it('should include all status fields when all are requested', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([
        'includeMessageCount',
        'includeRecentCount',
        'includeUnseenCount',
        'includeUidNext',
        'includeUidValidity',
        'includeHighestModseq',
      ]);
      mockClient.list.mockResolvedValue([]);

      // Act
      await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(mockClient.list).toHaveBeenCalledWith({
        statusQuery: {
          messages: true,
          recent: true,
          unseen: true,
          uidnext: true,
          uidvalidity: true,
          highestmodseq: true,
        },
      });
    });
  });

  describe('executeImapAction - with status data', () => {
    it('should return mailboxes with status fields', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([
        'includeMessageCount',
        'includeUnseenCount',
      ]);
      
      const mockMailboxes = [
        {
          path: 'INBOX',
          name: 'INBOX',
          status: {
            messages: 100,
            unseen: 5,
          },
        },
        {
          path: 'Sent',
          name: 'Sent',
          status: {
            messages: 50,
            unseen: 0,
          },
        },
      ];
      
      mockClient.list.mockResolvedValue(mockMailboxes as any);

      // Act
      const result = await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(2);
      expect(result?.[0].json).toEqual({
        path: 'INBOX',
        name: 'INBOX',
        status: {
          messages: 100,
          unseen: 5,
        },
      });
      expect(result?.[1].json).toEqual({
        path: 'Sent',
        name: 'Sent',
        status: {
          messages: 50,
          unseen: 0,
        },
      });
    });

    it('should handle mailboxes with all status fields', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([
        'includeMessageCount',
        'includeRecentCount',
        'includeUnseenCount',
        'includeUidNext',
        'includeUidValidity',
        'includeHighestModseq',
      ]);
      
      const mockMailboxes = [
        {
          path: 'INBOX',
          name: 'INBOX',
          status: {
            messages: 100,
            recent: 2,
            unseen: 5,
            uidNext: 101,
            uidValidity: 1234567890,
            highestModseq: '123456',
          },
        },
      ];
      
      mockClient.list.mockResolvedValue(mockMailboxes as any);

      // Act
      const result = await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result?.[0].json).toEqual({
        path: 'INBOX',
        name: 'INBOX',
        status: {
          messages: 100,
          recent: 2,
          unseen: 5,
          uidNext: 101,
          uidValidity: 1234567890,
          highestModseq: '123456',
        },
      });
    });
  });

  describe('executeImapAction - multiple mailboxes', () => {
    it('should return multiple mailboxes', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([]);
      
      const mockMailboxes = [
        { path: 'INBOX', name: 'INBOX', status: undefined },
        { path: 'Drafts', name: 'Drafts', status: undefined },
        { path: 'Sent', name: 'Sent', status: undefined },
        { path: 'Trash', name: 'Trash', status: undefined },
        { path: 'Archive', name: 'Archive', status: undefined },
      ];
      
      mockClient.list.mockResolvedValue(mockMailboxes as any);

      // Act
      const result = await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(5);
      expect(result?.map(r => r.json.path)).toEqual([
        'INBOX',
        'Drafts',
        'Sent',
        'Trash',
        'Archive',
      ]);
    });

    it('should handle nested mailbox paths', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([]);
      
      const mockMailboxes = [
        { path: 'INBOX', name: 'INBOX', status: undefined },
        { path: 'INBOX.Work', name: 'Work', status: undefined },
        { path: 'INBOX.Work.Projects', name: 'Projects', status: undefined },
        { path: 'INBOX.Personal', name: 'Personal', status: undefined },
      ];
      
      mockClient.list.mockResolvedValue(mockMailboxes as any);

      // Act
      const result = await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(4);
      expect(result?.[2].json).toEqual({
        path: 'INBOX.Work.Projects',
        name: 'Projects',
        status: undefined,
      });
    });
  });

  describe('executeImapAction - edge cases', () => {
    it('should handle empty mailbox names', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([]);
      
      const mockMailboxes = [
        { path: '', name: '', status: undefined },
      ];
      
      mockClient.list.mockResolvedValue(mockMailboxes as any);

      // Act
      const result = await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result?.[0].json.path).toBe('');
      expect(result?.[0].json.name).toBe('');
    });

    it('should handle special characters in mailbox names', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([]);
      
      const mockMailboxes = [
        { path: 'INBOX/Test-Folder_123', name: 'Test-Folder_123', status: undefined },
        { path: '[Gmail]/Sent Mail', name: 'Sent Mail', status: undefined },
      ];
      
      mockClient.list.mockResolvedValue(mockMailboxes as any);

      // Act
      const result = await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(2);
      expect(result?.[0].json.path).toBe('INBOX/Test-Folder_123');
      expect(result?.[1].json.path).toBe('[Gmail]/Sent Mail');
    });

    it('should handle very long mailbox paths', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([]);
      
      const longPath = 'A'.repeat(500);
      const mockMailboxes = [
        { path: longPath, name: 'LongName', status: undefined },
      ];
      
      mockClient.list.mockResolvedValue(mockMailboxes as any);

      // Act
      const result = await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result?.[0].json.path).toBe(longPath);
    });
  });

  describe('executeImapAction - error handling', () => {
    it('should propagate errors from client.list', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([]);
      const error = new Error('IMAP connection error');
      mockClient.list.mockRejectedValue(error);

      // Act & Assert
      await expect(
        getMailboxListOperation.executeImapAction(mockContext, ITEM_INDEX, mockClient)
      ).rejects.toThrow('IMAP connection error');
    });

    it('should handle network timeout errors', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([]);
      const error = new Error('Network timeout');
      mockClient.list.mockRejectedValue(error);

      // Act & Assert
      await expect(
        getMailboxListOperation.executeImapAction(mockContext, ITEM_INDEX, mockClient)
      ).rejects.toThrow('Network timeout');
    });
  });

  describe('executeImapAction - item index handling', () => {
    it('should use provided item index', async () => {
      // Arrange
      const customIndex = 5;
      mockContext.getNodeParameter.mockReturnValue([]);
      mockClient.list.mockResolvedValue([]);

      // Act
      await getMailboxListOperation.executeImapAction(
        mockContext,
        customIndex,
        mockClient
      );

      // Assert
      expect(mockContext.getNodeParameter).toHaveBeenCalledWith(
        'includeStatusFields',
        customIndex
      );
    });

    it('should work with index 0', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([]);
      mockClient.list.mockResolvedValue([]);

      // Act
      await getMailboxListOperation.executeImapAction(
        mockContext,
        0,
        mockClient
      );

      // Assert
      expect(mockContext.getNodeParameter).toHaveBeenCalledWith(
        'includeStatusFields',
        0
      );
    });
  });

  describe('Imap node instantiation', () => {
    it('should create Imap node instance', () => {
      expect(imapNode).toBeDefined();
      expect(imapNode).toBeInstanceOf(Imap);
    });

    it('should have description property', () => {
      expect(imapNode.description).toBeDefined();
      expect(imapNode.description.displayName).toBe('IMAP');
      expect(imapNode.description.name).toBe('imap');
    });

    it('should have execute method', () => {
      expect(imapNode.execute).toBeDefined();
      expect(typeof imapNode.execute).toBe('function');
    });

    it('should have methods property', () => {
      expect(imapNode.methods).toBeDefined();
    });
  });

  describe('return data structure', () => {
    it('should return INodeExecutionData array', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([]);
      
      const mockMailboxes = [
        { path: 'INBOX', name: 'INBOX', status: undefined },
      ];
      
      mockClient.list.mockResolvedValue(mockMailboxes as any);

      // Act
      const result = await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result?.[0]).toHaveProperty('json');
    });

    it('should have correct json structure in returned items', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([]);
      
      const mockMailboxes = [
        { path: 'INBOX', name: 'INBOX', status: undefined },
      ];
      
      mockClient.list.mockResolvedValue(mockMailboxes as any);

      // Act
      const result = await getMailboxListOperation.executeImapAction(
        mockContext,
        ITEM_INDEX,
        mockClient
      );

      // Assert
      expect(result?.[0].json).toHaveProperty('path');
      expect(result?.[0].json).toHaveProperty('name');
      expect(result?.[0].json).toHaveProperty('status');
    });
  });

});
