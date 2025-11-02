import { IExecuteFunctions } from 'n8n-workflow';
import { getGlobalImapMock } from '../setup';
import { createImapflowMock, MockImapServer } from '../../TestUtils/ImapflowMock';
import { createNodeParametersCheckerMock } from '../../TestUtils/N8nMocks';
import { getEmailsListOperation, EmailParts } from '../../../nodes/Imap/operations/email/functions/EmailGetList';

// Mock mailparser at the top level
jest.mock('mailparser', () => ({
  simpleParser: jest.fn(),
}));

describe('EmailGetList', () => {
  const ITEM_INDEX = 0;
  let globalImapMock: MockImapServer;
  let mockImapflow: any;

  beforeEach(async () => {
    globalImapMock = getGlobalImapMock();

    const credentials = MockImapServer.getValidCredentials();

    mockImapflow = createImapflowMock(globalImapMock, {
      user: credentials.user,
      password: credentials.password,
    });    
    await mockImapflow.connect();
    
    // Reset the simpleParser mock
    const { simpleParser } = require('mailparser');
    (simpleParser as jest.Mock).mockReset();
  });

  describe('executeImapAction - basic functionality', () => {
   
    it('should get emails list with basic envelope data', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' }, emailDateRange: {}, emailFlags: {}, emailSearchFilters: {},
        searchCriteria: 'ALL',
        includeParts: [],
      };
      const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, paramValues);
      
      // Mock the fetch response
      const mockEmailData = [
        {
          uid: 123,
          envelope: {
            subject: 'Test Email 1',
            from: [{ name: 'John Doe', address: 'john@example.com' }],
            to: [{ name: 'Jane Doe', address: 'jane@example.com' }],
            date: new Date('2023-01-01T10:00:00Z'),
          },
        },
        {
          uid: 124,
          envelope: {
            subject: 'Test Email 2',
            from: [{ name: 'Alice Smith', address: 'alice@example.com' }],
            to: [{ name: 'Bob Smith', address: 'bob@example.com' }],
            date: new Date('2023-01-02T11:00:00Z'),
          },
        },
      ];
      
      // Mock async iterator for fetch
      const mockFetchAsyncIterator = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockEmailData[0], done: false })
            .mockResolvedValueOnce({ value: mockEmailData[1], done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      };
      
      mockImapflow.fetch = jest.fn().mockReturnValue(mockFetchAsyncIterator);
      
      // Act
      const result = await getEmailsListOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(2);
      expect(result![0].json.uid).toBe(123);
      expect((result![0].json.envelope as any).subject).toBe('Test Email 1');
      expect(result![0].json.mailboxPath).toBe('INBOX');
      expect(result![1].json.uid).toBe(124);
      expect((result![1].json.envelope as any).subject).toBe('Test Email 2');
      expect(result![1].json.mailboxPath).toBe('INBOX');
      expect(mockImapflow.mailboxOpen).toHaveBeenCalledWith('INBOX');
      expect(mockImapflow.fetch).toHaveBeenCalledWith({}, {
        uid: true,
        envelope: true,
      });
    });

    it('should get emails with flags when includeParts includes flags', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' }, emailDateRange: {}, emailFlags: {}, emailSearchFilters: {},
        searchCriteria: 'ALL',
        includeParts: [EmailParts.Flags],
      };
      const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, paramValues);
      
      const mockEmailData = [
        {
          uid: 123,
          envelope: {
            subject: 'Test Email 1',
            from: [{ name: 'John Doe', address: 'john@example.com' }],
          },
          flags: ['\\Seen', '\\Flagged'],
        },
      ];
      
      const mockFetchAsyncIterator = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockEmailData[0], done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      };
      
      mockImapflow.fetch = jest.fn().mockReturnValue(mockFetchAsyncIterator);
      
      // Act
      const result = await getEmailsListOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json.flags).toEqual(['\\Seen', '\\Flagged']);
      expect(mockImapflow.fetch).toHaveBeenCalledWith({}, {
        uid: true,
        envelope: true,
        flags: true,
      });
    });

    it('should get emails with size when includeParts includes size', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' }, emailDateRange: {}, emailFlags: {}, emailSearchFilters: {},
        searchCriteria: 'ALL',
        includeParts: [EmailParts.Size],
      };
      const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, paramValues);
      
      const mockEmailData = [
        {
          uid: 123,
          envelope: {
            subject: 'Test Email 1',
            from: [{ name: 'John Doe', address: 'john@example.com' }],
          },
          size: 1024,
        },
      ];
      
      const mockFetchAsyncIterator = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockEmailData[0], done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      };
      
      mockImapflow.fetch = jest.fn().mockReturnValue(mockFetchAsyncIterator);
      
      // Act
      const result = await getEmailsListOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json.size).toBe(1024);
      expect(mockImapflow.fetch).toHaveBeenCalledWith({}, {
        uid: true,
        envelope: true,
        size: true,
      });
    });

    it('should get emails with body structure when includeParts includes bodyStructure', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' }, emailDateRange: {}, emailFlags: {}, emailSearchFilters: {},
        searchCriteria: 'ALL',
        includeParts: [EmailParts.BodyStructure],
      };
      const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, paramValues);
      
      const mockBodyStructure = {
        type: 'text/plain',
        parameters: { charset: 'utf-8' },
        size: 512,
      };
      
      const mockEmailData = [
        {
          uid: 123,
          envelope: {
            subject: 'Test Email 1',
            from: [{ name: 'John Doe', address: 'john@example.com' }],
          },
          bodyStructure: mockBodyStructure,
        },
      ];
      
      const mockFetchAsyncIterator = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockEmailData[0], done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      };
      
      mockImapflow.fetch = jest.fn().mockReturnValue(mockFetchAsyncIterator);
      
      // Act
      const result = await getEmailsListOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json.bodyStructure).toEqual(mockBodyStructure);
      expect(mockImapflow.fetch).toHaveBeenCalledWith({}, {
        uid: true,
        envelope: true,
        bodyStructure: true,
      });
    });

    it('should get emails with headers when includeParts includes headers and includeAllHeaders is true', async () => {
      // Arrange
      const { simpleParser } = require('mailparser');
      const mockParsedHeaders = new Map();
      mockParsedHeaders.set('subject', 'Test Email');
      mockParsedHeaders.set('from', { value: [{ address: 'john@example.com' }] });
      
      (simpleParser as jest.Mock).mockResolvedValueOnce({
        headers: mockParsedHeaders,
      });
      
      const paramValues = {
        mailboxPath: { value: 'INBOX' }, emailDateRange: {}, emailFlags: {}, emailSearchFilters: {},
        searchCriteria: 'ALL',
        includeParts: [EmailParts.Headers],
        includeAllHeaders: true,
      };
      const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, paramValues);
      
      const mockHeaders = Buffer.from('Subject: Test Email\r\nFrom: john@example.com\r\n\r\n');
      
      const mockEmailData = [
        {
          uid: 123,
          envelope: {
            subject: 'Test Email 1',
            from: [{ name: 'John Doe', address: 'john@example.com' }],
          },
          headers: mockHeaders,
        },
      ];
      
      const mockFetchAsyncIterator = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockEmailData[0], done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      };
      
      mockImapflow.fetch = jest.fn().mockReturnValue(mockFetchAsyncIterator);
      
      // Act
      const result = await getEmailsListOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json.headers).toBeDefined();
      expect((result![0].json.headers as any).subject).toBe('Test Email');
      expect((result![0].json.headers as any).from.value[0].address).toBe('john@example.com');
      expect(mockImapflow.fetch).toHaveBeenCalledWith({}, {
        uid: true,
        envelope: true,
        headers: true,
      });
    });

    it('should get emails with specific headers when includeParts includes headers and includeAllHeaders is false', async () => {
      // Arrange
      const { simpleParser } = require('mailparser');
      const mockParsedHeaders = new Map();
      mockParsedHeaders.set('subject', 'Test Email');
      mockParsedHeaders.set('from', { value: [{ address: 'john@example.com' }] });
      mockParsedHeaders.set('date', new Date('2023-01-01T10:00:00Z'));
      
      (simpleParser as jest.Mock).mockResolvedValueOnce({
        headers: mockParsedHeaders,
      });
      
      const paramValues = {
        mailboxPath: { value: 'INBOX' }, emailDateRange: {}, emailFlags: {}, emailSearchFilters: {},
        searchCriteria: 'ALL',
        includeParts: [EmailParts.Headers],
        includeAllHeaders: false,
        headersToInclude: 'subject,from,date',
      };
      const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, paramValues);
      
      const mockHeaders = Buffer.from('Subject: Test Email\r\nFrom: john@example.com\r\nDate: Mon, 1 Jan 2023 10:00:00 +0000\r\n\r\n');
      
      const mockEmailData = [
        {
          uid: 123,
          envelope: {
            subject: 'Test Email 1',
            from: [{ name: 'John Doe', address: 'john@example.com' }],
          },
          headers: mockHeaders,
        },
      ];
      
      const mockFetchAsyncIterator = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockEmailData[0], done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      };
      
      mockImapflow.fetch = jest.fn().mockReturnValue(mockFetchAsyncIterator);
      
      // Act
      const result = await getEmailsListOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json.headers).toBeDefined();
      expect(mockImapflow.fetch).toHaveBeenCalledWith({}, {
        uid: true,
        envelope: true,
        headers: ['subject', 'from', 'date'],
      });
    });

    it('should get emails with no specific headers when includeParts includes headers and headersToInclude is empty', async () => {
      // Arrange
      const { simpleParser } = require('mailparser');
      const mockParsedHeaders = new Map();
      mockParsedHeaders.set('subject', 'Test Email');
      mockParsedHeaders.set('from', { value: [{ address: 'john@example.com' }] });
      
      (simpleParser as jest.Mock).mockResolvedValueOnce({
        headers: mockParsedHeaders,
      });
      
      const paramValues = {
        mailboxPath: { value: 'INBOX' }, emailDateRange: {}, emailFlags: {}, emailSearchFilters: {},
        searchCriteria: 'ALL',
        includeParts: [EmailParts.Headers],
        includeAllHeaders: false,
        headersToInclude: '',
      };
      const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, paramValues);
      
      const mockHeaders = Buffer.from('Subject: Test Email\r\nFrom: john@example.com\r\n\r\n');
      
      const mockEmailData = [
        {
          uid: 123,
          envelope: {
            subject: 'Test Email 1',
            from: [{ name: 'John Doe', address: 'john@example.com' }],
          },
          headers: mockHeaders,
        },
      ];
      
      const mockFetchAsyncIterator = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockEmailData[0], done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      };
      
      mockImapflow.fetch = jest.fn().mockReturnValue(mockFetchAsyncIterator);
      
      // Act
      const result = await getEmailsListOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json.headers).toBeDefined();
      expect(mockImapflow.fetch).toHaveBeenCalledWith({}, {
        uid: true,
        envelope: true,
      });
    });

    it('should get emails with text content when includeParts includes textContent', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' }, emailDateRange: {}, emailFlags: {}, emailSearchFilters: {},
        searchCriteria: 'ALL',
        includeParts: [EmailParts.TextContent],
      };
      const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, paramValues);
      
      const mockBodyStructure = {
        type: 'text/plain',
        parameters: { charset: 'utf-8' },
        size: 512,
      };
      
      const mockEmailData = [
        {
          uid: 123,
          envelope: {
            subject: 'Test Email 1',
            from: [{ name: 'John Doe', address: 'john@example.com' }],
          },
          bodyStructure: mockBodyStructure,
        },
      ];
      
      const mockFetchAsyncIterator = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockEmailData[0], done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      };
      
      // Mock stream for text content
      const mockTextStream = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('Hello, this is the text content'));
          } else if (event === 'end') {
            callback();
          }
        }),
      };
      
      mockImapflow.fetch = jest.fn().mockReturnValue(mockFetchAsyncIterator);
      mockImapflow.download = jest.fn().mockResolvedValue({
        content: mockTextStream,
      });
      
      // Act
      const result = await getEmailsListOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json.textContent).toBe('Hello, this is the text content');
      expect(mockImapflow.fetch).toHaveBeenCalledWith({}, {
        uid: true,
        envelope: true,
        bodyStructure: true,
      });
      expect(mockImapflow.download).toHaveBeenCalledWith('123', 'TEXT', { uid: true });
    });

    it('should get emails with html content when includeParts includes htmlContent', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' }, emailDateRange: {}, emailFlags: {}, emailSearchFilters: {},
        searchCriteria: 'ALL',
        includeParts: [EmailParts.HtmlContent],
      };
      const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, paramValues);
      
      const mockBodyStructure = {
        type: 'text/html',
        parameters: { charset: 'utf-8' },
        size: 1024,
      };
      
      const mockEmailData = [
        {
          uid: 123,
          envelope: {
            subject: 'Test Email 1',
            from: [{ name: 'John Doe', address: 'john@example.com' }],
          },
          bodyStructure: mockBodyStructure,
        },
      ];
      
      const mockFetchAsyncIterator = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockEmailData[0], done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      };
      
      // Mock stream for HTML content
      const mockHtmlStream = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('<html><body>Hello HTML</body></html>'));
          } else if (event === 'end') {
            callback();
          }
        }),
      };
      
      mockImapflow.fetch = jest.fn().mockReturnValue(mockFetchAsyncIterator);
      mockImapflow.download = jest.fn().mockResolvedValue({
        content: mockHtmlStream,
      });
      
      // Act
      const result = await getEmailsListOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json.htmlContent).toBe('<html><body>Hello HTML</body></html>');
      expect(mockImapflow.fetch).toHaveBeenCalledWith({}, {
        uid: true,
        envelope: true,
        bodyStructure: true,
      });
      expect(mockImapflow.download).toHaveBeenCalledWith('123', 'TEXT', { uid: true });
    });

    it('should set textContent and htmlContent to null when no matching parts are found', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' }, emailDateRange: {}, emailFlags: {}, emailSearchFilters: {},
        searchCriteria: 'ALL',
        includeParts: [EmailParts.TextContent, EmailParts.HtmlContent],
      };
      const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, paramValues);
      
      const mockBodyStructure = {
        type: 'application/pdf', // No text or HTML parts
        parameters: {},
        size: 2048,
      };
      
      const mockEmailData = [
        {
          uid: 123,
          envelope: {
            subject: 'Test Email 1',
            from: [{ name: 'John Doe', address: 'john@example.com' }],
          },
          bodyStructure: mockBodyStructure,
        },
      ];
      
      const mockFetchAsyncIterator = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockEmailData[0], done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      };
      
      mockImapflow.fetch = jest.fn().mockReturnValue(mockFetchAsyncIterator);
      
      // Act
      const result = await getEmailsListOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json.textContent).toBeNull();
      expect(result![0].json.htmlContent).toBeNull();
    });

    it('should handle empty email list', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' }, emailDateRange: {}, emailFlags: {}, emailSearchFilters: {},
        searchCriteria: 'ALL',
        includeParts: [],
      };
      const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, paramValues);
      
      // Mock empty async iterator
      const mockFetchAsyncIterator = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn().mockResolvedValue({ done: true }),
        }),
      };
      
      mockImapflow.fetch = jest.fn().mockReturnValue(mockFetchAsyncIterator);
      
      // Act
      const result = await getEmailsListOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(0);
      expect(mockImapflow.mailboxOpen).toHaveBeenCalledWith('INBOX');
      expect(mockImapflow.fetch).toHaveBeenCalledWith({}, {
        uid: true,
        envelope: true,
      });
    });

    it('should get emails with multiple parts included', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' }, emailDateRange: {}, emailFlags: {}, emailSearchFilters: {},
        searchCriteria: 'ALL',
        includeParts: [EmailParts.Flags, EmailParts.Size, EmailParts.BodyStructure],
      };
      const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, paramValues);
      
      const mockBodyStructure = {
        type: 'text/plain',
        parameters: { charset: 'utf-8' },
        size: 512,
      };
      
      const mockEmailData = [
        {
          uid: 123,
          envelope: {
            subject: 'Test Email 1',
            from: [{ name: 'John Doe', address: 'john@example.com' }],
          },
          flags: ['\\Seen'],
          size: 1024,
          bodyStructure: mockBodyStructure,
        },
      ];
      
      const mockFetchAsyncIterator = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockEmailData[0], done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      };
      
      mockImapflow.fetch = jest.fn().mockReturnValue(mockFetchAsyncIterator);
      
      // Act
      const result = await getEmailsListOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json.flags).toEqual(['\\Seen']);
      expect(result![0].json.size).toBe(1024);
      expect(result![0].json.bodyStructure).toEqual(mockBodyStructure);
      expect(mockImapflow.fetch).toHaveBeenCalledWith({}, {
        uid: true,
        envelope: true,
        flags: true,
        size: true,
        bodyStructure: true,
      });
    });

  }); // end executeImapAction - basic functionality

  describe('executeImapAction - error handling', () => {

    it('should handle simpleParser error when parsing headers and log the error', async () => {
      // Arrange
      const { simpleParser } = require('mailparser');
      (simpleParser as jest.Mock).mockRejectedValueOnce(new Error('Malformed header data'));
      
      const paramValues = {
        mailboxPath: { value: 'INBOX' }, emailDateRange: {}, emailFlags: {}, emailSearchFilters: {},
        searchCriteria: 'ALL',
        includeParts: [EmailParts.Headers],
        includeAllHeaders: true,
      };
      const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, paramValues);
      
      const mockHeaders = Buffer.from('Subject: Test Email\r\nFrom: john@example.com\r\n\r\n');
      
      const mockEmailData = [
        {
          uid: 123,
          envelope: {
            subject: 'Test Email 1',
            from: [{ name: 'John Doe', address: 'john@example.com' }],
          },
          headers: mockHeaders,
        },
      ];
      
      const mockFetchAsyncIterator = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockEmailData[0], done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      };
      
      mockImapflow.fetch = jest.fn().mockReturnValue(mockFetchAsyncIterator);
      
      // Act
      const result = await getEmailsListOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json.uid).toBe(123);
      expect(result![0].json.mailboxPath).toBe('INBOX');
      // The headers field should contain the serialized buffer since parsing failed
      expect(result![0].json.headers).toEqual({
        data: Array.from(mockHeaders),
        type: 'Buffer',
      });
      // Verify simpleParser was called
      expect(simpleParser).toHaveBeenCalledWith('Subject: Test Email\r\nFrom: john@example.com\r\n\r\n');
      // Verify error was logged
      expect(context.logger!.error).toHaveBeenCalledWith(expect.stringContaining('Error parsing headers:'));
    });

    it('should handle emails with null headers when includeParts includes headers', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' }, emailDateRange: {}, emailFlags: {}, emailSearchFilters: {},
        searchCriteria: 'ALL',
        includeParts: [EmailParts.Headers],
        includeAllHeaders: true,
      };
      const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, paramValues);
      
      const mockEmailData = [
        {
          uid: 123,
          envelope: {
            subject: 'Test Email 1',
            from: [{ name: 'John Doe', address: 'john@example.com' }],
          },
          headers: null, // null headers
        },
      ];
      
      const mockFetchAsyncIterator = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockEmailData[0], done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      };
      
      mockImapflow.fetch = jest.fn().mockReturnValue(mockFetchAsyncIterator);
      
      // Act
      const result = await getEmailsListOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json.uid).toBe(123);
      expect(result![0].json.mailboxPath).toBe('INBOX');
      // The headers field should remain null since email.headers was null
      expect(result![0].json.headers).toBeNull();
      expect(mockImapflow.fetch).toHaveBeenCalledWith({}, {
        uid: true,
        envelope: true,
        headers: true,
      });
    });

  }); // end executeImapAction - error handling

  describe('executeImapAction - partId fallback scenarios', () => {

    it('should use "TEXT" as fallback when partInfo has no partId for text content', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' }, emailDateRange: {}, emailFlags: {}, emailSearchFilters: {},
        searchCriteria: 'ALL',
        includeParts: [EmailParts.TextContent],
      };
      const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, paramValues);
      
      // Mock body structure that will result in partInfo without partId (single part email)
      const mockBodyStructure = {
        type: 'text/plain',
        parameters: { charset: 'utf-8' },
        size: 512,
        // No 'part' property, so getEmailPartInfoFromBodystructureNode will use 'TEXT' as fallback
      };
      
      const mockEmailData = [
        {
          uid: 123,
          envelope: {
            subject: 'Test Email 1',
            from: [{ name: 'John Doe', address: 'john@example.com' }],
          },
          bodyStructure: mockBodyStructure,
        },
      ];
      
      const mockFetchAsyncIterator = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockEmailData[0], done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      };
      
      // Mock stream for text content
      const mockTextStream = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('Hello, this is plain text content'));
          } else if (event === 'end') {
            callback();
          }
        }),
      };
      
      mockImapflow.fetch = jest.fn().mockReturnValue(mockFetchAsyncIterator);
      mockImapflow.download = jest.fn().mockResolvedValue({
        content: mockTextStream,
      });
      
      // Act
      const result = await getEmailsListOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json.textContent).toBe('Hello, this is plain text content');
      // Verify that download was called with 'TEXT' as partId (the fallback)
      expect(mockImapflow.download).toHaveBeenCalledWith('123', 'TEXT', { uid: true });
    });

    it('should use "TEXT" as fallback when partInfo has no partId for html content', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' }, emailDateRange: {}, emailFlags: {}, emailSearchFilters: {},
        searchCriteria: 'ALL',
        includeParts: [EmailParts.HtmlContent],
      };
      const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, paramValues);
      
      // Mock body structure that will result in partInfo without partId (single part email)
      const mockBodyStructure = {
        type: 'text/html',
        parameters: { charset: 'utf-8' },
        size: 1024,
        // No 'part' property, so getEmailPartInfoFromBodystructureNode will use 'TEXT' as fallback
      };
      
      const mockEmailData = [
        {
          uid: 123,
          envelope: {
            subject: 'Test Email 1',
            from: [{ name: 'John Doe', address: 'john@example.com' }],
          },
          bodyStructure: mockBodyStructure,
        },
      ];
      
      const mockFetchAsyncIterator = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockEmailData[0], done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      };
      
      // Mock stream for HTML content
      const mockHtmlStream = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('<html><body>Hello HTML content</body></html>'));
          } else if (event === 'end') {
            callback();
          }
        }),
      };
      
      mockImapflow.fetch = jest.fn().mockReturnValue(mockFetchAsyncIterator);
      mockImapflow.download = jest.fn().mockResolvedValue({
        content: mockHtmlStream,
      });
      
      // Act
      const result = await getEmailsListOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json.htmlContent).toBe('<html><body>Hello HTML content</body></html>');
      // Verify that download was called with 'TEXT' as partId (the fallback)
      expect(mockImapflow.download).toHaveBeenCalledWith('123', 'TEXT', { uid: true });
    });

    it('should use "TEXT" as fallback for both text and html content when partInfo has no partId', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' }, emailDateRange: {}, emailFlags: {}, emailSearchFilters: {},
        searchCriteria: 'ALL',
        includeParts: [EmailParts.TextContent, EmailParts.HtmlContent],
      };
      const context = createNodeParametersCheckerMock(getEmailsListOperation.parameters, paramValues);
      
      // Mock multipart body structure where some parts have no partId
      const mockBodyStructure = {
        type: 'multipart/alternative',
        childNodes: [
          {
            type: 'text/plain',
            parameters: { charset: 'utf-8' },
            size: 512,
            // No 'part' property for plain text part
          },
          {
            type: 'text/html',
            parameters: { charset: 'utf-8' },
            size: 1024,
            // No 'part' property for HTML part
          },
        ],
      };
      
      const mockEmailData = [
        {
          uid: 123,
          envelope: {
            subject: 'Test Email 1',
            from: [{ name: 'John Doe', address: 'john@example.com' }],
          },
          bodyStructure: mockBodyStructure,
        },
      ];
      
      const mockFetchAsyncIterator = {
        [Symbol.asyncIterator]: jest.fn().mockReturnValue({
          next: jest.fn()
            .mockResolvedValueOnce({ value: mockEmailData[0], done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      };
      
      // Mock streams for both text and HTML content
      const mockTextStream = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('Plain text content'));
          } else if (event === 'end') {
            callback();
          }
        }),
      };
      
      const mockHtmlStream = {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('<html><body>HTML content</body></html>'));
          } else if (event === 'end') {
            callback();
          }
        }),
      };
      
      mockImapflow.fetch = jest.fn().mockReturnValue(mockFetchAsyncIterator);
      mockImapflow.download = jest.fn()
        .mockResolvedValueOnce({ content: mockTextStream })  // First call for text content
        .mockResolvedValueOnce({ content: mockHtmlStream }); // Second call for HTML content
      
      // Act
      const result = await getEmailsListOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json.textContent).toBe('Plain text content');
      expect(result![0].json.htmlContent).toBe('<html><body>HTML content</body></html>');
      // Verify that download was called twice, both times with 'TEXT' as partId (the fallback)
      expect(mockImapflow.download).toHaveBeenCalledTimes(2);
      expect(mockImapflow.download).toHaveBeenNthCalledWith(1, '123', 'TEXT', { uid: true });
      expect(mockImapflow.download).toHaveBeenNthCalledWith(2, '123', 'TEXT', { uid: true });
    });

  }); // end executeImapAction - partId fallback scenarios

}); // end EmailGetList
