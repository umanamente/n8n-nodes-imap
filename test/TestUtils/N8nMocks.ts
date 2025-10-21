import { Logger as N8nLogger } from 'n8n-workflow';

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
