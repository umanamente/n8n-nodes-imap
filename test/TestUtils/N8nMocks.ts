import { Logger as N8nLogger, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { ImapNodeDebugParameters, ImapNodeDebugUtils } from '../../nodes/Imap/utils/debug/ImapNodeDebugUtils';

/**
 * Creates a mock N8n logger for testing purposes.
 * 
 * @param logInfo - Whether to output info messages to console (default: false)
 * @param logWarn - Whether to output warn messages to console (default: true)
 * @param logError - Whether to output error messages to console (default: true)
 * @param logDebug - Whether to output debug messages to console (default: false)
 * @returns A mocked N8n Logger instance
 */
export const createMockLogger = (
  logInfo = false,
  logWarn = true,
  logError = true,
  logDebug = false
): jest.Mocked<N8nLogger> => ({
  info: jest.fn((...args) => {
    if (logInfo) console.log('[INFO]', ...args);
  }),
  warn: jest.fn((...args) => {
    if (logWarn) console.warn('[WARN]', ...args);
  }),
  error: jest.fn((...args) => {
    if (logError) console.error('[ERROR]', ...args);
  }),
  debug: jest.fn((...args) => {
    if (logDebug) console.log('[DEBUG]', ...args);
  }),
} as jest.Mocked<N8nLogger>);

/**
 * Creates a mock IExecuteFunctions with a getNodeParameter function that validates
 * parameter names against a provided list of INodeProperties.
 * 
 * @param properties - Array of INodeProperties to validate parameter names against
 * @returns A partial mocked IExecuteFunctions with getNodeParameter validation
 * @throws Error if a parameter name is requested that doesn't exist in the properties array
 * 
 * @example
 * const properties: INodeProperties[] = [
 *   { name: 'myParam', displayName: 'My Param', type: 'string', default: '' }
 * ];
 * const mockContext = createNodeParametersCheckerMock(properties);
 * 
 * // This will work:
 * mockContext.getNodeParameter.mockReturnValue('some value');
 * mockContext.getNodeParameter('myParam', 0);
 * 
 * // This will throw an error:
 * mockContext.getNodeParameter('nonExistentParam', 0); // Error: Parameter 'nonExistentParam' not found
 */
export const createNodeParametersCheckerMock = (
  properties: INodeProperties[],
  mockValues: Record<string, any> = {},
  continueOnFail: boolean = false,
): Partial<jest.Mocked<IExecuteFunctions>> => {
  // always include debug parameters if debug utils are enabled
  const debugParameterNames = ImapNodeDebugUtils.GetDebugNodeProperties().map(prop => prop.name);
  const mockDebugValues: ImapNodeDebugParameters|{} =  ImapNodeDebugUtils.ImapNodeDebugUtilsEnabled() ? {
    debugOutputFormats: ['logAsText', 'logAsJson'],
    debugEnableDebugImapLogs: false,
  } : {};

  const parameterNames = new Set(properties.map(prop => prop.name));

  const allParameterNames = new Set([...parameterNames, ...debugParameterNames]);

  const allValues: Record<string, any> = { ...mockValues, ...mockDebugValues };
  
  const getNodeParameterMock = jest.fn((parameterName: string, itemIndex: number) => {
    if (!allParameterNames.has(parameterName)) {
      throw new Error(
        `Parameter '${parameterName}' not found in node properties. ` +
        `Available parameters: ${Array.from(allParameterNames).join(', ')}`
      );
    }
    // if a mock value is provided for this parameter, return it
    if (parameterName in allValues) {
      const value = allValues[parameterName];
      if (typeof value === 'function') {
        return value(itemIndex);
      }
      return value;
    }
    // throw error if no mock value is provided
    throw new Error(`No mock value provided for parameter '${parameterName}'`);
  }) as any;
  
  const getNodeMock = jest.fn().mockReturnValue({
    name: 'Imap Test Node',
  });

  return {
    getNodeParameter: getNodeParameterMock,
    logger: createMockLogger(false, false, false, false),
    getNode: getNodeMock,
    continueOnFail: jest.fn(() => continueOnFail),
    helpers: {
        prepareBinaryData: jest.fn().mockImplementation((data: Buffer, filename: string) => {
          return {
            data,
            fileName: filename,
            mimeType: 'application/octet-stream',
          };
        }),
    } as any,
  };
};



