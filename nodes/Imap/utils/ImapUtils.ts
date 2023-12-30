import { ImapFlow } from "imapflow";
import { ImapCredentialsData } from "../../../credentials/ImapCredentials.credentials";

export function createImapClient(credentials: ImapCredentialsData): ImapFlow {
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
      error: console.error,
      warn: console.warn,
    },
  });
  return client;
}

