import { INodeProperties } from 'n8n-workflow';
import { createNodeParametersCheckerMock } from './N8nMocks';

describe('createNodeParametersCheckerMock', () => {
  const testProperties: INodeProperties[] = [
    {
      displayName: 'Test Parameter',
      name: 'testParam',
      type: 'string',
      default: '',
    },
    {
      displayName: 'Another Parameter',
      name: 'anotherParam',
      type: 'number',
      default: 0,
    },
  ];

  it('should allow access to valid parameter names', () => {
    // Arrange
    const mockContext = createNodeParametersCheckerMock(testProperties);
    mockContext.getNodeParameter!.mockReturnValue('test value');

    // Act
    const result = mockContext.getNodeParameter!('testParam', 0);

    // Assert
    expect(result).toBe('test value');
    expect(mockContext.getNodeParameter).toHaveBeenCalledWith('testParam', 0);
  });

  it('should throw error for invalid parameter names', () => {
    // Arrange
    const mockContext = createNodeParametersCheckerMock(testProperties);

    // Act & Assert
    expect(() => {
      mockContext.getNodeParameter!('invalidParam', 0);
    }).toThrow("Parameter 'invalidParam' not found in node properties");
  });

  it('should list available parameters in error message', () => {
    // Arrange
    const mockContext = createNodeParametersCheckerMock(testProperties);

    // Act & Assert
    expect(() => {
      mockContext.getNodeParameter!('invalidParam', 0);
    }).toThrow('Available parameters: testParam, anotherParam');
  });

  it('should allow multiple valid parameter calls', () => {
    // Arrange
    const mockContext = createNodeParametersCheckerMock(testProperties);
    mockContext.getNodeParameter!
      .mockReturnValueOnce('first value')
      .mockReturnValueOnce(123);

    // Act
    const result1 = mockContext.getNodeParameter!('testParam', 0);
    const result2 = mockContext.getNodeParameter!('anotherParam', 1);

    // Assert
    expect(result1).toBe('first value');
    expect(result2).toBe(123);
    expect(mockContext.getNodeParameter).toHaveBeenCalledTimes(2);
  });

  it('should work with custom values', () => {
    // Arrange
    const mockContext = createNodeParametersCheckerMock(testProperties, {
      testParam: 'custom value',
      anotherParam: (index: number) => index * 10,
    });
    
    // Act - valid parameter should work
    const result1 = mockContext.getNodeParameter!('testParam', 0);
    const result2 = mockContext.getNodeParameter!('anotherParam', 1);
    const result3 = mockContext.getNodeParameter!('anotherParam', 2);

    // Assert
    expect(result1).toBe('custom value');
    expect(result2).toBe(10);
    expect(result3).toBe(20);

    expect(() => {
      mockContext.getNodeParameter!('nonExistent', 0);
    }).toThrow();
  });

  it('should include logger in mock', () => {
    // Arrange
    const mockContext = createNodeParametersCheckerMock(testProperties);

    // Assert
    expect(mockContext.logger).toBeDefined();
    expect(mockContext.logger?.info).toBeDefined();
    expect(mockContext.logger?.warn).toBeDefined();
    expect(mockContext.logger?.error).toBeDefined();
    expect(mockContext.logger?.debug).toBeDefined();
  });

  it('should work with empty properties array', () => {
    // Arrange
    const mockContext = createNodeParametersCheckerMock([]);

    // Act & Assert
    expect(() => {
      mockContext.getNodeParameter!('anyParam', 0);
    }).toThrow("Parameter 'anyParam' not found in node properties");
  });
});
