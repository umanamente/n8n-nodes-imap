import { ICredentialTestFunctions, ICredentialsDecrypted, IExecuteFunctions, INodeCredentialTestResult, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { allResourceDefinitions } from './operations/ResourcesList';
import { getAllResourceNodeParameters } from './utils/CommonDefinitions';
import { IMAP_CREDENTIALS_NAME, ImapCredentialsData } from '../../credentials/ImapCredentials.credentials';
import { ImapFlowErrorCatcher, createImapClient } from './utils/ImapUtils';
import { NodeApiError } from 'n8n-workflow';
import { loadMailboxList } from './utils/SearchFieldParameters';


export class Imap implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'IMAP',
    name: 'imap',
    icon: 'file:node-imap-icon.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
    description: 'Retrieve emails via IMAP',
    defaults: {
      name: 'IMAP',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: IMAP_CREDENTIALS_NAME,
        required: true,
        // this function doesn't work in current version of n8n
        // testedBy: 'testImapCredentials',
      },
    ],
    properties: [
      // eslint-disable-next-line n8n-nodes-base/node-param-default-missing
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: allResourceDefinitions.map((resourceDef) => resourceDef.resource),
        default: allResourceDefinitions[0].resource.value,
      },

      // combine all parameters from all operations
      ...allResourceDefinitions.map((resourceDef) => getAllResourceNodeParameters(resourceDef)).flat(),

    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][] > {
    const credentials = await this.getCredentials(IMAP_CREDENTIALS_NAME) as unknown as ImapCredentialsData;

    // create imap client and connect
    const client = createImapClient(credentials, this.logger);

		try {
      await client.connect();
		} catch (error) {
			this.logger.error(`Connection failed: ${error.message}`);
			throw new NodeApiError(this.getNode(), {}, {
				message: error.responseText || error.message || 'Unknown error',
			});
		}

    // get node parameters
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    // run corresponding operation
    const handler = allResourceDefinitions.find((resourceDef) => resourceDef.resource.value === resource)?.operationDefs.find((operationDef) => operationDef.operation.value === operation);
		if (handler) {
      try {
				// some errors are not thrown but logged by ImapFlow internally, so we try to catch them
				ImapFlowErrorCatcher.getInstance().startErrorCatching();

        const result = await handler.executeImapAction(this, client);
        if (result) {
          return result;
        } else {
          this.logger.warn(`Operation "${operation}" for resource "${resource}" returned no data`);
          return [];
        }
      } catch (error) {
				if (error instanceof NodeApiError) {
					throw error;
				}

				const internalImapErrors = ImapFlowErrorCatcher.getInstance().stopAndGetErrors();
				const internalImapErrorsMessage = internalImapErrors.join(", \n");
				var errorMessage = error.responseText || error.message || undefined;
				if (!errorMessage) {
					if (internalImapErrorsMessage) {
						errorMessage = internalImapErrorsMessage;
					} else {
						errorMessage = 'Unknown error';
					}
				}
        this.logger.error(`Operation "${operation}" for resource "${resource}" failed: ${errorMessage}`);
        this.logger.error(JSON.stringify(error));
				var errorDetails : any = {
					message: errorMessage,
				};
				if (internalImapErrorsMessage) {
					errorDetails.description = "The following errors were reported by the IMAP server: \n" + internalImapErrorsMessage;
				}
        throw new NodeApiError(this.getNode(), {}, errorDetails);
      }
    } else {
      this.logger.error(`Unknown operation "${operation}" for resource "${resource}"`);
      throw new NodeApiError(this.getNode(), {}, {
        message: `Unknown operation "${operation}" for resource "${resource}"`,
      });
    }

    return [];
  };

  methods = {
    listSearch: {
      loadMailboxList: loadMailboxList,
    },
    credentialTest: {
      async testImapCredentials(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<INodeCredentialTestResult> {
        const credentials = credential.data as unknown as ImapCredentialsData;

        // create imap client and connect
        try {
          const client = createImapClient(credentials);
          await client.connect();
          client.close();
        } catch (error) {
          return {
            status: 'Error',
            message: error.message,
          };
        }
        return {
          status: 'OK',
          message: 'Success',
        };
      },
    },

  };

}

