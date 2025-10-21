import { IExecuteFunctions } from 'n8n-workflow';
import { SearchObject } from 'imapflow';
import {
  emailSearchParameters,
  getEmailSearchParametersFromNode,
} from '../nodes/Imap/utils/EmailSearchParameters';

describe('EmailSearchParameters', () => {
  describe('emailSearchParameters structure', () => {
    it('should export emailSearchParameters array', () => {
      expect(emailSearchParameters).toBeDefined();
      expect(Array.isArray(emailSearchParameters)).toBe(true);
    });

    it('should have 3 main parameter groups', () => {
      expect(emailSearchParameters).toHaveLength(3);
    });

    it('should have emailDateRange parameter', () => {
      const dateRangeParam = emailSearchParameters.find(p => p.name === 'emailDateRange');
      expect(dateRangeParam).toBeDefined();
      expect(dateRangeParam?.type).toBe('collection');
      expect(dateRangeParam?.options).toHaveLength(2);
    });

    it('should have emailFlags parameter', () => {
      const flagsParam = emailSearchParameters.find(p => p.name === 'emailFlags');
      expect(flagsParam).toBeDefined();
      expect(flagsParam?.type).toBe('collection');
      expect(flagsParam?.options).toHaveLength(6);
    });

    it('should have emailSearchFilters parameter', () => {
      const filtersParam = emailSearchParameters.find(p => p.name === 'emailSearchFilters');
      expect(filtersParam).toBeDefined();
      expect(filtersParam?.type).toBe('collection');
      expect(filtersParam?.options).toHaveLength(7);
    });
  });

  describe('getEmailSearchParametersFromNode', () => {
    let mockContext: jest.Mocked<IExecuteFunctions>;
    const ITEM_INDEX = 0;

    // Helper to extract all valid parameter names from emailSearchParameters
    const getValidParameterNames = (): Set<string> => {
      const paramNames = new Set<string>();
      emailSearchParameters.forEach(param => {
        paramNames.add(param.name);
      });
      return paramNames;
    };

    beforeEach(() => {
      // Create a mock context
      mockContext = {
        getNodeParameter: jest.fn(),
      } as unknown as jest.Mocked<IExecuteFunctions>;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('parameter name validation', () => {
      it('should only call getNodeParameter with names that exist in emailSearchParameters', () => {
        // Arrange
        const validParamNames = getValidParameterNames();
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          // Validate that the parameter name exists in emailSearchParameters
          expect(validParamNames.has(paramName)).toBe(true);
          return {};
        });

        // Act
        getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(mockContext.getNodeParameter).toHaveBeenCalledTimes(3);
        expect(mockContext.getNodeParameter).toHaveBeenCalledWith('emailDateRange', ITEM_INDEX);
        expect(mockContext.getNodeParameter).toHaveBeenCalledWith('emailFlags', ITEM_INDEX);
        expect(mockContext.getNodeParameter).toHaveBeenCalledWith('emailSearchFilters', ITEM_INDEX);
      });
    });

    describe('date range parameters', () => {
      it('should return empty search object when no date range is provided', () => {
        // Arrange
        mockContext.getNodeParameter.mockReturnValue({});

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.since).toBeUndefined();
        expect(result.before).toBeUndefined();
      });

      it('should set since date when provided', () => {
        // Arrange
        const sinceDate = '2024-01-01T00:00:00.000Z';
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailDateRange') {
            return { since: sinceDate };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.since).toEqual(new Date(sinceDate));
        expect(result.before).toBeUndefined();
      });

      it('should set before date when provided', () => {
        // Arrange
        const beforeDate = '2024-12-31T23:59:59.000Z';
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailDateRange') {
            return { before: beforeDate };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.before).toEqual(new Date(beforeDate));
        expect(result.since).toBeUndefined();
      });

      it('should set both since and before dates when provided', () => {
        // Arrange
        const sinceDate = '2024-01-01T00:00:00.000Z';
        const beforeDate = '2024-12-31T23:59:59.000Z';
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailDateRange') {
            return { since: sinceDate, before: beforeDate };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.since).toEqual(new Date(sinceDate));
        expect(result.before).toEqual(new Date(beforeDate));
      });

      it('should ignore empty string date values', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailDateRange') {
            return { since: '', before: '' };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.since).toBeUndefined();
        expect(result.before).toBeUndefined();
      });
    });

    describe('flag parameters', () => {
      it('should set answered flag when provided', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailFlags') {
            return { answered: true };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.answered).toBe(true);
      });

      it('should set deleted flag when provided', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailFlags') {
            return { deleted: false };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.deleted).toBe(false);
      });

      it('should set draft flag when provided', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailFlags') {
            return { draft: true };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.draft).toBe(true);
      });

      it('should set flagged flag when provided', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailFlags') {
            return { flagged: false };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.flagged).toBe(false);
      });

      it('should set recent flag to true and not set old when recent is true', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailFlags') {
            return { recent: true };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.recent).toBe(true);
        expect(result.old).toBeUndefined();
      });

      it('should set old flag to true when recent is false', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailFlags') {
            return { recent: false };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.old).toBe(true);
        expect(result.recent).toBeUndefined();
      });

      it('should set seen flag when provided', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailFlags') {
            return { seen: true };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.seen).toBe(true);
      });

      it('should handle multiple flags at once', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailFlags') {
            return {
              answered: true,
              deleted: false,
              draft: false,
              flagged: true,
              recent: false,
              seen: true,
            };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.answered).toBe(true);
        expect(result.deleted).toBe(false);
        expect(result.draft).toBe(false);
        expect(result.flagged).toBe(true);
        expect(result.old).toBe(true);
        expect(result.recent).toBeUndefined();
        expect(result.seen).toBe(true);
      });

      it('should not set flags when not provided in emailFlags object', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailFlags') {
            return {};
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.answered).toBeUndefined();
        expect(result.deleted).toBeUndefined();
        expect(result.draft).toBeUndefined();
        expect(result.flagged).toBeUndefined();
        expect(result.recent).toBeUndefined();
        expect(result.old).toBeUndefined();
        expect(result.seen).toBeUndefined();
      });
    });

    describe('search filter parameters', () => {
      it('should set bcc filter when provided', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailSearchFilters') {
            return { bcc: 'bcc@example.com' };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.bcc).toBe('bcc@example.com');
      });

      it('should set cc filter when provided', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailSearchFilters') {
            return { cc: 'cc@example.com' };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.cc).toBe('cc@example.com');
      });

      it('should set from filter when provided', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailSearchFilters') {
            return { from: 'sender@example.com' };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.from).toBe('sender@example.com');
      });

      it('should set subject filter when provided', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailSearchFilters') {
            return { subject: 'Test Subject' };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.subject).toBe('Test Subject');
      });

      it('should map text filter to body in search object', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailSearchFilters') {
            return { text: 'search text content' };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.body).toBe('search text content');
      });

      it('should set to filter when provided', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailSearchFilters') {
            return { to: 'recipient@example.com' };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.to).toBe('recipient@example.com');
      });

      it('should set uid filter when provided', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailSearchFilters') {
            return { uid: '1,2,3,4,5' };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.uid).toBe('1,2,3,4,5');
      });

      it('should handle multiple search filters at once', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailSearchFilters') {
            return {
              bcc: 'bcc@example.com',
              cc: 'cc@example.com',
              from: 'sender@example.com',
              subject: 'Test Subject',
              text: 'search content',
              to: 'recipient@example.com',
              uid: '1,2,3',
            };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.bcc).toBe('bcc@example.com');
        expect(result.cc).toBe('cc@example.com');
        expect(result.from).toBe('sender@example.com');
        expect(result.subject).toBe('Test Subject');
        expect(result.body).toBe('search content');
        expect(result.to).toBe('recipient@example.com');
        expect(result.uid).toBe('1,2,3');
      });

      it('should not set filters when not provided in emailSearchFilters object', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailSearchFilters') {
            return {};
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.bcc).toBeUndefined();
        expect(result.cc).toBeUndefined();
        expect(result.from).toBeUndefined();
        expect(result.subject).toBeUndefined();
        expect(result.body).toBeUndefined();
        expect(result.to).toBeUndefined();
        expect(result.uid).toBeUndefined();
      });
    });

    describe('combined parameters', () => {
      it('should handle all parameter types combined', () => {
        // Arrange
        const sinceDate = '2024-01-01T00:00:00.000Z';
        const beforeDate = '2024-12-31T23:59:59.000Z';
        
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailDateRange') {
            return { since: sinceDate, before: beforeDate };
          }
          if (paramName === 'emailFlags') {
            return {
              answered: true,
              seen: false,
              recent: true,
            };
          }
          if (paramName === 'emailSearchFilters') {
            return {
              from: 'sender@example.com',
              subject: 'Important',
              text: 'urgent',
            };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        // Date range
        expect(result.since).toEqual(new Date(sinceDate));
        expect(result.before).toEqual(new Date(beforeDate));
        
        // Flags
        expect(result.answered).toBe(true);
        expect(result.seen).toBe(false);
        expect(result.recent).toBe(true);
        
        // Filters
        expect(result.from).toBe('sender@example.com');
        expect(result.subject).toBe('Important');
        expect(result.body).toBe('urgent');
      });

      it('should return minimal search object when no parameters are provided', () => {
        // Arrange
        mockContext.getNodeParameter.mockReturnValue({});

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result).toEqual({});
      });
    });

    describe('item index handling', () => {
      it('should use the provided item index when calling getNodeParameter', () => {
        // Arrange
        const customIndex = 5;
        mockContext.getNodeParameter.mockReturnValue({});

        // Act
        getEmailSearchParametersFromNode(mockContext, customIndex);

        // Assert
        expect(mockContext.getNodeParameter).toHaveBeenCalledWith('emailDateRange', customIndex);
        expect(mockContext.getNodeParameter).toHaveBeenCalledWith('emailFlags', customIndex);
        expect(mockContext.getNodeParameter).toHaveBeenCalledWith('emailSearchFilters', customIndex);
      });
    });

    describe('edge cases', () => {
      it('should handle partial flag objects', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailFlags') {
            return { answered: true }; // Only one flag set
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.answered).toBe(true);
        expect(result.deleted).toBeUndefined();
        expect(result.draft).toBeUndefined();
      });

      it('should handle partial search filter objects', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailSearchFilters') {
            return { from: 'test@example.com' }; // Only one filter set
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.from).toBe('test@example.com');
        expect(result.to).toBeUndefined();
        expect(result.subject).toBeUndefined();
      });

      it('should handle empty string values in filters', () => {
        // Arrange
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailSearchFilters') {
            return { from: '', to: '' };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        // Empty strings should still be set (IMAP flow handles them)
        expect(result.from).toBe('');
        expect(result.to).toBe('');
      });
    });

    describe('type safety', () => {
      it('should return a valid SearchObject type', () => {
        // Arrange
        mockContext.getNodeParameter.mockReturnValue({});

        // Act
        const result: SearchObject = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(typeof result).toBe('object');
      });

      it('should handle date conversions correctly', () => {
        // Arrange
        const validDateString = '2024-06-15T12:30:00.000Z';
        mockContext.getNodeParameter.mockImplementation((paramName: string) => {
          if (paramName === 'emailDateRange') {
            return { since: validDateString };
          }
          return {};
        });

        // Act
        const result = getEmailSearchParametersFromNode(mockContext, ITEM_INDEX);

        // Assert
        expect(result.since).toBeInstanceOf(Date);
        expect((result.since as Date).toISOString()).toBe(validDateString);
      });
    });
  });
});
