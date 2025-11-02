import { ImapLoggerToN8nConverter } from "../../nodes/Imap/utils/ImapUtils";

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

}); // end ImapUtils

