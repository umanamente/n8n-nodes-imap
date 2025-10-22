import { IExecuteFunctions } from 'n8n-workflow';
import { getGlobalImapMock } from '../setup';
import { createImapflowMock, MockImapServer } from '../../TestUtils/ImapflowMock';
import { createNodeParametersCheckerMock } from '../../TestUtils/N8nMocks';
import { getMailboxStatusOperation } from '../../../nodes/Imap/operations/mailbox/functions/MailboxGetStatus';

describe('MailboxGetStatus', () => {
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
   
    it('should return mailbox status for INBOX', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: {value: 'INBOX'}
      };
      const context = createNodeParametersCheckerMock(getMailboxStatusOperation.parameters, paramValues);
      
      // Act
      const result = await getMailboxStatusOperation.executeImapAction(
        context as IExecuteFunctions,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert

      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      
      const status = result![0].json;
      expect(status).toHaveProperty('messages');
      expect(status).toHaveProperty('recent');
      expect(status).toHaveProperty('unseen');
      expect(status).toHaveProperty('uidNext');
      expect(status).toHaveProperty('uidValidity');
      
      expect(typeof status.messages).toBe('number');
      expect(typeof status.recent).toBe('number');
      expect(typeof status.unseen).toBe('number');
      expect(typeof status.uidNext).toBe('number');
      expect(typeof status.uidValidity).toBe('number');
    });

    it('should return correct status with messages in mailbox', async () => {
      // Arrange
      const user = globalImapMock.getUser(MockImapServer.getValidCredentials().user);
      user?.createEmail('INBOX', 'From: test@example.com\r\nSubject: Test\r\n\r\nTest body');
      
      const paramValues = {
        mailboxPath: {value: 'INBOX'}
      };
      const context = createNodeParametersCheckerMock(getMailboxStatusOperation.parameters, paramValues);
      
      // Act
      const result = await getMailboxStatusOperation.executeImapAction(
        context as IExecuteFunctions,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      
      const status = result![0].json;
      expect(status.messages).toBeGreaterThan(0);
      expect(status.uidNext).toBeGreaterThan(1);
    });

    it('should return status for empty mailbox', async () => {
      // Arrange
      const user = globalImapMock.getUser(MockImapServer.getValidCredentials().user);
      user?.createMailbox('EmptyMailbox');
      
      const paramValues = {
        mailboxPath: {value: 'EmptyMailbox'}
      };
      const context = createNodeParametersCheckerMock(getMailboxStatusOperation.parameters, paramValues);
      
      // Act
      const result = await getMailboxStatusOperation.executeImapAction(
        context as IExecuteFunctions,
        ITEM_INDEX,
        mockImapflow
      );

      // Assert
      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      
      const status = result![0].json;
      expect(status.messages).toBe(0);
      expect(status.recent).toBe(0);
      expect(status.unseen).toBe(0);
    });

    it('should handle non-existent mailbox', async () => {
      // Arrange
      const paramValues = {
        mailboxPath: {value: 'NonExistentMailbox'}
      };
      const context = createNodeParametersCheckerMock(getMailboxStatusOperation.parameters, paramValues);
      
      // Act & Assert
      await expect(
        getMailboxStatusOperation.executeImapAction(
          context as IExecuteFunctions,
          ITEM_INDEX,
          mockImapflow
        )
      ).rejects.toThrow();
    });

  });

});
