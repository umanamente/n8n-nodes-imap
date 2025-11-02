import { ImapLoggerToN8nConverter } from "../../nodes/Imap/utils/ImapUtils";
import { ImapNodeDebugUtils, ImapNodeDebugParameters } from "../../nodes/Imap/utils/debug/ImapNodeDebugUtils";
import { DebugLoggerWatcher } from "../../nodes/Imap/utils/debug/DebugLoggerWatcher";
import { INodeExecutionData } from "n8n-workflow";

describe('ImapUtils', () => {

  describe('ImapLoggerToN8nConverter', () => {
    it('should handle n8nLogger is null', () => {
      const converter = new ImapLoggerToN8nConverter(true, undefined);

      expect(() => converter.info({ msg: 'info message' })).not.toThrow();
      expect(() => converter.debug({ msg: 'debug message' })).not.toThrow();
      expect(() => converter.error({ msg: 'error message' })).not.toThrow();
      expect(() => converter.warn({ msg: 'warn message' })).not.toThrow();

    });

    it('should log info and debug only if enableDebugLogs is true', () => {
      const mockLogger = {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      };

      const converterWithDebug = new ImapLoggerToN8nConverter(true, mockLogger);
      converterWithDebug.info({ msg: 'info message' });
      converterWithDebug.debug({ msg: 'debug message' });

      expect(mockLogger.info).toHaveBeenCalledWith('IMAP info: info message');
      expect(mockLogger.debug).toHaveBeenCalledWith('IMAP debug: debug message');
      mockLogger.info.mockClear();
      mockLogger.debug.mockClear();

      const converterWithoutDebug = new ImapLoggerToN8nConverter(false, mockLogger);
      converterWithoutDebug.info({ msg: 'info message' });
      converterWithoutDebug.debug({ msg: 'debug message' });
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();

    });

    it('should always log error and warn', () => {
      const mockLogger = {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      };

      const converter = new ImapLoggerToN8nConverter(false, mockLogger);;
      converter.error({ msg: 'error message' });
      converter.warn({ msg: 'warn message' });
      expect(mockLogger.error).toHaveBeenCalledWith('IMAP error: {"msg":"error message"}');
      expect(mockLogger.warn).toHaveBeenCalledWith('IMAP warning: {"msg":"warn message"}');
    });

  }); // end ImapLoggerToN8nConverter

  describe('AddNodeDebugOutputData', () => {
    beforeEach(() => {
      // Mock the environment variable to enable debug utils
      process.env.N8N_NODES_DEBUG_ENABLED = 'true';
    });

    afterEach(() => {
      // Clean up environment variable
      delete process.env.N8N_NODES_DEBUG_ENABLED;
    });

    it('should return early when parameters is null', () => {
      const outputBranches: INodeExecutionData[][] = [];
      const mockLogger = {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      };
      const loggerWatcher = new DebugLoggerWatcher(mockLogger);

      ImapNodeDebugUtils.AddNodeDebugOutputData(null as any, outputBranches, loggerWatcher);

      expect(outputBranches).toHaveLength(0);
    });

    it('should return early when parameters is undefined', () => {
      const outputBranches: INodeExecutionData[][] = [];
      const mockLogger = {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      };
      const loggerWatcher = new DebugLoggerWatcher(mockLogger);

      ImapNodeDebugUtils.AddNodeDebugOutputData(undefined, outputBranches, loggerWatcher);

      expect(outputBranches).toHaveLength(0);
    });

    it('should return early when outputBranches is null', () => {
      const parameters: ImapNodeDebugParameters = {
        debugOutputFormats: ['logAsText'],
        debugEnableDebugImapLogs: true,
      };
      const mockLogger = {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      };
      const loggerWatcher = new DebugLoggerWatcher(mockLogger);

      ImapNodeDebugUtils.AddNodeDebugOutputData(parameters, null as any, loggerWatcher);

      // Since outputBranches is null, we can't verify its length, but the function should return early
      expect(() => ImapNodeDebugUtils.AddNodeDebugOutputData(parameters, null as any, loggerWatcher)).not.toThrow();
    });

    it('should return early when outputBranches is undefined', () => {
      const parameters: ImapNodeDebugParameters = {
        debugOutputFormats: ['logAsText'],
        debugEnableDebugImapLogs: true,
      };
      const mockLogger = {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      };
      const loggerWatcher = new DebugLoggerWatcher(mockLogger);

      ImapNodeDebugUtils.AddNodeDebugOutputData(parameters, undefined, loggerWatcher);

      // Since outputBranches is undefined, we can't verify its length, but the function should return early
      expect(() => ImapNodeDebugUtils.AddNodeDebugOutputData(parameters, undefined, loggerWatcher)).not.toThrow();
    });

    it('should handle loggerWatcher is null for logAsText format', () => {
      const parameters: ImapNodeDebugParameters = {
        debugOutputFormats: ['logAsText'],
        debugEnableDebugImapLogs: true,
      };
      const outputBranches: INodeExecutionData[][] = [];

      ImapNodeDebugUtils.AddNodeDebugOutputData(parameters, outputBranches, null as any);

      expect(outputBranches).toHaveLength(1);
      expect(outputBranches[0]).toHaveLength(1);
      expect(outputBranches[0][0].json.logAsText).toBe('Error: loggerWatcher is undefined');
    });

    it('should handle loggerWatcher is null for logAsJson format', () => {
      const parameters: ImapNodeDebugParameters = {
        debugOutputFormats: ['logAsJson'],
        debugEnableDebugImapLogs: true,
      };
      const outputBranches: INodeExecutionData[][] = [];

      ImapNodeDebugUtils.AddNodeDebugOutputData(parameters, outputBranches, null as any);

      expect(outputBranches).toHaveLength(1);
      expect(outputBranches[0]).toHaveLength(1);
      expect(outputBranches[0][0].json.logAsJson).toBe('Error: loggerWatcher is undefined');
    });

    it('should handle loggerWatcher is undefined for both formats', () => {
      const parameters: ImapNodeDebugParameters = {
        debugOutputFormats: ['logAsText', 'logAsJson'],
        debugEnableDebugImapLogs: true,
      };
      const outputBranches: INodeExecutionData[][] = [];

      ImapNodeDebugUtils.AddNodeDebugOutputData(parameters, outputBranches, undefined);

      expect(outputBranches).toHaveLength(1);
      expect(outputBranches[0]).toHaveLength(1);
      expect(outputBranches[0][0].json.logAsText).toBe('Error: loggerWatcher is undefined');
      expect(outputBranches[0][0].json.logAsJson).toBe('Error: loggerWatcher is undefined');
    });

    it('should work correctly when loggerWatcher is provided', () => {
      const parameters: ImapNodeDebugParameters = {
        debugOutputFormats: ['logAsText', 'logAsJson'],
        debugEnableDebugImapLogs: true,
      };
      const outputBranches: INodeExecutionData[][] = [];
      const mockLogger = {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      };
      const loggerWatcher = new DebugLoggerWatcher(mockLogger);

      ImapNodeDebugUtils.AddNodeDebugOutputData(parameters, outputBranches, loggerWatcher);

      expect(outputBranches).toHaveLength(1);
      expect(outputBranches[0]).toHaveLength(1);
      expect(outputBranches[0][0].json.logAsText).toMatch(''); // Should be empty string since no logs were added
      expect(outputBranches[0][0].json.logAsJson).toEqual([]); // Should be empty array since no logs were added
    });

  }); // end AddNodeDebugOutputData

}); // end ImapUtils

