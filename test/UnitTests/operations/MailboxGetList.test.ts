import { IExecuteFunctions } from 'n8n-workflow';
import { ImapFlow } from 'imapflow';
import { getMailboxListOperation } from '../../../nodes/Imap/operations/mailbox/functions/MailboxGetList';
import { createMockLogger } from '../../TestUtils/N8nMocks';
import { Imap } from '../../../nodes/Imap/Imap.node';

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

  describe('executeImapAction - basic functionality', () => {
    it('should return empty array when no mailboxes exist', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([]);
      mockClient.list.mockResolvedValue([]);

      // Act
      const result = await getMailboxListOperation.executeImapAction(
        mockContext,
        mockContext.logger,
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
        mockContext.logger,
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
        mockContext.logger,
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
        mockContext.logger,
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
        mockContext.logger,
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
        mockContext.logger,
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
        mockContext.logger,
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
        mockContext.logger,
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
        getMailboxListOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient)
      ).rejects.toThrow('IMAP connection error');
    });

    it('should handle network timeout errors', async () => {
      // Arrange
      mockContext.getNodeParameter.mockReturnValue([]);
      const error = new Error('Network timeout');
      mockClient.list.mockRejectedValue(error);

      // Act & Assert
      await expect(
        getMailboxListOperation.executeImapAction(mockContext, mockContext.logger, ITEM_INDEX, mockClient)
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
        mockContext.logger,
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
        mockContext.logger,
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
        mockContext.logger,
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
        mockContext.logger,
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
