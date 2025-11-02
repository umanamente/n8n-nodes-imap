import { ICredentialTestFunctions, ICredentialsDecrypted, IExecuteFunctions, INodeCredentialTestResult, INodeExecutionData, INodeType, INodeTypeDescription, Logger as N8nLogger, NodeConnectionTypes } from 'n8n-workflow';
import { allResourceDefinitions } from './operations/ResourcesList';
import { getAllResourceNodeParameters, IResourceOperationDef } from './utils/CommonDefinitions';
import { ImapCredentialsData } from '../../credentials/ImapCredentials.credentials';
import { ImapFlowErrorCatcher, NodeImapError, createImapClient } from './utils/ImapUtils';
import { NodeApiError } from 'n8n-workflow';
import { loadMailboxList } from './utils/SearchFieldParameters';
import { CREDENTIALS_TYPE_CORE_IMAP_ACCOUNT, CREDENTIALS_TYPE_THIS_NODE, credentialNames, getImapCredentials } from './utils/CredentialsSelector';
import { ImapNodeDebugParameters, ImapNodeDebugUtils } from './utils/debug/ImapNodeDebugUtils';
import { DebugLoggerWatcher } from './utils/debug/DebugLoggerWatcher';
import { ImapFlow } from 'imapflow';


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
    inputs: [NodeConnectionTypes.Main],
    // eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
    outputs: [
      NodeConnectionTypes.Main,
      // add debug output if enabled
      ...ImapNodeDebugUtils.GetDebugNodeOutputProperties(),
    ],
    credentials: [
      // using credentials from Core IMAP Trigger node
      {
        name: credentialNames[CREDENTIALS_TYPE_CORE_IMAP_ACCOUNT],
        required: true,
        displayOptions: {
          show: {
            authentication: [
              CREDENTIALS_TYPE_CORE_IMAP_ACCOUNT,
            ],
          },
        },
      },
      // using credentials from this node
      {
        name: credentialNames[CREDENTIALS_TYPE_THIS_NODE],
        required: true,
        testedBy: 'testImapCredentials',
        displayOptions: {
          show: {
            authentication: [
              CREDENTIALS_TYPE_THIS_NODE,
            ],
          },
        },
      },
      // TODO: using OAuth2
      /*{
        name: credentialNames[CREDENTIALS_TYPE_OAUTH2],
        required: true,
        displayOptions: {
          show: {
            authentication: [
              CREDENTIALS_TYPE_OAUTH2,
            ],
          },
        },
      },*/
    ],
    properties: [
      // credential type
      {
        displayName: 'Credential Type',
        name: 'authentication',
        type: 'options',
        // eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-options
        default: CREDENTIALS_TYPE_THIS_NODE,
        options: [
          {
            // eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
            name: 'IMAP',
            value: CREDENTIALS_TYPE_THIS_NODE,
            description: 'Use credentials from this node',
          },
          {
            // eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
            name: 'N8N IMAP Trigger Node',
            value: CREDENTIALS_TYPE_CORE_IMAP_ACCOUNT,
            description: 'Use existing credentials from N8N IMAP Trigger node',
          },
          /*{
            name: 'OAuth2',
            value: CREDENTIALS_TYPE_OAUTH2,
            description: 'Use OAuth2 authentication',
          },*/
        ],
      },

      // add debug options if enabled
      ...ImapNodeDebugUtils.GetDebugNodeProperties(),

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
    const credentials = await getImapCredentials(this);

    // get debug parameters
    const debugParameters = ImapNodeDebugUtils.GetDebugSettingsFromNode(this);

    const loggerWatcher = new DebugLoggerWatcher(this.logger);
    const imapflowLogger = loggerWatcher.getWatchedLogger('imapflow');
    const nodeLogger = loggerWatcher.getWatchedLogger('node');    

    // get operation parameters
    const FIRST_ITEM_INDEX = 0; // resource and operation are the same for all items
    const resource = this.getNodeParameter('resource', FIRST_ITEM_INDEX) as string;
    const operation = this.getNodeParameter('operation', FIRST_ITEM_INDEX) as string;

    // run corresponding operation
    const handler = allResourceDefinitions.find((resourceDef) => resourceDef.resource.value === resource)?.operationDefs.find((operationDef) => operationDef.operation.value === operation);

    if (!handler) {
      nodeLogger.error(`Unknown operation "${operation}" for resource "${resource}"`);
      throw new NodeApiError(this.getNode(), {}, {
        message: `Unknown operation "${operation}" for resource "${resource}"`,
      });
    }

    nodeLogger.info(`Executing operation "${operation}" for resource "${resource}"`);

    // create imap client and connect
    const N8N_LOG_LEVEL = process.env.N8N_LOG_LEVEL || 'info';
    const ENABLE_DEBUG_LOGGING = (N8N_LOG_LEVEL === 'debug');
    const client = createImapClient(credentials, imapflowLogger, ENABLE_DEBUG_LOGGING);

    return await executeWithHandler(this, client, handler, nodeLogger, debugParameters, loggerWatcher);
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
          client.logout();
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

};


