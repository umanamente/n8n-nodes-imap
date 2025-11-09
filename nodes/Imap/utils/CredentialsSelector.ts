import { FunctionsBase, IExecuteFunctions, ILoadOptionsFunctions } from "n8n-workflow";
import { IMAP_CREDENTIALS_NAME, ImapCredentialsData } from "../../../credentials/ImapCredentials.credentials";


interface ImapCredentialsProvider {
  credentialsType: string;
  credentialsName: string;
  getImapCredentials: (context: FunctionsBase) => Promise<ImapCredentialsData>;
}

export const CREDENTIALS_TYPE_THIS_NODE = 'imapThisNode';
export const CREDENTIALS_TYPE_CORE_IMAP_ACCOUNT = 'coreImapAccount';
export const CREDENTIALS_TYPE_OAUTH2 = 'oauth2';

export const credentialNames = {
  [CREDENTIALS_TYPE_THIS_NODE]: IMAP_CREDENTIALS_NAME,
  [CREDENTIALS_TYPE_CORE_IMAP_ACCOUNT]: 'imap',
  [CREDENTIALS_TYPE_OAUTH2]: 'oAuth2Api',
};


const credentialsProviders: ImapCredentialsProvider[] = [
  {
    credentialsType: CREDENTIALS_TYPE_THIS_NODE,
    credentialsName: credentialNames[CREDENTIALS_TYPE_THIS_NODE],
    getImapCredentials: async function(context: FunctionsBase) {
      const credentials = await context.getCredentials(this.credentialsName) as unknown as ImapCredentialsData;
      return credentials;
    }
  },
  {
    credentialsType: CREDENTIALS_TYPE_CORE_IMAP_ACCOUNT,
    credentialsName: credentialNames[CREDENTIALS_TYPE_CORE_IMAP_ACCOUNT],
    getImapCredentials: async function(context: FunctionsBase) {
      const credentials = await context.getCredentials(this.credentialsName);
      var returnCredentials : ImapCredentialsData = {
        host: credentials.host as string,
        port: credentials.port as number,
        user: credentials.user as string,
        password: credentials.password as string,
        tls: credentials.secure as boolean,
        allowUnauthorizedCerts: credentials.allowUnauthorizedCerts as boolean,
        allowStartTLS: true,
      };
      return returnCredentials;
    }
  },
  /*{
    credentialsType: CREDENTIALS_TYPE_OAUTH2,
    credentialsName: credentialNames[CREDENTIALS_TYPE_OAUTH2],
    getImapCredentials: getOAuth2Credentials,
  },*/
];

export async function getImapCredentials(context: ILoadOptionsFunctions | IExecuteFunctions) : Promise<ImapCredentialsData> {
  const FIRST_NODE_INDEX = 0; // authentification is the same for all nodes
  const credentialsType = context.getNodeParameter('authentication', FIRST_NODE_INDEX) as string;
  const provider = credentialsProviders.find(provider => provider.credentialsType === credentialsType);
  if (!provider) {
    throw new Error(`Unsupported credentials type: ${credentialsType}`);
  }
  const credentials = await provider.getImapCredentials(context);
  context.logger.info(`Using credentials from ${provider.credentialsName}`);
  context.logger.info(`Host: ${credentials.host}:${credentials.port}`);
  context.logger.info(`User: ${credentials.user}`);
  return credentials;
}








