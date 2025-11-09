/**
 * Integration tests for Imap Node class with mocks
 * 
 * These tests verify the complete functionality of the Imap node implementation
 * using mocked dependencies.
 */

import { ICredentialTestFunctions, ICredentialsDecrypted, IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { executeWithHandler, Imap } from '../../nodes/Imap/Imap.node';
import { createNodeParametersCheckerMock } from '../TestUtils/N8nMocks';
import { ImapCredentialsData } from '../../credentials/ImapCredentials.credentials';
import * as ImapUtils from '../../nodes/Imap/utils/ImapUtils';
import { ImapFlowErrorCatcher } from '../../nodes/Imap/utils/ImapUtils';
import { IResourceOperationDef } from '../../nodes/Imap/utils/CommonDefinitions';
import { ImapNodeDebugUtils } from '../../nodes/Imap/utils/debug/ImapNodeDebugUtils';

// Mock the createImapClient function
jest.mock('../../nodes/Imap/utils/ImapUtils', () => ({
  ...jest.requireActual('../../nodes/Imap/utils/ImapUtils'),
  createImapClient: jest.fn(),
}));

describe('Imap Node - exceptions handling', () => {
  let imap: Imap;
  let mockImapClient: any;

  let defaultCredentials: ImapCredentialsData = {
    user: 'test@example.com',
    password: 'password',
    host: 'imap.example.com',
    port: 993,
    tls: true,
    allowUnauthorizedCerts: false,
    allowStartTLS: false
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

    it('should handle operation failure with IMAP errors gracefully', async () => {
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
        // Simulate IMAP errors being captured            
        ImapFlowErrorCatcher.getInstance().onImapError({
          message: 'IMAP error 1',
        });
        ImapFlowErrorCatcher.getInstance().onImapWarning({
          message: 'IMAP warning 1',
        });
        
        throw new Error('Operation failed with IMAP errors');
      });

      // Add a second IMAP error after the operation failure to verify only errors during operation are captured
      ImapFlowErrorCatcher.getInstance().onImapError({
        message: 'IMAP error - not captured',
      });
      ImapFlowErrorCatcher.getInstance().onImapWarning({
        message: 'IMAP warning - not captured',
      });

      // Act & Assert
      
      await expect(imap.execute.call(context as IExecuteFunctions)).rejects.toThrow(ImapUtils.NodeImapError);
      try {
        await imap.execute.call(context as IExecuteFunctions);
        fail('Expected error was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ImapUtils.NodeImapError);
        expect(error).toBeInstanceOf(NodeOperationError);
        expect(error).toHaveProperty('description');
        expect((error as NodeOperationError).description).toContain('The following errors were reported by the IMAP server:');
        expect((error as NodeOperationError).description).toContain('IMAP error 1');
        expect((error as NodeOperationError).description).toContain('IMAP warning 1');
        expect((error as NodeOperationError).description).not.toContain('IMAP error - not captured');
        expect((error as NodeOperationError).description).not.toContain('IMAP warning - not captured');
        expect((error as NodeOperationError).message).toContain('Operation failed with IMAP errors');
      }
    });

    it('should handle operation failure with a NodeOperationError gracefully', async () => {
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

      // mock operation failure with NodeOperationError
      mockImapClient.list.mockImplementation(() => {
        throw new NodeOperationError(
          { 
            id: 'test-node-id',
            name: 'Imap Test Node',
            typeVersion: 1,
            type: 'imap',
            position: [0, 0],
            disabled: false,
            parameters: paramValues
          }, 
          {
            jsonParam: "test",
          }, 
          { message: 'Node API error occurred' }
        );
      });

      // Act & Assert
      try {
        await imap.execute.call(context as IExecuteFunctions);
        fail('Expected error was not thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NodeOperationError);
        expect(error).toHaveProperty('message', 'Node API error occurred');
        expect(error).toHaveProperty('errorResponse', { jsonParam: "test" });
      }
    });

    it('should handle operation returned no data gracefully', async () => {
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

      // mock operation returning no data
      mockImapClient.list.mockResolvedValue([]);

      // Act 
      const resultData = await imap.execute.call(context as IExecuteFunctions);

      // Assert
      expect(resultData.length).toBeGreaterThanOrEqual(1);
      expect(resultData[0]).toHaveLength(0);
    });

    it('should handle operation returning null data gracefully', async () => {
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

      const mockHandler: IResourceOperationDef = {
        executeImapAction: async () => {
          return null;
        },
        operation: { name: 'Test Null', value: 'testNull' },
        parameters: [],
      };

      // Act 
      const resultData = await executeWithHandler(context as IExecuteFunctions, mockImapClient, mockHandler);
      // Assert
      expect(resultData.length).toBeGreaterThanOrEqual(1);
      expect(resultData[0]).toHaveLength(0);

    });

    it('should handle operation throwing unknown error gracefully', async () => {
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

      const mockHandler: IResourceOperationDef = {
        executeImapAction: async () => {
          throw Error();
        },
        operation: { name: 'Test Null', value: 'testNull' },
        parameters: [],
      };

      // Act & Assert
      await expect(executeWithHandler(context as IExecuteFunctions, mockImapClient, mockHandler))
        .rejects.toThrow('Unknown error');
    });

    describe('continue on fail handling', () => {
      it('should continue on fail for an operation failure', async () => {
        // Create a mock parameters checker for testing
        const paramValues = {
          authentication: 'imapThisNode',
          resource: 'mailbox',
          operation: 'loadMailboxList',
          includeStatusFields: [],
        };
        const context = createNodeParametersCheckerMock(imap.description.properties, paramValues, true);
        context.getCredentials = jest.fn().mockResolvedValue(defaultCredentials);
        context.getInputData = jest.fn().mockReturnValue([1]);
        context.getNode = jest.fn().mockReturnValue({ name: 'Imap Test Node' });

        const mockHandler: IResourceOperationDef = {
          executeImapAction: async () => {
            throw new Error('Simulated operation failure for continue on fail test');
          },
          operation: { name: 'Test Error', value: 'testError' },
          parameters: [],
        };

        // Act & Assert
        await expect(executeWithHandler(context as IExecuteFunctions, mockImapClient, mockHandler))
          .resolves.toEqual([
            [
              {
                error: expect.any(Error),
                json: { error: 'Simulated operation failure for continue on fail test' },
                pairedItem: { item: 0 },
              },
            ],
          ]);
      });

      it('should throw error when continue on fail is disabled', async () => {
        // Create a mock parameters checker for testing
        const paramValues = {
          authentication: 'imapThisNode',
          resource: 'mailbox',
          operation: 'loadMailboxList',
          includeStatusFields: [],
        };
        const context = createNodeParametersCheckerMock(imap.description.properties, paramValues, false);
        context.getCredentials = jest.fn().mockResolvedValue(defaultCredentials);
        context.getInputData = jest.fn().mockReturnValue([1]);
        context.getNode = jest.fn().mockReturnValue({ name: 'Imap Test Node' });
        const mockHandler: IResourceOperationDef = {
          executeImapAction: async () => {
            throw new Error('Simulated operation failure for continue on fail disabled test');
          },
          operation: { name: 'Test Error', value: 'testError' },
          parameters: [],
        };
        // Act & Assert
        await expect(executeWithHandler(context as IExecuteFunctions, mockImapClient, mockHandler))
          .rejects.toThrow('Simulated operation failure for continue on fail disabled test');
      });
    
    }); // end continue on fail handling


    describe('debug mode exception handling', () => {

      it('should not throw error if debug mode is enabled and operation fails', async () => {
        // Create a mock parameters checker for testing
        const paramValues = {
          authentication: 'imapThisNode',
          resource: 'mailbox',
          operation: 'loadMailboxList',
          includeStatusFields: [],
          debug: true,
        };

        // mock debug mode enabled
        jest.spyOn(ImapNodeDebugUtils, 'ImapNodeDebugUtilsEnabled').mockReturnValue(true);

        const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);
        context.getCredentials = jest.fn().mockResolvedValue(defaultCredentials);
        context.getInputData = jest.fn().mockReturnValue([1]);
        context.getNode = jest.fn().mockReturnValue({ name: 'Imap Test Node' });

        // mock operation failure
        mockImapClient.list.mockImplementation(() => {
          throw new Error('Operation failed in debug mode');
        });

        // Act 
        const resultData = await imap.execute.call(context as IExecuteFunctions);
        // Assert
        expect(resultData.length).toBeGreaterThanOrEqual(2);
        expect(resultData[0]).toHaveLength(0);
        expect(resultData[1][0]).toHaveProperty('json.error');

      });

    }); // end debug mode exception handling

  }); // end exception handling

  describe('credential testing', () => {
    describe('testImapCredentials', () => {
      it('should return OK status for valid credentials', async () => {
        // Arrange
        const credentials: ICredentialsDecrypted = {
          id: 'test-cred-id',
          name: 'Test IMAP Credentials',
          type: 'imapApi',
          data: {
            user: 'test@example.com',
            password: 'password123',
            host: 'imap.example.com',
            port: 993,
            tls: true,
            allowUnauthorizedCerts: false,
            allowStartTLS: false,
          },
        };

        // Mock successful connection
        mockImapClient.connect.mockResolvedValue(undefined);
        mockImapClient.logout.mockResolvedValue(undefined);

        // Create a mock context for credential testing
        const mockContext = {} as ICredentialTestFunctions;

        // Act
        const result = await imap.methods.credentialTest.testImapCredentials.call(
          mockContext,
          credentials
        );

        // Assert
        expect(result).toEqual({
          status: 'OK',
          message: 'Success',
        });
        expect(ImapUtils.createImapClient).toHaveBeenCalledWith(credentials.data);
        expect(mockImapClient.connect).toHaveBeenCalled();
        expect(mockImapClient.logout).toHaveBeenCalled();
      });

      it('should return Error status for invalid credentials with authentication failure', async () => {
        // Arrange
        const credentials: ICredentialsDecrypted = {
          id: 'test-cred-id',
          name: 'Test IMAP Credentials',
          type: 'imapApi',
          data: {
            user: 'test@example.com',
            password: 'wrongpassword',
            host: 'imap.example.com',
            port: 993,
            tls: true,
            allowUnauthorizedCerts: false,
            allowStartTLS: false,
          },
        };

        // Mock authentication failure
        const authError = new Error('Authentication failed');
        mockImapClient.connect.mockRejectedValue(authError);

        // Create a mock context for credential testing
        const mockContext = {} as ICredentialTestFunctions;

        // Act
        const result = await imap.methods.credentialTest.testImapCredentials.call(
          mockContext,
          credentials
        );

        // Assert
        expect(result).toEqual({
          status: 'Error',
          message: 'Authentication failed',
        });
        expect(ImapUtils.createImapClient).toHaveBeenCalledWith(credentials.data);
        expect(mockImapClient.connect).toHaveBeenCalled();
        expect(mockImapClient.logout).not.toHaveBeenCalled();
      });
    });

  }); // end credential testing

}); // end Imap Node - exceptions handling

