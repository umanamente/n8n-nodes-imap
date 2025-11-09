import { ImapFlow, ImapFlowOptions } from "imapflow";
import { ImapCredentialsData } from "../../../credentials/ImapCredentials.credentials";
import { INode, JsonValue, Logger as N8nLogger, NodeOperationError } from "n8n-workflow";


// interfaces for debug/info entries that ImapFlow logger provides
interface ImapLoggerEntryMessage {
  msg: string;
  cid?: string;
  src?: string;
  [key: string]: any;
};

// interface for error/warning entries that ImapFlow logger provides
interface ImapLoggerEntryError {
  err?: JsonValue;
  cid?: string;
  src?: string;
  [key: string]: any;
};

// a list of errors/warnings caught from ImapFlow while executing commands
export class ImapErrorsList {
  public caughtEntries: ImapLoggerEntryError[] = [];

  public addEntry(entry: ImapLoggerEntryError) {
    this.caughtEntries.push(entry);
  }

  public combineFullEntriesToString(): string {
    return JSON.stringify(this.caughtEntries, null, 2);
  }

  public toString(): string {
    if (this.caughtEntries.length === 0) {
      return "No additional details were provided by the IMAP server.";
    } else {
      return "The following errors were reported by the IMAP server: \n" + this.combineFullEntriesToString();
    }
  }

}


/* An error class that represents an error from the IMAP server
* It extends NodeOperationError and adds a description with the list of IMAP errors
* that were caught while executing the command that caused the error.
*/
export class NodeImapError extends NodeOperationError {
  constructor(node: INode, message: string, imapErrorsList: ImapErrorsList) {
    super(node, message, {
      description: imapErrorsList.toString(),
    });
  }
}

/**
 * A singleton class that catches all errors/warning from ImapFlow and provides a list of them on demand
 * 
 * @description This is needed because ImapFlow does not provide error details in thrown exceptions,
 * but only logs them internally while executing commands. So we need to catch them and provide them in case of an error.
 * Before executing any command that might fail, call `startErrorCatching()`, and if an exception is thrown, 
 * call `stopAndGetErrors()` to get the list of errors that happened during the command execution.
 * 
 */
export class ImapFlowErrorCatcher {
  private static instance: ImapFlowErrorCatcher;  
  private errorsList: ImapErrorsList = new ImapErrorsList();

  private isCatching = false;

  private constructor() {
    // private constructor
  }

  public static getInstance(): ImapFlowErrorCatcher {
    if (!ImapFlowErrorCatcher.instance) {
      ImapFlowErrorCatcher.instance = new ImapFlowErrorCatcher();
    }

    return ImapFlowErrorCatcher.instance;
  }

  private clear() {    
    this.errorsList = new ImapErrorsList();
  }

  public startErrorCatching() {
    // clear previous errors (assume that if we are catching errors, we don't need previous ones)
    this.clear();
    this.isCatching = true;
  }

  public stopAndGetErrorsList(): ImapErrorsList {
    this.isCatching = false;
    const ret_list = this.errorsList;
    this.clear();
    return ret_list;
  }

  public onImapError(error: object) {
    if (!this.isCatching) {
      return;
    }
    this.errorsList.addEntry(error as ImapLoggerEntryError);
  }

  public onImapWarning(warning: object) {
    if (!this.isCatching) {
      return;
    }
    this.errorsList.addEntry(warning as ImapLoggerEntryError);
  }

}

/* Converts ImapFlow logger entries to n8n logger entries and logs them
* Only logs info/debug entries if enableDebugLogs is true
*/
export class ImapLoggerToN8nConverter {
  private n8nLogger?: N8nLogger;
  private enableDebugLogs: boolean;
  constructor(enableDebugLogs: boolean, n8nLogger?: N8nLogger) {
    this.n8nLogger = n8nLogger;
    this.enableDebugLogs = enableDebugLogs;
  }

  public info(obj: object) {
    if (this.enableDebugLogs) {
      const entry = obj as ImapLoggerEntryMessage;
      if (!this.n8nLogger) {
        return;
      }
      this.n8nLogger.info(`IMAP info: ${entry.msg}`);
    }
  }

  public debug(obj: object) {
    if (this.enableDebugLogs) {
      const entry = obj as ImapLoggerEntryMessage;
      if (!this.n8nLogger) {
        return;
      }
      this.n8nLogger.debug(`IMAP debug: ${entry.msg}`);
    }
  }

  public error(obj: object) {
    const entry = obj as ImapLoggerEntryError;
    ImapFlowErrorCatcher.getInstance().onImapError(entry);
    if (!this.n8nLogger) {
      return;
    }
    // todo: check if entry has "err" key and other useful info
    this.n8nLogger.error(`IMAP error: ${JSON.stringify(entry)}`);
  }

  public warn(obj: object) {
    const entry = obj as ImapLoggerEntryError;
    ImapFlowErrorCatcher.getInstance().onImapWarning(entry);
    if (!this.n8nLogger) {
      return;
    }
    this.n8nLogger.warn(`IMAP warning: ${JSON.stringify(entry)}`);
  }
  
}


export function createImapClient(credentials: ImapCredentialsData, logger?: N8nLogger, enableDebugLogs: boolean = false): ImapFlow {
  const loggerConverter = new ImapLoggerToN8nConverter(enableDebugLogs, logger);

  let imapflowOptions: ImapFlowOptions = {
    host: credentials.host as string,
    port: credentials.port as number,
    secure: credentials.tls as boolean,
    tls: {
      rejectUnauthorized: !credentials.allowUnauthorizedCerts as boolean,
    },
    auth: {
      user: credentials.user as string,
      pass: credentials.password as string,
    },
    logger: loggerConverter,
  };

  if (!credentials.tls) {
    imapflowOptions = {
      ...imapflowOptions,
      doSTARTTLS: credentials.allowStartTLS,
    };
  }

  const client = new ImapFlow(imapflowOptions);
  return client;
}

