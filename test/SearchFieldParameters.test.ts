import { IExecuteFunctions } from 'n8n-workflow';
import { getMailboxPathFromNodeParameter } from '../nodes/Imap/utils/SearchFieldParameters';

describe('SearchFieldParameters', () => {
  describe('getMailboxPathFromNodeParameter', () => {
    let mockContext: jest.Mocked<IExecuteFunctions>;
    const ITEM_INDEX = 0;
    const DEFAULT_PARAM_NAME = 'mailboxPath';

    beforeEach(() => {
      // Create a mock context
      mockContext = {
        getNodeParameter: jest.fn(),
      } as unknown as jest.Mocked<IExecuteFunctions>;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('edge cases', () => {
      it('should return empty string when mailboxPathObj is empty (undefined)', () => {
        // Arrange
        mockContext.getNodeParameter.mockReturnValue(undefined);

        // Act
        const result = getMailboxPathFromNodeParameter(mockContext, ITEM_INDEX, DEFAULT_PARAM_NAME);

        // Assert
        expect(result).toBe('');
        expect(mockContext.getNodeParameter).toHaveBeenCalledWith(DEFAULT_PARAM_NAME, ITEM_INDEX);
      });

      it('should return empty string when mailboxPathObj exists but does not have value property', () => {
        // Arrange
        mockContext.getNodeParameter.mockReturnValue({ mode: 'list' });

        // Act
        const result = getMailboxPathFromNodeParameter(mockContext, ITEM_INDEX, DEFAULT_PARAM_NAME);

        // Assert
        expect(result).toBe('');
        expect(mockContext.getNodeParameter).toHaveBeenCalledWith(DEFAULT_PARAM_NAME, ITEM_INDEX);
      });
    });
  });
});
