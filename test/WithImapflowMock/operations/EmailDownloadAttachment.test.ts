import { IExecuteFunctions } from 'n8n-workflow';
import { PassThrough, Readable } from 'stream';
import { getGlobalImapMock } from '../setup';
import { createImapflowMock, MockImapServer } from '../../TestUtils/ImapflowMock';
import { createNodeParametersCheckerMock } from '../../TestUtils/N8nMocks';
import { downloadAttachmentOperation } from '../../../nodes/Imap/operations/email/functions/EmailDownloadAttachment';

function createImapflowLikeDownloadStream(content: Buffer): Readable {
  const stream = new PassThrough();
  setImmediate(() => {
    stream.write(content);
    stream.end();
  });
  return stream;
}

describe('EmailDownloadAttachment', () => {
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
    
    // Initialize download mock method
    mockImapflow.download = jest.fn();
  });

  describe('executeImapAction - basic functionality', () => {
   
    it('should download specific attachment by part ID', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' },
        emailUid: '123',
        allAttachments: false,
        partId: '2',
      };
      const context = createNodeParametersCheckerMock(downloadAttachmentOperation.parameters, paramValues);
      
      // Mock the download response
      const mockAttachmentContent = Buffer.from('attachment content');
      const mockDownloadResponse = {
        content: mockAttachmentContent,
        meta: {
          filename: 'document.pdf',
          contentType: 'application/pdf',
          size: mockAttachmentContent.length,
        },
      };
      mockImapflow.download = jest.fn().mockResolvedValue(mockDownloadResponse);
      
      // Mock prepareBinaryData
      const mockBinaryData = {
        data: 'binary-data-content',
        mimeType: 'application/pdf',
        fileName: 'document.pdf',
      };
      context.helpers!.prepareBinaryData = jest.fn().mockResolvedValue(mockBinaryData);
      
      // Act
      const result = await downloadAttachmentOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json).toEqual({
        attachments: [
          {
            partId: '2',
            binaryFieldName: 'attachment_0',
            filename: 'document.pdf',
            contentType: 'application/pdf',
            size: mockAttachmentContent.length,
          }
        ]
      });
      expect(result![0].binary).toEqual({ attachment_0: mockBinaryData });
      expect(mockImapflow.mailboxOpen).toHaveBeenCalledWith('INBOX', { readOnly: true });
      expect(mockImapflow.download).toHaveBeenCalledWith('123', '2', { uid: true });
      expect(context.helpers!.prepareBinaryData).toHaveBeenCalledWith(
        mockAttachmentContent,
        'document.pdf',
        'application/pdf'
      );
    });

    it('should download multiple specific attachments by comma-separated part IDs', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' },
        emailUid: '456',
        allAttachments: false,
        partId: '2, 3, 4',
      };
      const context = createNodeParametersCheckerMock(downloadAttachmentOperation.parameters, paramValues);
      
      // Mock the download responses
      const mockAttachment1Content = Buffer.from('attachment 1 content');
      const mockAttachment2Content = Buffer.from('attachment 2 content');
      const mockAttachment3Content = Buffer.from('attachment 3 content');
      
      const mockDownloadResponses = [
        {
          content: mockAttachment1Content,
          meta: {
            filename: 'document1.pdf',
            contentType: 'application/pdf',
            size: mockAttachment1Content.length,
          },
        },
        {
          content: mockAttachment2Content,
          meta: {
            filename: 'image.jpg',
            contentType: 'image/jpeg',
            size: mockAttachment2Content.length,
          },
        },
        {
          content: mockAttachment3Content,
          meta: {
            filename: 'spreadsheet.xlsx',
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            size: mockAttachment3Content.length,
          },
        },
      ];
      
      mockImapflow.download = jest.fn()
        .mockResolvedValueOnce(mockDownloadResponses[0])
        .mockResolvedValueOnce(mockDownloadResponses[1])
        .mockResolvedValueOnce(mockDownloadResponses[2]);
      
      // Mock prepareBinaryData
      const mockBinaryData1 = { data: 'binary-data-1', mimeType: 'application/pdf', fileName: 'document1.pdf' };
      const mockBinaryData2 = { data: 'binary-data-2', mimeType: 'image/jpeg', fileName: 'image.jpg' };
      const mockBinaryData3 = { data: 'binary-data-3', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fileName: 'spreadsheet.xlsx' };
      
      context.helpers!.prepareBinaryData = jest.fn()
        .mockResolvedValueOnce(mockBinaryData1)
        .mockResolvedValueOnce(mockBinaryData2)
        .mockResolvedValueOnce(mockBinaryData3);
      
      // Act
      const result = await downloadAttachmentOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json).toEqual({
        attachments: [
          {
            partId: '2',
            binaryFieldName: 'attachment_0',
            filename: 'document1.pdf',
            contentType: 'application/pdf',
            size: mockAttachment1Content.length,
          },
          {
            partId: '3',
            binaryFieldName: 'attachment_1',
            filename: 'image.jpg',
            contentType: 'image/jpeg',
            size: mockAttachment2Content.length,
          },
          {
            partId: '4',
            binaryFieldName: 'attachment_2',
            filename: 'spreadsheet.xlsx',
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            size: mockAttachment3Content.length,
          }
        ]
      });
      expect(result![0].binary).toEqual({
        attachment_0: mockBinaryData1,
        attachment_1: mockBinaryData2,
        attachment_2: mockBinaryData3,
      });
      expect(mockImapflow.mailboxOpen).toHaveBeenCalledWith('INBOX', { readOnly: true });
      expect(mockImapflow.download).toHaveBeenCalledTimes(3);
      expect(mockImapflow.download).toHaveBeenNthCalledWith(1, '456', '2', { uid: true });
      expect(mockImapflow.download).toHaveBeenNthCalledWith(2, '456', '3', { uid: true });
      expect(mockImapflow.download).toHaveBeenNthCalledWith(3, '456', '4', { uid: true });
    });

    it('should download all attachments when allAttachments is true', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' },
        emailUid: '789',
        allAttachments: true,
        includeInlineAttachments: false,
      };
      const context = createNodeParametersCheckerMock(downloadAttachmentOperation.parameters, paramValues);
      
      // Mock the fetchOne response with body structure
      const mockBodyStructure = {
        part: '1',
        type: 'multipart',
        childNodes: [
          {
            part: '1.1',
            type: 'text',
            disposition: 'inline',
          },
          {
            part: '1.2',
            type: 'application',
            disposition: 'attachment',
            dispositionParameters: { filename: 'document.pdf' },
          },
          {
            part: '1.3',
            type: 'image',
            disposition: 'attachment',
            dispositionParameters: { filename: 'photo.jpg' },
          },
          {
            part: '1.4',
            type: 'image',
            disposition: 'inline',
            dispositionParameters: { filename: 'inline-image.png' },
          },
        ],
      };
      
      const mockFetchResponse = {
        uid: '789',
        bodyStructure: mockBodyStructure,
      };
      mockImapflow.fetchOne = jest.fn().mockResolvedValue(mockFetchResponse);
      
      // Mock the download responses for attachments only (not inline)
      const mockAttachment1Content = Buffer.from('pdf content');
      const mockAttachment2Content = Buffer.from('jpg content');
      
      const mockDownloadResponses = [
        {
          content: mockAttachment1Content,
          meta: {
            filename: 'document.pdf',
            contentType: 'application/pdf',
            size: mockAttachment1Content.length,
          },
        },
        {
          content: mockAttachment2Content,
          meta: {
            filename: 'photo.jpg',
            contentType: 'image/jpeg',
            size: mockAttachment2Content.length,
          },
        },
      ];
      
      mockImapflow.download = jest.fn()
        .mockResolvedValueOnce(mockDownloadResponses[0])
        .mockResolvedValueOnce(mockDownloadResponses[1]);
      
      // Mock prepareBinaryData
      const mockBinaryData1 = { data: 'binary-pdf', mimeType: 'application/pdf', fileName: 'document.pdf' };
      const mockBinaryData2 = { data: 'binary-jpg', mimeType: 'image/jpeg', fileName: 'photo.jpg' };
      
      context.helpers!.prepareBinaryData = jest.fn()
        .mockResolvedValueOnce(mockBinaryData1)
        .mockResolvedValueOnce(mockBinaryData2);
      
      // Act
      const result = await downloadAttachmentOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json).toEqual({
        attachments: [
          {
            partId: '1.2',
            binaryFieldName: 'attachment_0',
            filename: 'document.pdf',
            contentType: 'application/pdf',
            size: mockAttachment1Content.length,
          },
          {
            partId: '1.3',
            binaryFieldName: 'attachment_1',
            filename: 'photo.jpg',
            contentType: 'image/jpeg',
            size: mockAttachment2Content.length,
          }
        ]
      });
      expect(result![0].binary).toEqual({
        attachment_0: mockBinaryData1,
        attachment_1: mockBinaryData2,
      });
      expect(mockImapflow.mailboxOpen).toHaveBeenCalledWith('INBOX', { readOnly: true });
      expect(mockImapflow.fetchOne).toHaveBeenCalledWith('789', { uid: true, bodyStructure: true }, { uid: true });
      expect(mockImapflow.download).toHaveBeenCalledTimes(2);
      expect(mockImapflow.download).toHaveBeenNthCalledWith(1, '789', '1.2', { uid: true });
      expect(mockImapflow.download).toHaveBeenNthCalledWith(2, '789', '1.3', { uid: true });
    });

    it('should download all attachments including inline when includeInlineAttachments is true', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' },
        emailUid: '101',
        allAttachments: true,
        includeInlineAttachments: true,
      };
      const context = createNodeParametersCheckerMock(downloadAttachmentOperation.parameters, paramValues);
      
      // Mock the fetchOne response with body structure - simplified to avoid the multipart root issue
      const mockBodyStructure = {
        part: '1',
        type: 'multipart',
        childNodes: [
          {
            part: '1.1',
            type: 'application',
            disposition: 'attachment',
            dispositionParameters: { filename: 'document.pdf' },
          },
          {
            part: '1.2',
            type: 'image',
            disposition: 'inline',
            dispositionParameters: { filename: 'inline-image.png' },
          },
        ],
      };
      
      const mockFetchResponse = {
        uid: '101',
        bodyStructure: mockBodyStructure,
      };
      mockImapflow.fetchOne = jest.fn().mockResolvedValue(mockFetchResponse);
      
      // Mock the download responses for both attachment and inline
      const mockAttachment1Content = Buffer.from('pdf content');
      const mockAttachment2Content = Buffer.from('png content');
      
      const mockDownloadResponses = [
        {
          content: mockAttachment1Content,
          meta: {
            filename: 'document.pdf',
            contentType: 'application/pdf',
            size: mockAttachment1Content.length,
          },
        },
        {
          content: mockAttachment2Content,
          meta: {
            filename: 'inline-image.png',
            contentType: 'image/png',
            size: mockAttachment2Content.length,
          },
        },
      ];
      
      // Reset the download mock and set up the expected calls
      mockImapflow.download = jest.fn()
        .mockResolvedValueOnce(mockDownloadResponses[0])
        .mockResolvedValueOnce(mockDownloadResponses[1]);
      
      // Mock prepareBinaryData
      const mockBinaryData1 = { data: 'binary-pdf', mimeType: 'application/pdf', fileName: 'document.pdf' };
      const mockBinaryData2 = { data: 'binary-png', mimeType: 'image/png', fileName: 'inline-image.png' };
      
      context.helpers!.prepareBinaryData = jest.fn()
        .mockResolvedValueOnce(mockBinaryData1)
        .mockResolvedValueOnce(mockBinaryData2);
      
      // Act
      const result = await downloadAttachmentOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json).toEqual({
        attachments: [
          {
            partId: '1.1',
            binaryFieldName: 'attachment_0',
            filename: 'document.pdf',
            contentType: 'application/pdf',
            size: mockAttachment1Content.length,
          },
          {
            partId: '1.2',
            binaryFieldName: 'attachment_1',
            filename: 'inline-image.png',
            contentType: 'image/png',
            size: mockAttachment2Content.length,
          }
        ]
      });
      expect(result![0].binary).toEqual({
        attachment_0: mockBinaryData1,
        attachment_1: mockBinaryData2,
      });
      expect(mockImapflow.mailboxOpen).toHaveBeenCalledWith('INBOX', { readOnly: true });
      expect(mockImapflow.fetchOne).toHaveBeenCalledWith('101', { uid: true, bodyStructure: true }, { uid: true });
      expect(mockImapflow.download).toHaveBeenCalledTimes(2);
      expect(mockImapflow.download).toHaveBeenNthCalledWith(1, '101', '1.1', { uid: true });
      expect(mockImapflow.download).toHaveBeenNthCalledWith(2, '101', '1.2', { uid: true });
    });

    it('should handle email with no attachments when allAttachments is true', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' },
        emailUid: '202',
        allAttachments: true,
        includeInlineAttachments: false,
      };
      const context = createNodeParametersCheckerMock(downloadAttachmentOperation.parameters, paramValues);
      
      // Mock the fetchOne response with body structure without attachments
      const mockBodyStructure = {
        part: '1',
        type: 'text',
        disposition: 'inline',
      };
      
      const mockFetchResponse = {
        uid: '202',
        bodyStructure: mockBodyStructure,
      };
      mockImapflow.fetchOne = jest.fn().mockResolvedValue(mockFetchResponse);
      
      // Act
      const result = await downloadAttachmentOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json).toEqual({
        attachments: []
      });
      expect(result![0].binary).toEqual({});
      expect(mockImapflow.mailboxOpen).toHaveBeenCalledWith('INBOX', { readOnly: true });
      expect(mockImapflow.fetchOne).toHaveBeenCalledWith('202', { uid: true, bodyStructure: true }, { uid: true });
      expect(mockImapflow.download).not.toHaveBeenCalled();
    });

    it('should handle fetchOne returning null when allAttachments is true', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' },
        emailUid: '999',
        allAttachments: true,
        includeInlineAttachments: false,
      };
      const context = createNodeParametersCheckerMock(downloadAttachmentOperation.parameters, paramValues);
      
      // Mock the fetchOne response to be null
      mockImapflow.fetchOne = jest.fn().mockResolvedValue(null);
      
      // Act
      try {
        await downloadAttachmentOperation.executeImapAction(
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
        expect(mockImapflow.fetchOne).toHaveBeenCalledWith('999', { uid: true, bodyStructure: true }, { uid: true });
      }
    });

    it('should handle fetchOne returning email without bodyStructure', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' },
        emailUid: '303',
        allAttachments: true,
        includeInlineAttachments: false,
      };
      const context = createNodeParametersCheckerMock(downloadAttachmentOperation.parameters, paramValues);
      
      // Mock the fetchOne response without bodyStructure
      const mockFetchResponse = {
        uid: '303',
        bodyStructure: null,
      };
      mockImapflow.fetchOne = jest.fn().mockResolvedValue(mockFetchResponse);
      
      // Act
      const result = await downloadAttachmentOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json).toEqual({
        attachments: []
      });
      expect(result![0].binary).toEqual({});
      expect(mockImapflow.mailboxOpen).toHaveBeenCalledWith('INBOX', { readOnly: true });
      expect(mockImapflow.fetchOne).toHaveBeenCalledWith('303', { uid: true, bodyStructure: true }, { uid: true });
      expect(mockImapflow.download).not.toHaveBeenCalled();
    });

    it('should handle download returning response without meta by throwing an error', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: { value: 'INBOX' },
        emailUid: '404',
        allAttachments: false,
        partId: '2',
      };
      const context = createNodeParametersCheckerMock(downloadAttachmentOperation.parameters, paramValues);
      
      // Mock the download response without meta
      const mockDownloadResponse = {
        content: Buffer.from('content'),
        meta: null,
      };
      mockImapflow.download = jest.fn().mockResolvedValue(mockDownloadResponse);
      
      // Act
      try {
        await downloadAttachmentOperation.executeImapAction(
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
        expect(mockImapflow.download).toHaveBeenCalledWith('404', '2', { uid: true });
      }
    });

    it('should use different mailbox when specified', async () => {
      // Arrange
      // First create the Sent mailbox in the mock server
      const user = globalImapMock.getUser(MockImapServer.getValidCredentials().user);
      if (!user?.getMailbox('Sent')) {
        user?.createMailbox('Sent');
      }
      
      const paramValues = {
        mailboxPath: { value: 'Sent' },
        emailUid: '555',
        allAttachments: false,
        partId: '1.2',
      };
      const context = createNodeParametersCheckerMock(downloadAttachmentOperation.parameters, paramValues);
      
      // Mock the download response
      const mockAttachmentContent = Buffer.from('attachment content');
      const mockDownloadResponse = {
        content: mockAttachmentContent,
        meta: {
          filename: 'file.txt',
          contentType: 'text/plain',
          size: mockAttachmentContent.length,
        },
      };
      mockImapflow.download = jest.fn().mockResolvedValue(mockDownloadResponse);
      
      // Mock prepareBinaryData
      const mockBinaryData = {
        data: 'binary-data-content',
        mimeType: 'text/plain',
        fileName: 'file.txt',
      };
      context.helpers!.prepareBinaryData = jest.fn().mockResolvedValue(mockBinaryData);
      
      // Act
      const result = await downloadAttachmentOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result![0].json).toEqual({
        attachments: [
          {
            partId: '1.2',
            binaryFieldName: 'attachment_0',
            filename: 'file.txt',
            contentType: 'text/plain',
            size: mockAttachmentContent.length,
          }
        ]
      });
      expect(result![0].binary).toEqual({ attachment_0: mockBinaryData });
      expect(mockImapflow.mailboxOpen).toHaveBeenCalledWith('Sent', { readOnly: true });
      expect(mockImapflow.download).toHaveBeenCalledWith('555', '1.2', { uid: true });
    });

  }); // end executeImapAction - basic functionality

  describe('executeImapAction - multiple input items', () => {
    const createAttachmentBodyStructure = (partId: string, filename: string) => ({
      part: '1',
      type: 'multipart',
      childNodes: [
        {
          part: partId,
          type: 'application',
          disposition: 'attachment',
          dispositionParameters: { filename },
        },
      ],
    });

    it('should download attachments independently for each input item', async () => {
      const paramValues = {
        mailboxPath: { value: 'INBOX' },
        emailUid: (itemIndex: number) => (itemIndex === 0 ? '100' : '200'),
        allAttachments: true,
        includeInlineAttachments: false,
      };
      const context = createNodeParametersCheckerMock(downloadAttachmentOperation.parameters, paramValues);

      mockImapflow.fetchOne = jest.fn().mockImplementation(async (uid: string) => {
        if (uid === '100') {
          return {
            uid: '100',
            bodyStructure: createAttachmentBodyStructure('1.2', 'first-email.pdf'),
          };
        }
        if (uid === '200') {
          return {
            uid: '200',
            bodyStructure: createAttachmentBodyStructure('2.1', 'second-email.pdf'),
          };
        }
        return null;
      });

      const firstEmailContent = Buffer.from('first email attachment');
      const secondEmailContent = Buffer.from('second email attachment with different length');

      mockImapflow.download = jest.fn().mockImplementation(async (uid: string, partId: string) => {
        if (uid === '100' && partId === '1.2') {
          return {
            content: createImapflowLikeDownloadStream(firstEmailContent),
            meta: {
              filename: 'first-email.pdf',
              contentType: 'application/pdf',
              expectedSize: 999999,
            },
          };
        }
        if (uid === '200' && partId === '2.1') {
          return {
            content: createImapflowLikeDownloadStream(secondEmailContent),
            meta: {
              filename: 'second-email.pdf',
              contentType: 'application/pdf',
              expectedSize: 888888,
            },
          };
        }
        return { content: null, meta: null };
      });

      context.helpers!.prepareBinaryData = jest.fn().mockImplementation(async (data: Buffer) => ({
        data,
        mimeType: 'application/octet-stream',
      }));

      const firstItemResult = await downloadAttachmentOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        0,
        mockImapflow,
      );
      const secondItemResult = await downloadAttachmentOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        1,
        mockImapflow,
      );

      expect(firstItemResult?.[0].json.attachments).toEqual([
        expect.objectContaining({
          partId: '1.2',
          binaryFieldName: 'attachment_0',
          filename: 'first-email.pdf',
          size: firstEmailContent.length,
        }),
      ]);
      expect(secondItemResult?.[0].json.attachments).toEqual([
        expect.objectContaining({
          partId: '2.1',
          binaryFieldName: 'attachment_0',
          filename: 'second-email.pdf',
          size: secondEmailContent.length,
        }),
      ]);
      expect(mockImapflow.fetchOne).toHaveBeenCalledWith('200', { uid: true, bodyStructure: true }, { uid: true });
      expect(mockImapflow.download).toHaveBeenCalledWith('200', '2.1', { uid: true });
    });

    it('should report independent attachment sizes for multiple attachments on one item', async () => {
      const paramValues = {
        mailboxPath: { value: 'INBOX' },
        emailUid: '300',
        allAttachments: true,
        includeInlineAttachments: false,
      };
      const context = createNodeParametersCheckerMock(downloadAttachmentOperation.parameters, paramValues);

      mockImapflow.fetchOne = jest.fn().mockResolvedValue({
        uid: '300',
        bodyStructure: {
          part: '1',
          type: 'multipart',
          childNodes: [
            {
              part: '1.2',
              type: 'image',
              disposition: 'attachment',
              dispositionParameters: { filename: 'small.jpg' },
            },
            {
              part: '1.3',
              type: 'application',
              disposition: 'attachment',
              dispositionParameters: { filename: 'large.pdf' },
            },
          ],
        },
      });

      const smallAttachment = Buffer.from('small');
      const largeAttachment = Buffer.from('much larger attachment content');

      mockImapflow.download = jest.fn()
        .mockResolvedValueOnce({
          content: createImapflowLikeDownloadStream(smallAttachment),
          meta: {
            filename: 'small.jpg',
            contentType: 'image/jpeg',
            expectedSize: 4046509,
          },
        })
        .mockResolvedValueOnce({
          content: createImapflowLikeDownloadStream(largeAttachment),
          meta: {
            filename: 'large.pdf',
            contentType: 'application/pdf',
            expectedSize: 4046509,
          },
        });

      context.helpers!.prepareBinaryData = jest.fn().mockImplementation(async (data: Buffer) => ({
        data,
        mimeType: 'application/octet-stream',
      }));

      const result = await downloadAttachmentOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow,
      );

      const attachments = result?.[0].json.attachments as Array<{ size: number; filename: string }>;
      expect(attachments).toHaveLength(2);
      expect(attachments[0].size).toBe(smallAttachment.length);
      expect(attachments[1].size).toBe(largeAttachment.length);
      expect(attachments[0].size).not.toBe(attachments[1].size);
    });
  });

}); // end EmailDownloadAttachment