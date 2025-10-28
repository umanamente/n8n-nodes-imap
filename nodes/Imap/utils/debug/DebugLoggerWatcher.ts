import { LogLevel, LogMetadata, Logger as N8nLogger } from "n8n-workflow";
import { ImapNodeDebugUtils } from "./ImapNodeDebugUtils";


/**
 * Interface representing a single log entry
 */
interface LogEntry {
  type: LogLevel;
  message: string;
  origin: string;
  timestamp: Date;
  metadata?: LogMetadata;
}


export class DebugLoggerWatcher {
  private logger: N8nLogger;
  private logEntries: LogEntry[] = [];
  private enableCollection: boolean = true;

  constructor(logger: N8nLogger) {
    this.logger = logger;

    // check if log collection should be enabled based on environment variable
    if (ImapNodeDebugUtils.ImapNodeDebugUtilsEnabled()) {
      this.enableCollection = true;
    } else {
      this.enableCollection = false;
    }
  }

  addLog(entry: LogEntry): void {
    // only collect logs if enabled
    if (this.enableCollection) {
      this.logEntries.push(entry);
    }

    // log to n8n logger as well
    const logFunctionsMap: { [key in LogLevel]: (message: string, metadata?: LogMetadata) => void } = {
      debug: this.logger.debug,
      info: this.logger.info,
      warn: this.logger.warn,
      error: this.logger.error,
      silent: () => {},
    };

    const logFunction = logFunctionsMap[entry.type];
    logFunction.call(this.logger, entry.message, entry.metadata);
    
  }

  public getWatchedLogger(origin: string): N8nLogger {
    let watchedLogger = {} as N8nLogger;
    
    // Define log levels that exist on N8nLogger (excluding 'silent')
    const logLevels: Exclude<LogLevel, 'silent'>[] = ['debug', 'info', 'warn', 'error'];
    
    // Create wrapper methods for each log level
    logLevels.forEach(level => {
      watchedLogger[level] = (message: string, metadata?: LogMetadata) => {
        this.addLog({
          type: level,
          message,
          origin,
          timestamp: new Date(),
          metadata
        });
      };
    });
    
    return watchedLogger;
  }

  public getLogEntriesAsArray(): LogEntry[] {
    return this.logEntries;
  }

  public getLogEntriesAsText(): string {
    return this.logEntries.map(entry => {
      const timeString = entry.timestamp.toISOString();
      return `[${timeString}] [${entry.origin}] [${entry.type.toUpperCase()}] ${entry.message}`;
    }).join('\n');
  }
}