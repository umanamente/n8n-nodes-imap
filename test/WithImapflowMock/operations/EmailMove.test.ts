import { IExecuteFunctions } from 'n8n-workflow';
import { getGlobalImapMock } from '../setup';
import { createImapflowMock, MockImapServer } from '../../TestUtils/ImapflowMock';
import { createNodeParametersCheckerMock } from '../../TestUtils/N8nMocks';
import { moveEmailOperation } from '../../../nodes/Imap/operations/email/functions/EmailMove';

describe('EmailMove', () => {
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
   
    it('should move email from source to destination mailbox', async () => {
      // Arrange
      const paramValues = {
        sourceMailbox: { value: 'INBOX' },
        emailUid: '123',
        destinationMailbox: { value: 'Sent' },
      };
      const context = createNodeParametersCheckerMock(moveEmailOperation.parameters, paramValues);
      
      // Mock the messageMove response
      const mockMoveResponse = {
        uid: '123',
        path: 'Sent',
        moved: true,
      };
      mockImapflow.messageMove = jest.fn().mockResolvedValue(mockMoveResponse);
      
      // Act
      const result = await moveEmailOperation.executeImapAction(
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
          "json": mockMoveResponse
        }
      ]);
      expect(mockImapflow.mailboxOpen).toHaveBeenCalledWith('INBOX', { readOnly: false });
      expect(mockImapflow.messageMove).toHaveBeenCalledWith('123', 'Sent', { uid: true });
    });


    it('should handle "false" response from messageMove by throwing an error', async () => {
      // Arrange
      const paramValues = {
        sourceMailbox: { value: 'INBOX' },
        emailUid: '999',
        destinationMailbox: { value: 'Sent' },
      };
      const context = createNodeParametersCheckerMock(moveEmailOperation.parameters, paramValues);
      // Mock the messageMove response to be false
      mockImapflow.messageMove = jest.fn().mockResolvedValue(false);
      // Act
      try {
        await moveEmailOperation.executeImapAction(
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

}); // end EmailMove