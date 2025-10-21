import { IExecuteFunctions } from 'n8n-workflow';
import { getGlobalImapMock } from '../setup';
import { createImapflowMock, MockImapServer } from '../../TestUtils/ImapflowMock';
import { createNodeParametersCheckerMock } from '../../TestUtils/N8nMocks';
import { getMailboxQuotaOperation } from '../../../nodes/Imap/operations/mailbox/functions/MailboxGetQuota';

describe('MailboxGetQuota', () => {
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
   
    it('should return mailbox quota', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: {value: 'INBOX'}
      };
      const context = createNodeParametersCheckerMock(getMailboxQuotaOperation.parameters, paramValues);
      
      // Act
      const result = await getMailboxQuotaOperation.executeImapAction(
        context as IExecuteFunctions,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      console.log('Mailbox Quota Result:', JSON.stringify(result, null, 2));

      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result).toEqual([
        {
          "json": {
            "path": "INBOX",
            "storage": {
              "used": 1024,
              "limit": 2048
            }
          }
        }
      ]);

    });

    it('should handle no quota information', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: {value: 'NOQUOTA'}
      };
      const context = createNodeParametersCheckerMock(getMailboxQuotaOperation.parameters, paramValues);
      // Act
      const result = await getMailboxQuotaOperation.executeImapAction(
        context as IExecuteFunctions,
        ITEM_INDEX,
        mockImapflow
      );
      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(0); // no items returned
    });

  });

});
