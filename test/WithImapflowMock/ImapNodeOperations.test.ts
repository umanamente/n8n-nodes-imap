/**
 * Integration tests for Imap Node class with mocks
 * 
 * These tests verify the complete functionality of the Imap node implementation
 * using mocked dependencies.
 */

import { IExecuteFunctions } from 'n8n-workflow';
import { Imap } from '../../nodes/Imap/Imap.node';
import { createNodeParametersCheckerMock } from '../TestUtils/N8nMocks';
import { ImapCredentialsData } from '../../credentials/ImapCredentials.credentials';
import { MockImapServer } from '../TestUtils/ImapflowMock';
import { getGlobalImapMock } from './setup';

describe('Imap Node - mocked ImapFlow', () => {
  let imap: Imap;
  let globalImapMock: MockImapServer;
  let credentials: ImapCredentialsData;

  beforeAll(() => {
    // Get the global Imap server mock instance
    globalImapMock = getGlobalImapMock();

    credentials = {
      user: 'test@example.com',
      password: 'test@example.com',
      host: 'imap.example.com',
      port: 993,
      tls: true,
      allowUnauthorizedCerts: false
    };

  });

  beforeEach(() => {
    // Reset the Imap instance before each test
    imap = new Imap();

    // reset the global Imap mock server state
    globalImapMock.reset();


  });

  describe('mailbox operations', () => {
    it('should successfully execute loadMailboxList operation', async () => {
      // Create a mock parameters checker for testing
      const paramValues = {
        authentication: 'imapThisNode',
        resource: 'mailbox',
        operation: 'loadMailboxList',
        includeStatusFields: [],
      };
      const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);      
      context.getCredentials = jest.fn().mockResolvedValue(credentials);
      context.getInputData = jest.fn().mockReturnValue([1]);

      // Act
      const resultData = await imap.execute.call(context as IExecuteFunctions);

      // Assert
      expect(imap).toBeDefined();
      expect(imap).toBeInstanceOf(Imap);

      expect(resultData).toHaveLength(1);
      expect(resultData[0]).toHaveLength(1);
      expect(resultData?.[0]?.[0]?.json).toEqual(
        {
          name: 'INBOX',
          path: 'INBOX',
          status: undefined,
        }
      );

    });
  });



});

