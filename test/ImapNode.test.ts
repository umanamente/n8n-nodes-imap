/**
 * Integration tests for Imap Node class with mocks
 * 
 * These tests verify the complete functionality of the Imap node implementation
 * using mocked dependencies.
 */

import { IExecuteFunctions } from 'n8n-workflow';
import { Imap } from '../nodes/Imap/Imap.node';
import { createNodeParametersCheckerMock } from './TestUtils/N8nMocks';
import { ImapCredentialsData } from '../credentials/ImapCredentials.credentials';
import * as ImapUtils from '../nodes/Imap/utils/ImapUtils';
import { ListResponse } from 'imapflow';

// Mock the createImapClient function
jest.mock('../nodes/Imap/utils/ImapUtils', () => ({
  ...jest.requireActual('../nodes/Imap/utils/ImapUtils'),
  createImapClient: jest.fn(),
}));

describe('Imap Node - mocked ImapFlow', () => {
  let imap: Imap;
  let mockImapClient: any;

  let defaultCredentials: ImapCredentialsData = {
    user: 'test@example.com',
    password: 'password',
    host: 'imap.example.com',
    port: 993,
    tls: true,
    allowUnauthorizedCerts: false
  };

  afterAll(() => {
    // Restore the original implementation after all tests
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    // Reset the Imap instance before each test
    imap = new Imap();

    // Create a mocked ImapFlow client
    mockImapClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      logout: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      getMailboxLock: jest.fn(),
      list: jest.fn(),
      search: jest.fn(),
      fetchOne: jest.fn(),
      append: jest.fn(),
      messageDelete: jest.fn(),
      messageCopy: jest.fn(),
      messageMove: jest.fn(),
      setFlags: jest.fn(),
    };

    // Mock the createImapClient function to return our mocked client
    (ImapUtils.createImapClient as jest.Mock).mockReturnValue(mockImapClient);
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
      context.getCredentials = jest.fn().mockResolvedValue(defaultCredentials);
      context.getInputData = jest.fn().mockReturnValue([1]);

      // Mock the ImapFlow client methods
      mockImapClient.list.mockResolvedValue([
          {
            name: 'INBOX',
            delimiter: '/',
            path: 'INBOX',
            pathAsListed: 'INBOX',
            parent: "",
            parentPath: '',
            specialUse: null,
            listed: true,
            subscribed: true,            
          },
        ] as unknown as ListResponse[]);

      // Act
      const resultData = await imap.execute.call(context as IExecuteFunctions);

      console.log('Result Data:', resultData);

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

  describe('mail operations', () => {
    // Additional mail operation tests would go here
  });

  describe('exception handling', () => {
    it('should handle invalid resource parameter gracefully', async () => {
      // Create a mock parameters checker for testing
      const paramValues = {
        authentication: 'imapThisNode',
        resource: 'invalidResource',
        operation: 'someOperation',
      };
      const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);      
      context.getCredentials = jest.fn().mockResolvedValue(defaultCredentials);
      context.getInputData = jest.fn().mockReturnValue([1]);
      context.getNode = jest.fn().mockReturnValue({ name: 'Imap Test Node' });

      // Act & Assert
      await expect(imap.execute.call(context as IExecuteFunctions)).rejects.toThrow('Unknown operation "someOperation" for resource "invalidResource"');
    });

    it('should handle connection failure gracefully', async () => {
      // Create a mock parameters checker for testing
      const paramValues = {
        authentication: 'imapThisNode',
        resource: 'mailbox',
        operation: 'loadMailboxList',
      };
      const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);      
      context.getCredentials = jest.fn().mockResolvedValue(defaultCredentials);
      context.getInputData = jest.fn().mockReturnValue([1]);
      context.getNode = jest.fn().mockReturnValue({ name: 'Imap Test Node' });

      // mock connection failure
      mockImapClient.connect.mockRejectedValue(new Error('Connection failed'));

      // Act & Assert
      await expect(imap.execute.call(context as IExecuteFunctions)).rejects.toThrow('Connection failed');
    });

    it('should handle operation failure without IMAP errors gracefully', async () => {
      // Create a mock parameters checker for testing
      const paramValues = {
        authentication: 'imapThisNode',
        resource: 'mailbox',
        operation: 'loadMailboxList',
        includeStatusFields: [],
      };
      const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);      
      context.getCredentials = jest.fn().mockResolvedValue(defaultCredentials);
      context.getInputData = jest.fn().mockReturnValue([1]);
      context.getNode = jest.fn().mockReturnValue({ name: 'Imap Test Node' });

      // mock operation failure
      mockImapClient.list.mockImplementation(() => {
        throw new Error('Operation failed without IMAP errors');
      });
      // Act & Assert
      await expect(imap.execute.call(context as IExecuteFunctions)).rejects.toThrow('Operation failed without IMAP errors');
    });

  });

});

