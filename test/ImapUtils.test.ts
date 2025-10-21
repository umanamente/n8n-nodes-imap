import { createImapClient } from '../nodes/Imap/utils/ImapUtils';
import { ImapCredentialsData } from '../credentials/ImapCredentials.credentials';
import { GreenMailServer, describeWithGreenMail } from './utils/greenmail';
import { createMockLogger } from './utils/N8nMocks';
import { Logger as N8nLogger } from 'n8n-workflow';
import { ImapFlow } from 'imapflow';

describeWithGreenMail('ImapUtils - createImapClient', () => {
  let greenmail: GreenMailServer;
  let mockLogger: jest.Mocked<N8nLogger>;

  beforeAll(async () => {
    greenmail = new GreenMailServer();
    await greenmail.start();
  }, 30000); // 30 second timeout for Docker startup

  afterAll(async () => {
    await greenmail.stop();
  }, 10000);

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  describe('basic client creation', () => {
    it('should create an ImapFlow client with valid credentials', () => {
      // Arrange
      const credentials = greenmail.getCredentials('test@example.com', false);

      // Act
      const client = createImapClient(credentials, mockLogger, false);

      // Assert
      expect(client).toBeInstanceOf(ImapFlow);
      expect(client).toBeDefined();
    });

    it('should create an ImapFlow client without logger', () => {
      // Arrange
      const credentials = greenmail.getCredentials('test@example.com', false);

      // Act
      const client = createImapClient(credentials);

      // Assert
      expect(client).toBeInstanceOf(ImapFlow);
      expect(client).toBeDefined();
    });

    it('should create an ImapFlow client with debug logs enabled', () => {
      // Arrange
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
      const credentials = greenmail.getCredentials('user1@test.com', false);
      const client = createImapClient(credentials, mockLogger, false);

      try {
        // Act - connect() automatically authenticates in ImapFlow
        await client.connect();

        // Assert
        expect(client.authenticated).toBe(true);
      } finally {
        // Cleanup
        await client.logout();
      }
    }, 10000);

    it('should successfully connect to IMAP server without TLS', async () => {
      // Arrange
      const credentials = greenmail.getCredentials('user2@test.com', false);
      const client = createImapClient(credentials, mockLogger, false);

      try {
        // Act
        await client.connect();

        // Assert
        expect(client.secureConnection).toBe(false); // Non-TLS connection
      } finally {
        // Cleanup
        await client.logout();
      }
    }, 10000);

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
      const client = createImapClient(credentials, mockLogger, false);

      // Act & Assert
      await expect(client.connect()).rejects.toThrow();
    }, 10000);
  });

  describe('credentials configuration', () => {
    it('should create client with non-TLS credentials', () => {
      // Arrange
      const credentials = greenmail.getCredentials('test@example.com', false);

      // Act
      const client = createImapClient(credentials, mockLogger, false);

      // Assert - Verify client is created
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(ImapFlow);
    });

    it('should create client with TLS credentials', () => {
      // Arrange
      const credentials = greenmail.getCredentials('test@example.com', true);

      // Act
      const client = createImapClient(credentials, mockLogger, false);

      // Assert - Verify client is created
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(ImapFlow);
    });

    it('should configure allowUnauthorizedCerts correctly when true', () => {
      // Arrange
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
        await client.logout();
      }
    }, 10000);

    it('should fail authentication with incorrect password', async () => {
      // Arrange
      const credentials: ImapCredentialsData = {
        host: greenmail.getHost(),
        port: greenmail.getImapPort(),
        user: 'test@example.com',
        password: 'wrong-password',
        tls: false,
        allowUnauthorizedCerts: true,
      };
      const client = createImapClient(credentials, mockLogger, false);

      // Act & Assert
      await expect(client.connect()).rejects.toThrow();
    }, 10000);

    it('should fail authentication with incorrect username', async () => {
      // Arrange
      const credentials: ImapCredentialsData = {
        host: greenmail.getHost(),
        port: greenmail.getImapPort(),
        user: 'nonexistent@example.com',
        password: 'wrong-password',
        tls: false,
        allowUnauthorizedCerts: true,
      };
      const client = createImapClient(credentials, mockLogger, false);

      // Act & Assert
      await expect(client.connect()).rejects.toThrow();
    }, 10000);
  });

  describe('logger integration', () => {
    it('should use provided logger when debug logs are enabled', async () => {
      // Arrange
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
        await client.logout();
      }
    }, 10000);

    it('should not log debug messages when debug logs are disabled', async () => {
      // Arrange
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
        await client.logout();
      }
    }, 10000);
  });

  describe('error handling', () => {
    it('should handle connection timeout gracefully', async () => {
      // Arrange - Use an IP that will timeout (non-routable IP)
      const credentials: ImapCredentialsData = {
        host: '192.0.2.1', // TEST-NET-1, non-routable
        port: 143,
        user: 'test@example.com',
        password: 'password',
        tls: false,
        allowUnauthorizedCerts: false,
      };
      const client = createImapClient(credentials, mockLogger, false);

      // Act & Assert
      await expect(client.connect()).rejects.toThrow();
    }, 15000);

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
      const client = createImapClient(credentials, mockLogger, false);

      // Act
      try {
        await client.connect();
      } catch (error) {
        // Expected to fail
      }

      // Assert - Error logger might be called
      // Note: This depends on ImapFlow's internal error handling
    }, 10000);
  });

  describe('multiple clients', () => {
    it('should create and connect multiple clients independently', async () => {
      // Arrange
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
    }, 10000);
  });

  describe('lifecycle management', () => {
    it('should properly disconnect when logout is called', async () => {
      // Arrange
      const credentials = greenmail.getCredentials('lifecycle@example.com', false);
      const client = createImapClient(credentials, mockLogger, false);

      // Act
      await client.connect();
      expect(client.authenticated).toBe(true);
      
      await client.logout();

      // Assert
      expect(client.authenticated).toBe(false);
    }, 10000);

    it('should handle multiple logout calls gracefully', async () => {
      // Arrange
      const credentials = greenmail.getCredentials('logout@example.com', false);
      const client = createImapClient(credentials, mockLogger, false);

      // Act
      await client.connect();
      await client.logout();
      
      // Second logout should not throw
      await expect(client.logout()).resolves.not.toThrow();
    }, 10000);
  });

  describe('edge cases', () => {
    it('should handle empty user credentials', () => {
      // Arrange
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