export async function executeWithHandler(
  context: IExecuteFunctions, 
  client: ImapFlow, 
  handler: IResourceOperationDef,
  nodeLogger: N8nLogger,
  debugParameters: ImapNodeDebugParameters,
  loggerWatcher: DebugLoggerWatcher
): Promise<INodeExecutionData[][] > {



    var resultBranches: INodeExecutionData[][] = [];
    var resultItems: INodeExecutionData[] = [];
    resultBranches.push(resultItems);

    let caughtError: Error | null = null;

    // catch all errors
    try {

      try {
        await client.connect();
      } catch (error) {
        nodeLogger.error(`Connection failed: ${error.message}`);
        throw new NodeApiError(context.getNode(), {}, {
          message: error.responseText || error.message || 'Unknown error',
        });
      }

      // try/catch to close connection in any case
      try {

        // running operation in a loop for each input item
        const items = context.getInputData();

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
          try { // catch errors and skip them if "continue on fail" is enabled

            try { // for each item
              // some errors are not thrown but logged by ImapFlow internally, so we try to catch them
              ImapFlowErrorCatcher.getInstance().startErrorCatching();

              const result = await handler.executeImapAction(context, nodeLogger, itemIndex, client);
              if (result?.length) {
                for (const outputItem of result) {
                  // add pairedItem 
                  outputItem.pairedItem = {
                    item: itemIndex,
                  };
                  resultItems.push(outputItem);
                }
              } else {
                nodeLogger.warn(`Operation returned no data`);
              }
            } catch (error) {
              const imapErrorsList = ImapFlowErrorCatcher.getInstance().stopAndGetErrorsList();
              const internalImapErrorsMessage = imapErrorsList.toString();

              if (imapErrorsList.caughtEntries.length > 0) {
                nodeLogger.error(internalImapErrorsMessage);
              }

              if (error instanceof NodeApiError) {
                // don't include internal IMAP errors, because the error message is already composed by the handler
                throw error;
              }

              // seems to be unknown error, check IMAP internal errors and include them in the error message

              nodeLogger.error(`Caught error: ${JSON.stringify(error)}`);

              var errorMessage = error.responseText || error.message || 'Unknown error';

              nodeLogger.error(`Operation failed`);
              

              throw new NodeImapError(context.getNode(), errorMessage, imapErrorsList);
            }
          } catch (error) {
            // check if continueOnFail is set
            if (context.continueOnFail()) {
              // don't throw error, return error data for the item
              resultItems.push({
                json: {
                  error: error.message,
                },
                error: error,
                pairedItem: {
                  item: itemIndex,
                },
              });
            } else {
              throw error;
            }
          }
        } 

        // close connection
        client.logout();
        nodeLogger.info('IMAP connection closed');

      } catch (error) {
        // close connection and rethrow error
        client.logout();
        nodeLogger.error(`IMAP connection closed. Error: ${error.message}`);
        throw error;
      }

    } catch (error) {
      // if debugging enabled, add debug output data instead of throwing error
      nodeLogger.error(`Node execution failed: ${error.message}`);
      if (!ImapNodeDebugUtils.ImapNodeDebugUtilsEnabled()) {
        throw error;
      } else {
        // don't throw error, return debug output with error details
        caughtError = error;
      }
    }

    // add debug output data if enabled
    ImapNodeDebugUtils.AddNodeDebugOutputData(debugParameters, resultBranches, loggerWatcher, caughtError);

    return resultBranches;
  }



