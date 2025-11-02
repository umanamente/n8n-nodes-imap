import { IExecuteFunctions } from 'n8n-workflow';
import { getGlobalImapMock } from '../setup';
import { createImapflowMock, MockImapServer } from '../../TestUtils/ImapflowMock';
import { createNodeParametersCheckerMock } from '../../TestUtils/N8nMocks';
import { createDraftOperation } from '../../../nodes/Imap/operations/email/functions/EmailCreateDraft';

// Mock nodemailer module
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('EmailCreateDraft', () => {
  const ITEM_INDEX = 0;
  let globalImapMock: MockImapServer;
  let mockImapflow: any;
  let mockCreateTransport: jest.MockedFunction<any>;

  beforeEach(async () => {
    globalImapMock = getGlobalImapMock();

    const credentials = MockImapServer.getValidCredentials();

    mockImapflow = createImapflowMock(globalImapMock, {
      user: credentials.user,
      password: credentials.password,
    });    
    await mockImapflow.connect();

    // Set up default successful transporter mock
    const nodemailer = require('nodemailer');
    mockCreateTransport = nodemailer.createTransport as jest.MockedFunction<typeof nodemailer.createTransport>;
    
    const defaultMockTransporter = {
      sendMail: jest.fn().mockImplementation((mailData, callback) => {
        const successInfo = {
          envelope: { from: mailData.from, to: [mailData.to] },
          messageId: '<test@example.com>',
          message: Buffer.from('test email content'),
        };
        callback(null, successInfo);
      })
    };
    
    mockCreateTransport.mockReturnValue(defaultMockTransporter as any);
  });

  afterEach(() => {
    // Clear all mocks after each test
    jest.clearAllMocks();
  });

  describe('executeImapAction - basic functionality', () => {
   
    it('should create email draft using fields input format', async () => {
      // Arrange
      const paramValues = {
        destinationMailbox: { value: 'INBOX' },
        inputFormat: 'fields',
        subject: 'Test Draft Email',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        text: 'This is a test draft email body.',
      };
      const context = createNodeParametersCheckerMock(createDraftOperation.parameters, paramValues);
      
      // Mock the append response
      const mockAppendResponse = {
        uid: '456',
        path: 'INBOX',
        uidValidity: '123456789',
      };
      mockImapflow.append = jest.fn().mockResolvedValue(mockAppendResponse);
      
      // Act
      const result = await createDraftOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result).toEqual([
        {
          "json": mockAppendResponse
        }
      ]);
      expect(mockImapflow.mailboxOpen).toHaveBeenCalledWith('INBOX', { readOnly: false });
      expect(mockImapflow.append).toHaveBeenCalledWith(
        'INBOX',
        expect.any(String), // Just verify it's a string, not the specific content
        ["\\Draft"]
      );
    });

    it('should create email draft using RFC822 input format', async () => {
      // Arrange
      const rfc822Content = `From: sender@example.com
To: recipient@example.com
Subject: Test RFC822 Draft

This is a test RFC822 formatted email.`;

      const paramValues = {
        destinationMailbox: { value: 'INBOX' },
        inputFormat: 'rfc822',
        rfc822: rfc822Content,
      };
      const context = createNodeParametersCheckerMock(createDraftOperation.parameters, paramValues);
      
      // Mock the append response
      const mockAppendResponse = {
        uid: '789',
        path: 'INBOX',
        uidValidity: '987654321',
      };
      mockImapflow.append = jest.fn().mockResolvedValue(mockAppendResponse);
      
      // Act
      const result = await createDraftOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result).toEqual([
        {
          "json": mockAppendResponse
        }
      ]);
      expect(mockImapflow.mailboxOpen).toHaveBeenCalledWith('INBOX', { readOnly: false });
      expect(mockImapflow.append).toHaveBeenCalledWith(
        'INBOX',
        rfc822Content,
        ["\\Draft"]
      );
    });

    it('should handle "false" response from append by throwing an error', async () => {
      // Arrange
      const paramValues = {
        destinationMailbox: { value: 'INBOX' },
        inputFormat: 'fields',
        subject: 'Test Draft Email',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        text: 'This is a test draft email body.',
      };
      const context = createNodeParametersCheckerMock(createDraftOperation.parameters, paramValues);
      
      // Mock the append response to be false
      mockImapflow.append = jest.fn().mockResolvedValue(false);
      
      // Act & Assert
      await expect(
        createDraftOperation.executeImapAction(
          context as IExecuteFunctions,
          context.logger!,
          ITEM_INDEX,
          mockImapflow
        )
      ).rejects.toThrow('Unable to create draft');
    });

    it('should handle empty fields gracefully', async () => {
      // Arrange
      const paramValues = {
        destinationMailbox: { value: 'INBOX' },
        inputFormat: 'fields',
        subject: '',
        from: '',
        to: '',
        text: '',
      };
      const context = createNodeParametersCheckerMock(createDraftOperation.parameters, paramValues);
      
      // Mock the append response
      const mockAppendResponse = {
        uid: '111',
        path: 'INBOX',
        uidValidity: '111111111',
      };
      mockImapflow.append = jest.fn().mockResolvedValue(mockAppendResponse);
      
      // Act
      const result = await createDraftOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result).toEqual([
        {
          "json": mockAppendResponse
        }
      ]);
      expect(mockImapflow.mailboxOpen).toHaveBeenCalledWith('INBOX', { readOnly: false });
      expect(mockImapflow.append).toHaveBeenCalledWith(
        'INBOX',
        expect.any(String),
        ["\\Draft"]
      );
    });

    it('should verify draft flag is set correctly', async () => {
      // Arrange
      const paramValues = {
        destinationMailbox: { value: 'INBOX' },
        inputFormat: 'rfc822',
        rfc822: 'Subject: Test\n\nTest content',
      };
      const context = createNodeParametersCheckerMock(createDraftOperation.parameters, paramValues);
      
      // Mock the append response
      const mockAppendResponse = {
        uid: '333',
        path: 'INBOX',
      };
      mockImapflow.append = jest.fn().mockResolvedValue(mockAppendResponse);
      
      // Act
      await createDraftOperation.executeImapAction(
        context as IExecuteFunctions,
        context.logger!,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(mockImapflow.append).toHaveBeenCalledWith(
        'INBOX',
        'Subject: Test\n\nTest content',
        ["\\Draft"]
      );
    });

    it('should handle transporter sendMail error when using fields input format', async () => {
      // Arrange
      const paramValues = {
        destinationMailbox: { value: 'INBOX' },
        inputFormat: 'fields',
        subject: 'Test Draft Email',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        text: 'This is a test draft email body.',
      };
      const context = createNodeParametersCheckerMock(createDraftOperation.parameters, paramValues);
      
      // Mock nodemailer to return an error in sendMail callback
      const mockTransporter = {
        sendMail: jest.fn().mockImplementation((mailData, callback) => {
          const error = new Error('SMTP connection failed');
          callback(error, null);
        })
      };
      
      mockCreateTransport.mockReturnValue(mockTransporter as any);
      
      // Act & Assert
      await expect(
        createDraftOperation.executeImapAction(
          context as IExecuteFunctions,
          context.logger!,
          ITEM_INDEX,
          mockImapflow
        )
      ).rejects.toThrow();
      
      // Verify transporter was called
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        {
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Test Draft Email',
          text: 'This is a test draft email body.',
        },
        expect.any(Function)
      );
      
      // Verify append was never called since email composition failed
      expect(mockImapflow.append).not.toHaveBeenCalled();
    });

    it('should handle invalid info object from transporter sendMail', async () => {
      // Arrange
      const paramValues = {
        destinationMailbox: { value: 'INBOX' },
        inputFormat: 'fields',
        subject: 'Test Draft Email',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        text: 'This is a test draft email body.',
      };
      const context = createNodeParametersCheckerMock(createDraftOperation.parameters, paramValues);
      
      // Mock nodemailer to return success but with invalid info object (missing required fields)
      const mockTransporter = {
        sendMail: jest.fn().mockImplementation((mailData, callback) => {
          // Return an info object missing required fields (envelope, messageId, message)
          const invalidInfo = {
            accepted: ['recipient@example.com'],
            rejected: [],
            // Missing: envelope, messageId, message
          };
          callback(null, invalidInfo);
        })
      };
      
      mockCreateTransport.mockReturnValue(mockTransporter as any);
      
      // Act & Assert
      await expect(
        createDraftOperation.executeImapAction(
          context as IExecuteFunctions,
          context.logger!,
          ITEM_INDEX,
          mockImapflow
        )
      ).rejects.toThrow();
      
      // Verify transporter was called
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        {
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Test Draft Email',
          text: 'This is a test draft email body.',
        },
        expect.any(Function)
      );
      
      // Verify append was never called since email composition failed
      expect(mockImapflow.append).not.toHaveBeenCalled();
    });

    it('should handle missing envelope field from transporter sendMail', async () => {
      // Arrange
      const paramValues = {
        destinationMailbox: { value: 'INBOX' },
        inputFormat: 'fields',
        subject: 'Test Draft Email',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        text: 'This is a test draft email body.',
      };
      const context = createNodeParametersCheckerMock(createDraftOperation.parameters, paramValues);
      
      // Mock nodemailer to return success but with missing envelope field
      const mockTransporter = {
        sendMail: jest.fn().mockImplementation((mailData, callback) => {
          const infoMissingEnvelope = {
            messageId: '<test@example.com>',
            message: Buffer.from('test message'),
            // Missing: envelope
          };
          callback(null, infoMissingEnvelope);
        })
      };
      
      mockCreateTransport.mockReturnValue(mockTransporter as any);
      
      // Act & Assert
      await expect(
        createDraftOperation.executeImapAction(
          context as IExecuteFunctions,
          context.logger!,
          ITEM_INDEX,
          mockImapflow
        )
      ).rejects.toThrow();
      
      // Verify append was never called since email composition failed
      expect(mockImapflow.append).not.toHaveBeenCalled();
    });

    it('should handle missing messageId field from transporter sendMail', async () => {
      // Arrange
      const paramValues = {
        destinationMailbox: { value: 'INBOX' },
        inputFormat: 'fields',
        subject: 'Test Draft Email',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        text: 'This is a test draft email body.',
      };
      const context = createNodeParametersCheckerMock(createDraftOperation.parameters, paramValues);
      
      // Mock nodemailer to return success but with missing messageId field
      const mockTransporter = {
        sendMail: jest.fn().mockImplementation((mailData, callback) => {
          const infoMissingMessageId = {
            envelope: { from: 'sender@example.com', to: ['recipient@example.com'] },
            message: Buffer.from('test message'),
            // Missing: messageId
          };
          callback(null, infoMissingMessageId);
        })
      };
      
      mockCreateTransport.mockReturnValue(mockTransporter as any);
      
      // Act & Assert
      await expect(
        createDraftOperation.executeImapAction(
          context as IExecuteFunctions,
          context.logger!,
          ITEM_INDEX,
          mockImapflow
        )
      ).rejects.toThrow();
      
      // Verify append was never called since email composition failed
      expect(mockImapflow.append).not.toHaveBeenCalled();
    });

    it('should handle missing message field from transporter sendMail', async () => {
      // Arrange
      const paramValues = {
        destinationMailbox: { value: 'INBOX' },
        inputFormat: 'fields',
        subject: 'Test Draft Email',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        text: 'This is a test draft email body.',
      };
      const context = createNodeParametersCheckerMock(createDraftOperation.parameters, paramValues);
      
      // Mock nodemailer to return success but with missing message field
      const mockTransporter = {
        sendMail: jest.fn().mockImplementation((mailData, callback) => {
          const infoMissingMessage = {
            envelope: { from: 'sender@example.com', to: ['recipient@example.com'] },
            messageId: '<test@example.com>',
            // Missing: message
          };
          callback(null, infoMissingMessage);
        })
      };
      
      mockCreateTransport.mockReturnValue(mockTransporter as any);
      
      // Act & Assert
      await expect(
        createDraftOperation.executeImapAction(
          context as IExecuteFunctions,
          context.logger!,
          ITEM_INDEX,
          mockImapflow
        )
      ).rejects.toThrow();
      
      // Verify append was never called since email composition failed
      expect(mockImapflow.append).not.toHaveBeenCalled();
    });
    
  }); // end executeImapAction - basic functionality

}); // end EmailCreateDraft