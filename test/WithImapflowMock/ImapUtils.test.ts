import { ILoadOptionsFunctions } from 'n8n-workflow';
import { MockImapServer } from '../TestUtils/ImapflowMock';
import { loadMailboxList } from '../../nodes/Imap/utils/SearchFieldParameters';
import { CREDENTIALS_TYPE_THIS_NODE } from '../../nodes/Imap/utils/CredentialsSelector';

describe('ImapUtils', () => {

  describe('loadMailboxList', () => {
    it('should return list of mailboxes', async () => {
      // Arrange
      const credentials = MockImapServer.getValidCredentials();

      const mockLoadOptionsContext = {
        getNodeParameter: jest.fn().mockReturnValue(CREDENTIALS_TYPE_THIS_NODE),
        getCredentials: jest.fn().mockResolvedValue(credentials),
        logger: {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          debug: jest.fn(),
        },
      } as unknown as jest.Mocked<ILoadOptionsFunctions>;

      // Act
      const result = await loadMailboxList.call(mockLoadOptionsContext);

      // Assert
      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(1);
      expect(result.results).toEqual([
        {
          name: 'INBOX',
          value: 'INBOX',
        },
      ]);
      expect(mockLoadOptionsContext.getCredentials).toHaveBeenCalled();
    });
  });
});
