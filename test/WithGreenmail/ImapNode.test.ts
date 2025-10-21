/**
 * Integration tests for Imap Node class with GreenMail server
 * 
 * These tests verify the complete functionality of the Imap node implementation
 * using a real GreenMail IMAP server running in Docker.
 */

import { IExecuteFunctions } from 'n8n-workflow';
import { Imap } from '../../nodes/Imap/Imap.node';
import { describeWithGreenMail, GreenMailServer } from '../TestUtils/Greenmail/greenmail';
import { createNodeParametersCheckerMock } from '../TestUtils/N8nMocks';
import { getGlobalGreenmail } from './setup';
import { ImapCredentialsData } from '../../credentials/ImapCredentials.credentials';

describeWithGreenMail('Imap Node - with GreenMail', () => {
  let imap: Imap;
  let greenmail: GreenMailServer;
  let credentials: ImapCredentialsData;

  beforeAll(async () => {
    // Reset Greenmail before all tests to ensure clean state
    greenmail = getGlobalGreenmail();
    await greenmail.reset();
    credentials = greenmail.getCredentials('test@example.com');
  });

  beforeEach(() => {
    // Reset the Imap instance before each test
    imap = new Imap();
  });

  describe('mailbox operations (read only)', () => {
    it('should successfully execute loadMailboxList operation', async () => {
      // Create a mock parameters checker for testing
      const paramValues = {
        authentication: 'imapThisNode',
        resource: 'mailbox',
        operation: 'loadMailboxList',
        includeStatusFields: [],
      };
      const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);      

      // Mock getCredentials to return ImapCredentialsData
      context.getCredentials = jest.fn().mockResolvedValue(credentials);

      context.getInputData = jest.fn().mockReturnValue([1]);
      
      // Act
      const resultData = await imap.execute.call(context as IExecuteFunctions);

      // Assert
      expect(resultData).toHaveLength(1);
      expect(resultData[0]).toHaveLength(1);
      expect(resultData?.[0]?.[0]?.json).toEqual(
        {
          name: 'INBOX',
          path: 'INBOX',
          status: false,
        }
      );

    });

  });


  describe('sequence test (read and write operations)', () => {
    it('should successfully create a top level mailbox', async () => {
      // Create a mock parameters checker for testing
      const paramValues = {
        authentication: 'imapThisNode',
        resource: 'mailbox',
        operation: 'createMailbox',
        mailboxName: 'TestMailbox',
      };
      const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);
      
      // Mock getCredentials to return ImapCredentialsData
      context.getCredentials = jest.fn().mockResolvedValue(credentials);
      context.getInputData = jest.fn().mockReturnValue([1]);

      // Act
      const resultData = await imap.execute.call(context as IExecuteFunctions);
      // Assert
      expect(resultData).toHaveLength(1);
      expect(resultData[0]).toHaveLength(1);
      expect(resultData?.[0]?.[0]?.json).toEqual(
        {
          created: true,
          path: "TestMailbox",
        }
      );
    });

    it('should successfully rename a mailbox', async () => {
      // Create a mock parameters checker for testing
      const paramValues = {
        authentication: 'imapThisNode',
        resource: 'mailbox',
        operation: 'renameMailbox',
        mailboxPath: 'TestMailbox',
        newMailboxName: 'TopLevelMailbox',
      };
      const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);

      // Mock getCredentials to return ImapCredentialsData
      context.getCredentials = jest.fn().mockResolvedValue(credentials);
      context.getInputData = jest.fn().mockReturnValue([1]);
      // Act
      const resultData = await imap.execute.call(context as IExecuteFunctions);
      // Assert
      expect(resultData).toHaveLength(1);
      expect(resultData[0]).toHaveLength(1);
      expect(resultData?.[0]?.[0]?.json).toEqual(
        {
          newPath: 'TopLevelMailbox',
          path: '',
        }
      );
    });

  });
});

