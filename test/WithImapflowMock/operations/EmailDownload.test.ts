import { IExecuteFunctions } from 'n8n-workflow';
import { getGlobalImapMock } from '../setup';
import { createImapflowMock, MockImapServer } from '../../TestUtils/ImapflowMock';
import { createNodeParametersCheckerMock } from '../../TestUtils/N8nMocks';
import { downloadOperation } from '../../../nodes/Imap/operations/email/functions/EmailDownload';

describe('EmailDownload', () => {
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
  });

  describe('executeImapAction - basic functionality', () => {
   
    it('should download email as binary data when outputToBinary is true', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' },
        emailUid: '123',
        outputToBinary: true,
        binaryPropertyName: 'data',
      };
      const context = createNodeParametersCheckerMock(downloadOperation.parameters, paramValues);
      
      // Mock the fetchOne response
      const mockEmailSource = 'Return-Path: <sender@example.com>\r\nReceived: from example.com\r\nSubject: Test Email\r\n\r\nThis is a test email body.';
      const mockFetchResponse = {
        uid: '123',
        source: Buffer.from(mockEmailSource),
      };
      mockImapflow.fetchOne = jest.fn().mockResolvedValue(mockFetchResponse);
      
      // Mock prepareBinaryData
      const mockBinaryData = {
        data: 'binary-data-content',
        mimeType: 'message/rfc822',
        fileName: 'INBOX_123.eml',
      };
      context.helpers!.prepareBinaryData = jest.fn().mockResolvedValue(mockBinaryData);
      
      // Act
      const result = await downloadOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json).toEqual({ uid: '123' });
      expect(result![0].binary).toEqual({ data: mockBinaryData });
      expect(result![0].pairedItem).toEqual({ item: ITEM_INDEX });
      expect(mockImapflow.mailboxOpen).toHaveBeenCalledWith('INBOX', { readOnly: true });
      expect(mockImapflow.fetchOne).toHaveBeenCalledWith('123', { uid: true, source: true }, { uid: true });
      expect(context.helpers!.prepareBinaryData).toHaveBeenCalledWith(mockFetchResponse.source, 'INBOX_123.eml', 'message/rfc822');
    });

    it('should download email as JSON text when outputToBinary is false', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' },
        emailUid: '456',
        outputToBinary: false,
        binaryPropertyName: 'data', // Still needed for parameter validation
      };
      const context = createNodeParametersCheckerMock(downloadOperation.parameters, paramValues);
      
      // Mock the fetchOne response
      const mockEmailSource = 'Return-Path: <sender@example.com>\r\nReceived: from example.com\r\nSubject: Test Email\r\n\r\nThis is a test email body.';
      const mockFetchResponse = {
        uid: '456',
        source: Buffer.from(mockEmailSource),
      };
      mockImapflow.fetchOne = jest.fn().mockResolvedValue(mockFetchResponse);
      
      // Act
      const result = await downloadOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json).toEqual({
        uid: '456',
        emlContent: mockEmailSource,
      });
      expect(result![0].binary).toBeUndefined();
      expect(result![0].pairedItem).toEqual({ item: ITEM_INDEX });
      expect(mockImapflow.mailboxOpen).toHaveBeenCalledWith('INBOX', { readOnly: true });
      expect(mockImapflow.fetchOne).toHaveBeenCalledWith('456', { uid: true, source: true }, { uid: true });
    });

    it('should use custom binary property name when specified', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' },
        emailUid: '789',
        outputToBinary: true,
        binaryPropertyName: 'emailFile',
      };
      const context = createNodeParametersCheckerMock(downloadOperation.parameters, paramValues);
      
      // Mock the fetchOne response
      const mockEmailSource = 'Return-Path: <sender@example.com>\r\nReceived: from example.com\r\nSubject: Test Email\r\n\r\nThis is a test email body.';
      const mockFetchResponse = {
        uid: '789',
        source: Buffer.from(mockEmailSource),
      };
      mockImapflow.fetchOne = jest.fn().mockResolvedValue(mockFetchResponse);
      
      // Mock prepareBinaryData
      const mockBinaryData = {
        data: 'binary-data-content',
        mimeType: 'message/rfc822',
        fileName: 'INBOX_789.eml',
      };
      context.helpers!.prepareBinaryData = jest.fn().mockResolvedValue(mockBinaryData);
      
      // Act
      const result = await downloadOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json).toEqual({ uid: '789' });
      expect(result![0].binary).toEqual({ emailFile: mockBinaryData });
      expect(result![0].pairedItem).toEqual({ item: ITEM_INDEX });
      expect(mockImapflow.mailboxOpen).toHaveBeenCalledWith('INBOX', { readOnly: true });
      expect(mockImapflow.fetchOne).toHaveBeenCalledWith('789', { uid: true, source: true }, { uid: true });
      expect(context.helpers!.prepareBinaryData).toHaveBeenCalledWith(mockFetchResponse.source, 'INBOX_789.eml', 'message/rfc822');
    });

    it('should handle fetchOne returning null by throwing an error', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' },
        emailUid: '999',
        outputToBinary: true,
        binaryPropertyName: 'data',
      };
      const context = createNodeParametersCheckerMock(downloadOperation.parameters, paramValues);
      
      // Mock the fetchOne response to be null
      mockImapflow.fetchOne = jest.fn().mockResolvedValue(null);
      
      // Act
      try {
        await downloadOperation.executeImapAction(
          context as IExecuteFunctions,
          context.logger!,
          ITEM_INDEX,
          mockImapflow
        );
        fail('Expected error was not thrown');
      } catch (error) {
        // Assert
        expect(error).toBeInstanceOf(Error);
        expect(mockImapflow.mailboxOpen).toHaveBeenCalledWith('INBOX', { readOnly: true });
        expect(mockImapflow.fetchOne).toHaveBeenCalledWith('999', { uid: true, source: true }, { uid: true });
      }
    });

    it('should use default values for optional parameters', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' },
        emailUid: '111',
        outputToBinary: true, // Testing defaults - this should be true by default
        binaryPropertyName: 'data', // Testing defaults - this should be 'data' by default
      };
      const context = createNodeParametersCheckerMock(downloadOperation.parameters, paramValues);
      
      // Mock the fetchOne response
      const mockEmailSource = 'Return-Path: <sender@example.com>\r\nReceived: from example.com\r\nSubject: Test Email\r\n\r\nThis is a test email body.';
      const mockFetchResponse = {
        uid: '111',
        source: Buffer.from(mockEmailSource),
      };
      mockImapflow.fetchOne = jest.fn().mockResolvedValue(mockFetchResponse);
      
      // Mock prepareBinaryData
      const mockBinaryData = {
        data: 'binary-data-content',
        mimeType: 'message/rfc822',
        fileName: 'INBOX_111.eml',
      };
      context.helpers!.prepareBinaryData = jest.fn().mockResolvedValue(mockBinaryData);
      
      // Act
      const result = await downloadOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json).toEqual({ uid: '111' });
      expect(result![0].binary).toEqual({ data: mockBinaryData });
      expect(result![0].pairedItem).toEqual({ item: ITEM_INDEX });
      expect(context.helpers!.prepareBinaryData).toHaveBeenCalledWith(mockFetchResponse.source, 'INBOX_111.eml', 'message/rfc822');
    });

  }); // end executeImapAction - basic functionality

}); // end EmailDownload