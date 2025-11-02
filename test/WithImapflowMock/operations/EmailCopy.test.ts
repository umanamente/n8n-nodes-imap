import { IExecuteFunctions } from 'n8n-workflow';
import { getGlobalImapMock } from '../setup';
import { createImapflowMock, MockImapServer } from '../../TestUtils/ImapflowMock';
import { createNodeParametersCheckerMock } from '../../TestUtils/N8nMocks';
import { copyEmailOperation } from '../../../nodes/Imap/operations/email/functions/EmailCopy';

describe('EmailCopy', () => {
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
   
    it('should copy email from source to destination mailbox', async () => {
      // Arrange
      const paramValues = {
        sourceMailbox: { value: 'INBOX' },
        emailUid: '123',
        destinationMailbox: { value: 'Sent' },
      };
      const context = createNodeParametersCheckerMock(copyEmailOperation.parameters, paramValues);
      
      // Mock the messageCopy response
      const mockCopyResponse = {
        uid: '123',
        path: 'Sent',
        copied: true,
      };
      mockImapflow.messageCopy = jest.fn().mockResolvedValue(mockCopyResponse);
      
      // Act
      const result = await copyEmailOperation.executeImapAction(
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
          "json": mockCopyResponse
        }
      ]);
      expect(mockImapflow.mailboxOpen).toHaveBeenCalledWith('INBOX', { readOnly: false });
      expect(mockImapflow.messageCopy).toHaveBeenCalledWith('123', 'Sent', { uid: true });
    });


    it('should handle "false" response from messageCopy by throwing an error', async () => {
      // Arrange
      const paramValues = {
        sourceMailbox: { value: 'INBOX' },
        emailUid: '999',
        destinationMailbox: { value: 'Sent' },
      };
      const context = createNodeParametersCheckerMock(copyEmailOperation.parameters, paramValues);
      // Mock the messageCopy response to be false
      mockImapflow.messageCopy = jest.fn().mockResolvedValue(false);
      // Act
      try {
        await copyEmailOperation.executeImapAction(
          context as IExecuteFunctions,
          context.logger!,
          ITEM_INDEX,
          mockImapflow
        );
        fail('Expected error was not thrown');
      } catch (error) {
        // Assert
        expect(error).toBeInstanceOf(Error);
      }
    });


    
  }); // end executeImapAction - basic functionality

}); // end EmailCopy
