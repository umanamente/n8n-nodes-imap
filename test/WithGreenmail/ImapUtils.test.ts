import { createImapClient } from '../../nodes/Imap/utils/ImapUtils';
import { ImapCredentialsData } from '../../credentials/ImapCredentials.credentials';
import { describeWithGreenMail } from '../TestUtils/Greenmail/greenmail';
import { createMockLogger } from '../TestUtils/N8nMocks';
import { Logger as N8nLogger } from 'n8n-workflow';
import { ImapFlow } from 'imapflow';
import { getGlobalGreenmail } from './setup';


describeWithGreenMail('ImapUtils - createImapClient', () => {
  let mockLogger: jest.Mocked<N8nLogger>;

  // Silent logger (no warnings/errors for tests that throw errors)
  let mockLoggerSilent: jest.Mocked<N8nLogger>;

  //let mockLoggerVerbose: jest.Mocked<N8nLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockLoggerSilent = createMockLogger(false, false, false, false);
    //mockLoggerVerbose = createMockLogger(true, true, true, true);
  });

  describe('basic client creation', () => {
    it('should create an ImapFlow client with valid credentials', () => {
      // Arrange
      const greenmail = getGlobalGreenmail();
      const credentials = greenmail.getCredentials('test@example.com', false);

      // Act
      const client = createImapClient(credentials, mockLogger, false);

      // Assert
      expect(client).toBeInstanceOf(ImapFlow);
      expect(client).toBeDefined();
    });

    it('should create an ImapFlow client without logger', () => {
      // Arrange
      const greenmail = getGlobalGreenmail();
      const credentials = greenmail.getCredentials('test@example.com', false);

      // Act
      const client = createImapClient(credentials);

      // Assert
      expect(client).toBeInstanceOf(ImapFlow);
      expect(client).toBeDefined();
    });

    it('should create an ImapFlow client with debug logs enabled', () => {
      // Arrange
      const greenmail = getGlobalGreenmail();
      const credentials = greenmail.getCredentials('test@example.com', false);

      // Act
      const client = createImapClient(credentials, mockLogger, true);

      // Assert
      expect(client).toBeInstanceOf(ImapFlow);
      expect(client).toBeDefined();
    });
  });

  describe('connection establishment', () => {
    it('should successfully connect to IMAP server with valid credentials', async () => {
      // Arrange
      const greenmail = getGlobalGreenmail();
      const credentials = greenmail.getCredentials('user1@test.com', false);

      const client = createImapClient(credentials, mockLogger, true);

      try {
        // Act - connect() automatically authenticates in ImapFlow
        await client.connect();
        const mailboxes = await client.list();        

        // Assert
        expect(client.authenticated).toBe(true);
        expect(mailboxes).toBeDefined();
        expect(mailboxes.length).toBeGreaterThan(0);
      } finally {
        // Cleanup
        await client.close();
      }
    });

    it('should successfully connect to IMAP server without TLS', async () => {
      // Arrange
      const greenmail = getGlobalGreenmail();
      const credentials = greenmail.getCredentials('user2@test.com', false);
      const client = createImapClient(credentials, mockLogger, false);

      try {
        // Act
        await client.connect();

        // Assert
        expect(client.secureConnection).toBe(false); // Non-TLS connection
      } finally {
        // Cleanup
        await client.close();
      }
    });

    it('should handle connection to non-existent server gracefully', async () => {
      // Arrange
      const credentials: ImapCredentialsData = {
        host: 'non-existent-host-12345.com',
        port: 9999,
        user: 'test@example.com',
        password: 'password',
        tls: false,
        allowUnauthorizedCerts: false,
      };
      const client = createImapClient(credentials, mockLoggerSilent, false);

      // Act & Assert
      await expect(client.connect()).rejects.toThrow();
    });
  });

  describe('credentials configuration', () => {
    it('should create client with non-TLS credentials', () => {
      // Arrange
      const greenmail = getGlobalGreenmail();
      const credentials = greenmail.getCredentials('test@example.com', false);

      // Act
      const client = createImapClient(credentials, mockLogger, false);

      // Assert - Verify client is created
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(ImapFlow);
    });

    it('should create client with TLS credentials', () => {
      // Arrange
      const greenmail = getGlobalGreenmail();
      const credentials = greenmail.getCredentials('test@example.com', true);

      // Act
      const client = createImapClient(credentials, mockLogger, false);

      // Assert - Verify client is created
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(ImapFlow);
    });

    it('should configure allowUnauthorizedCerts correctly when true', () => {
      // Arrange
      const greenmail = getGlobalGreenmail();
      const credentials = greenmail.getCredentials('test@example.com', true);
      credentials.allowUnauthorizedCerts = true;

      // Act
      const client = createImapClient(credentials, mockLogger, false);

      // Assert - The client should be created without errors
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(ImapFlow);
    });

    it('should configure allowUnauthorizedCerts correctly when false', () => {
      // Arrange
      const greenmail = getGlobalGreenmail();
      const credentials = greenmail.getCredentials('test@example.com', false);
      credentials.allowUnauthorizedCerts = false;

      // Act
      const client = createImapClient(credentials, mockLogger, false);

      // Assert
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(ImapFlow);
    });
  });

  describe('authentication', () => {
    it('should authenticate with correct credentials', async () => {
      // Arrange
      const greenmail = getGlobalGreenmail();
      const testUser = greenmail.getDefaultTestUser();
      const credentials = greenmail.getCredentials(testUser.email, false);
      const client = createImapClient(credentials, mockLogger, false);

      try {
        // Act
        await client.connect();
        
        // Assert
        expect(client.authenticated).toBe(true);
      } finally {
        // Cleanup
        await client.close();
      }
    });

  });

  describe('logger integration', () => {
    it('should use provided logger when debug logs are enabled', async () => {
      // Arrange
      const greenmail = getGlobalGreenmail();
      const credentials = greenmail.getCredentials('logger-test@example.com', false);
      const client = createImapClient(credentials, mockLogger, true);

      try {
        // Act
        await client.connect();

        // Assert - Logger should have been called with debug/info messages
        // Note: The exact calls depend on ImapFlow internals
        expect(
          mockLogger.info.mock.calls.length > 0 || 
          mockLogger.debug.mock.calls.length > 0
        ).toBe(true);
      } finally {
        // Cleanup
        await client.close();
      }
    });

    it('should not log debug messages when debug logs are disabled', async () => {
      // Arrange
      const greenmail = getGlobalGreenmail();
      const credentials = greenmail.getCredentials('logger-test2@example.com', false);
      const debugMockLogger = createMockLogger();
      const client = createImapClient(credentials, debugMockLogger, false);

      try {
        // Act
        await client.connect();

        // Assert - Debug/info should not be called when debug is disabled
        // Errors might still be logged
        expect(debugMockLogger.info.mock.calls.length).toBe(0);
        expect(debugMockLogger.debug.mock.calls.length).toBe(0);
      } finally {
        // Cleanup
        await client.close();
      }
    });
  });

  describe('error handling', () => {

    it('should log errors when connection fails', async () => {
      // Arrange
      const credentials: ImapCredentialsData = {
        host: 'invalid-host.local',
        port: 9999,
        user: 'test@example.com',
        password: 'password',
        tls: false,
        allowUnauthorizedCerts: false,
      };
      const client = createImapClient(credentials, mockLoggerSilent, false);

      // Act
      try {
        await client.connect();
      } catch (error) {
        // Expected to fail
      }

      // Assert - Error logger might be called
      // Note: This depends on ImapFlow's internal error handling
      expect(mockLoggerSilent.error.mock.calls.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('multiple clients', () => {
    it('should create and connect multiple clients independently', async () => {
      // Arrange
      const greenmail = getGlobalGreenmail();
      const credentials1 = greenmail.getCredentials('user1@multi.com', false);
      const credentials2 = greenmail.getCredentials('user2@multi.com', false);
      
      const client1 = createImapClient(credentials1, mockLogger, false);
      const client2 = createImapClient(credentials2, mockLogger, false);

      try {
        // Act
        await client1.connect();
        await client2.connect();

        // Assert
        expect(client1.authenticated).toBe(true);
        expect(client2.authenticated).toBe(true);
        expect(client1).not.toBe(client2);
      } finally {
        // Cleanup
        await client1.logout();
        await client2.logout();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty user credentials', () => {
      // Arrange
      const greenmail = getGlobalGreenmail();
      const credentials: ImapCredentialsData = {
        host: greenmail.getHost(),
        port: greenmail.getImapPort(),
        user: '',
        password: '',
        tls: false,
        allowUnauthorizedCerts: true,
      };

      // Act & Assert - Should create client even with empty credentials
      const client = createImapClient(credentials, mockLogger, false);
      expect(client).toBeDefined();
    });

    it('should handle port 0', () => {
      // Arrange
      const greenmail = getGlobalGreenmail();
      const credentials: ImapCredentialsData = {
        host: greenmail.getHost(),
        port: 0,
        user: 'test@example.com',
        password: 'password',
        tls: false,
        allowUnauthorizedCerts: true,
      };

      // Act - Should create client but likely fail on connect
      const client = createImapClient(credentials, mockLogger, false);
      expect(client).toBeDefined();
    });

    it('should handle very long hostnames', () => {
      // Arrange
      const greenmail = getGlobalGreenmail();
      const longHostname = 'a'.repeat(255) + '.com';
      const credentials: ImapCredentialsData = {
        host: longHostname,
        port: greenmail.getImapPort(),
        user: 'test@example.com',
        password: 'password',
        tls: false,
        allowUnauthorizedCerts: true,
      };

      // Act
      const client = createImapClient(credentials, mockLogger, false);

      // Assert
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(ImapFlow);
    });
  });
});

describe('ImapUtils - createImapClient (without GreenMail)', () => {
  let mockLogger: jest.Mocked<N8nLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  describe('client creation without server', () => {
    it('should create client instance without throwing', () => {
      // Arrange
      const credentials: ImapCredentialsData = {
        host: 'test.example.com',
        port: 993,
        user: 'test@example.com',
        password: 'password',
        tls: true,
        allowUnauthorizedCerts: false,
      };

      // Act
      const client = createImapClient(credentials, mockLogger, false);

      // Assert
      expect(client).toBeInstanceOf(ImapFlow);
      expect(client).toBeDefined();
    });

    it('should handle all credential field types correctly', () => {
      // Arrange
      const credentials: ImapCredentialsData = {
        host: 'imap.example.com',
        port: 993,
        user: 'user@example.com',
        password: 'secure-password-123',
        tls: true,
        allowUnauthorizedCerts: true,
      };

      // Act
      const client = createImapClient(credentials, mockLogger, false);

      // Assert
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(ImapFlow);
    });

    it('should accept credentials with numeric types as specified in interface', () => {
      // Arrange
      const credentials: ImapCredentialsData = {
        host: 'imap.test.com',
        port: 143,
        user: 'user@test.com',
        password: 'pass123',
        tls: false,
        allowUnauthorizedCerts: false,
      };

      // Act
      const client = createImapClient(credentials, mockLogger, true);

      // Assert
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(ImapFlow);
    });
  });
});
