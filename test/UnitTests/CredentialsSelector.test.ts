import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import {
  getImapCredentials,
  CREDENTIALS_TYPE_THIS_NODE,
  CREDENTIALS_TYPE_CORE_IMAP_ACCOUNT,
  credentialNames,
} from '../../nodes/Imap/utils/CredentialsSelector';
import { DEFAULT_STARTTLS_USAGE, ImapCredentialsData } from '../../credentials/ImapCredentials.credentials';

describe('CredentialsSelector', () => {
  describe('getImapCredentials', () => {
    let mockContext: jest.Mocked<IExecuteFunctions>;
    const FIRST_NODE_INDEX = 0;

    beforeEach(() => {
      // Create a mock context with all required methods
      mockContext = {
        getNodeParameter: jest.fn(),
        getCredentials: jest.fn(),
        logger: {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          debug: jest.fn(),
        },
      } as unknown as jest.Mocked<IExecuteFunctions>;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('when using imapThisNode credentials', () => {
      it('should retrieve and return ImapCredentials', async () => {
        // Arrange
        const expectedCredentials: ImapCredentialsData = {
          host: 'imap.example.com',
          port: 993,
          user: 'test@example.com',
          password: 'testpassword',
          tls: true,
          allowUnauthorizedCerts: false,
          startTLSUsage: DEFAULT_STARTTLS_USAGE,
        };

        mockContext.getNodeParameter.mockReturnValue(CREDENTIALS_TYPE_THIS_NODE);
        mockContext.getCredentials.mockResolvedValue(expectedCredentials as any);

        // Act
        const result = await getImapCredentials(mockContext);

        // Assert
        expect(mockContext.getNodeParameter).toHaveBeenCalledWith('authentication', FIRST_NODE_INDEX);
        expect(mockContext.getCredentials).toHaveBeenCalledWith(credentialNames[CREDENTIALS_TYPE_THIS_NODE]);
        expect(result).toEqual(expectedCredentials);
        expect(mockContext.logger.info).toHaveBeenCalledWith(
          `Using credentials from ${credentialNames[CREDENTIALS_TYPE_THIS_NODE]}`
        );
        expect(mockContext.logger.info).toHaveBeenCalledWith(`Host: ${expectedCredentials.host}:${expectedCredentials.port}`);
        expect(mockContext.logger.info).toHaveBeenCalledWith(`User: ${expectedCredentials.user}`);
      });

      it('should handle credentials with self-signed certificates', async () => {
        // Arrange
        const expectedCredentials: ImapCredentialsData = {
          host: 'imap.example.com',
          port: 993,
          user: 'test@example.com',
          password: 'testpassword',
          tls: true,
          allowUnauthorizedCerts: true,
          startTLSUsage: DEFAULT_STARTTLS_USAGE,
        };

        mockContext.getNodeParameter.mockReturnValue(CREDENTIALS_TYPE_THIS_NODE);
        mockContext.getCredentials.mockResolvedValue(expectedCredentials as any);

        // Act
        const result = await getImapCredentials(mockContext);

        // Assert
        expect(result).toEqual(expectedCredentials);
        expect(result.allowUnauthorizedCerts).toBe(true);
      });
    });

    describe('when using coreImapAccount credentials', () => {
      it('should transform and return core IMAP credentials', async () => {
        // Arrange
        const coreCredentials = {
          host: 'imap.gmail.com',
          port: 993,
          user: 'user@gmail.com',
          password: 'gmailpassword',
          secure: true,
          allowUnauthorizedCerts: false,          
        };

        const expectedCredentials: ImapCredentialsData = {
          host: 'imap.gmail.com',
          port: 993,
          user: 'user@gmail.com',
          password: 'gmailpassword',
          tls: true,
          allowUnauthorizedCerts: false,
          startTLSUsage: DEFAULT_STARTTLS_USAGE,
        };

        mockContext.getNodeParameter.mockReturnValue(CREDENTIALS_TYPE_CORE_IMAP_ACCOUNT);
        mockContext.getCredentials.mockResolvedValue(coreCredentials as any);

        // Act
        const result = await getImapCredentials(mockContext);

        // Assert
        expect(mockContext.getNodeParameter).toHaveBeenCalledWith('authentication', FIRST_NODE_INDEX);
        expect(mockContext.getCredentials).toHaveBeenCalledWith(credentialNames[CREDENTIALS_TYPE_CORE_IMAP_ACCOUNT]);
        expect(result).toEqual(expectedCredentials);
        expect(result.tls).toBe(true); // Verify mapping from 'secure' to 'tls'
      });

      it('should map secure field to tls field correctly when secure is false', async () => {
        // Arrange
        const coreCredentials = {
          host: 'imap.example.com',
          port: 143,
          user: 'user@example.com',
          password: 'password',
          secure: false,
          allowUnauthorizedCerts: true,
        };

        mockContext.getNodeParameter.mockReturnValue(CREDENTIALS_TYPE_CORE_IMAP_ACCOUNT);
        mockContext.getCredentials.mockResolvedValue(coreCredentials as any);

        // Act
        const result = await getImapCredentials(mockContext);

        // Assert
        expect(result.tls).toBe(false);
        expect(result.port).toBe(143);
        expect(result.allowUnauthorizedCerts).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should throw error for unsupported credentials type', async () => {
        // Arrange
        const unsupportedType = 'unsupportedCredentialType';
        mockContext.getNodeParameter.mockReturnValue(unsupportedType);

        // Act & Assert
        await expect(getImapCredentials(mockContext)).rejects.toThrow(
          `Unsupported credentials type: ${unsupportedType}`
        );
        expect(mockContext.getNodeParameter).toHaveBeenCalledWith('authentication', FIRST_NODE_INDEX);
      });

      it('should propagate errors from getCredentials', async () => {
        // Arrange
        const error = new Error('Failed to retrieve credentials');
        mockContext.getNodeParameter.mockReturnValue(CREDENTIALS_TYPE_THIS_NODE);
        mockContext.getCredentials.mockRejectedValue(error);

        // Act & Assert
        await expect(getImapCredentials(mockContext)).rejects.toThrow('Failed to retrieve credentials');
      });
    });

    describe('with ILoadOptionsFunctions context', () => {
      let mockLoadOptionsContext: jest.Mocked<ILoadOptionsFunctions>;

      beforeEach(() => {
        mockLoadOptionsContext = {
          getNodeParameter: jest.fn(),
          getCredentials: jest.fn(),
          logger: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        } as unknown as jest.Mocked<ILoadOptionsFunctions>;
      });

      it('should work with ILoadOptionsFunctions context', async () => {
        // Arrange
        const expectedCredentials: ImapCredentialsData = {
          host: 'imap.test.com',
          port: 993,
          user: 'load@test.com',
          password: 'loadpassword',
          tls: true,
          allowUnauthorizedCerts: false,
          startTLSUsage: DEFAULT_STARTTLS_USAGE,
        };

        mockLoadOptionsContext.getNodeParameter.mockReturnValue(CREDENTIALS_TYPE_THIS_NODE);
        mockLoadOptionsContext.getCredentials.mockResolvedValue(expectedCredentials as any);

        // Act
        const result = await getImapCredentials(mockLoadOptionsContext);

        // Assert
        expect(result).toEqual(expectedCredentials);
        expect(mockLoadOptionsContext.getNodeParameter).toHaveBeenCalledWith('authentication', FIRST_NODE_INDEX);
      });
    });

    describe('logging behavior', () => {
      it('should not log password in any log message', async () => {
        // Arrange
        const credentials: ImapCredentialsData = {
          host: 'imap.example.com',
          port: 993,
          user: 'user@example.com',
          password: 'secretpassword123',
          tls: true,
          allowUnauthorizedCerts: false,
          startTLSUsage: DEFAULT_STARTTLS_USAGE,
        };

        mockContext.getNodeParameter.mockReturnValue(CREDENTIALS_TYPE_THIS_NODE);
        mockContext.getCredentials.mockResolvedValue(credentials as any);

        // Act
        await getImapCredentials(mockContext);

        // Assert
        const loggerInfoMock = mockContext.logger.info as jest.Mock;
        const allLogCalls = loggerInfoMock.mock.calls.flat();
        allLogCalls.forEach((logMessage: string) => {
          expect(logMessage).not.toContain(credentials.password);
        });
      });
    });

    describe('different port configurations', () => {
      it('should handle standard SSL port (993)', async () => {
        // Arrange
        const credentials: ImapCredentialsData = {
          host: 'imap.example.com',
          port: 993,
          user: 'user@example.com',
          password: 'password',
          tls: true,
          allowUnauthorizedCerts: false,
          startTLSUsage: DEFAULT_STARTTLS_USAGE,
        };

        mockContext.getNodeParameter.mockReturnValue(CREDENTIALS_TYPE_THIS_NODE);
        mockContext.getCredentials.mockResolvedValue(credentials as any);

        // Act
        const result = await getImapCredentials(mockContext);

        // Assert
        expect(result.port).toBe(993);
        expect(result.tls).toBe(true);
      });

      it('should handle standard TLS port (143)', async () => {
        // Arrange
        const credentials: ImapCredentialsData = {
          host: 'imap.example.com',
          port: 143,
          user: 'user@example.com',
          password: 'password',
          tls: false,
          allowUnauthorizedCerts: false,
          startTLSUsage: DEFAULT_STARTTLS_USAGE,
        };

        mockContext.getNodeParameter.mockReturnValue(CREDENTIALS_TYPE_THIS_NODE);
        mockContext.getCredentials.mockResolvedValue(credentials as any);

        // Act
        const result = await getImapCredentials(mockContext);

        // Assert
        expect(result.port).toBe(143);
        expect(result.tls).toBe(false);
      });

      it('should handle custom port', async () => {
        // Arrange
        const credentials: ImapCredentialsData = {
          host: 'imap.example.com',
          port: 9993,
          user: 'user@example.com',
          password: 'password',
          tls: true,
          allowUnauthorizedCerts: false,
          startTLSUsage: DEFAULT_STARTTLS_USAGE,
        };

        mockContext.getNodeParameter.mockReturnValue(CREDENTIALS_TYPE_THIS_NODE);
        mockContext.getCredentials.mockResolvedValue(credentials as any);

        // Act
        const result = await getImapCredentials(mockContext);

        // Assert
        expect(result.port).toBe(9993);
      });
    });
  });
});
