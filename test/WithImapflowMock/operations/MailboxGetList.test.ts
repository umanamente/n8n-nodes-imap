import { IExecuteFunctions } from 'n8n-workflow';
import { getGlobalImapMock } from '../setup';
import { createImapflowMock, MockImapServer } from '../../TestUtils/ImapflowMock';
import { createNodeParametersCheckerMock } from '../../TestUtils/N8nMocks';
import { getMailboxListOperation } from '../../../nodes/Imap/operations/mailbox/functions/MailboxGetList';

describe('MailboxGetList', () => {
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
   
    it('should return mailbox list without status fields', async () => {
      // Arrange
      const paramValues = {
        includeStatusFields: [],
      };
      const context = createNodeParametersCheckerMock(getMailboxListOperation.parameters, paramValues);
      
      // Act
      const result = await getMailboxListOperation.executeImapAction(
        context as IExecuteFunctions,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result).toEqual([
        {
          "json": {
            "path": "INBOX",
            "name": "INBOX"
          }
        }
      ]);

    });

  });

});
