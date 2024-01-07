import { ImapFlow } from "imapflow";
import { ImapCredentialsData } from "../../../credentials/ImapCredentials.credentials";
import { Logger } from "n8n-workflow";

/**
 * A singleton class that catches all errors/warning from ImapFlow and provides a list of them on demand
 */
export class ImapFlowErrorCatcher {
	private static instance: ImapFlowErrorCatcher;
	private messages: string[] = [];

	private isCatching = false;
	private catchWarnings = true;

	private constructor() {
		// private constructor
	}

	public static getInstance(): ImapFlowErrorCatcher {
		if (!ImapFlowErrorCatcher.instance) {
			ImapFlowErrorCatcher.instance = new ImapFlowErrorCatcher();
		}

		return ImapFlowErrorCatcher.instance;
	}

	private getMessageFromImapError(error: any): string {
		if (!error) {
			return 'Unknown IMAP error';
		}
		if (error.err) {
			return error.err.responseText || error.err.message || JSON.stringify(error);
		}
		if (error.message) {
			return error.message;
		}
		return JSON.stringify(error);
	}

	public startErrorCatching(catchWarnings: boolean = true) {
		// clear previous errors (assume that if we are catching errors, we don't need previous ones)
		this.messages = [];
		this.catchWarnings = catchWarnings;
		this.isCatching = true;
	}

	public stopAndGetErrors(): string[] {
		this.isCatching = false;
		const ret_list = this.messages;
		this.messages = [];
		return ret_list;
	}

	public onImapError(error: object) {
		if (!this.isCatching) {
			return;
		}
		this.messages.push(this.getMessageFromImapError(error));
	}

	public onImapWarning(warning: object) {
		if (!this.isCatching) {
			return;
		}
		if (!this.catchWarnings) {
			return;
		}
		this.messages.push(this.getMessageFromImapError(warning));
	}

}

export function createImapClient(credentials: ImapCredentialsData, logger?: Logger): ImapFlow {
  const client = new ImapFlow({
    host: credentials!.host as string,
    port: credentials!.port as number,
    secure: credentials!.tls as boolean,
    tls: {
      rejectUnauthorized: !credentials!.allowUnauthorizedCerts as boolean,
    },
    auth: {
      user: credentials!.user as string,
      pass: credentials!.password as string,
    },
    logger: {
      info: () => void 0,
      debug: () => void 0,
      error: (error) => {
				ImapFlowErrorCatcher.getInstance().onImapError(error);
				if (logger) {
					logger.error(`IMAP error: ${JSON.stringify(error)}`);
				}
			},
      warn: (warning) => {
				ImapFlowErrorCatcher.getInstance().onImapWarning(warning);
				if (logger) {
					logger.warn(`IMAP warning: ${JSON.stringify(warning)}`);
				}
			}
    },
  });
  return client;
}

