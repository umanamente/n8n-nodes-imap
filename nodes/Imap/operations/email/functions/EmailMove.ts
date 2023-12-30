import { CopyResponseObject, ImapFlow } from "imapflow";
import { IExecuteFunctions, INodeExecutionData, NodeApiError } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from '../../../utils/SearchFieldParameters';



const PARAM_NAME_SOURCE_MAILBOX = 'sourceMailbox';
const PARAM_NAME_DESTINATION_MAILBOX = 'destinationMailbox';

export const moveEmailOperation: IResourceOperationDef = {
  operation: {
    name: 'Move',
    value: 'moveEmail',
  },
  parameters: [
    {
      ...parameterSelectMailbox,
      description: 'Select the mailbox',
      name: PARAM_NAME_SOURCE_MAILBOX,
    },
    {
      displayName: 'Email UID',
      name: 'emailUid',
      type: 'string',
      default: '',
      description: 'UID of the email to move',
    },
    {
      ...parameterSelectMailbox,
      description: 'Select the destination mailbox',
      name: PARAM_NAME_DESTINATION_MAILBOX,
    },
  ],
  async executeImapAction(context: IExecuteFunctions, client: ImapFlow) {
    var returnData: INodeExecutionData[] = [];

    const sourceMailboxPath = getMailboxPathFromNodeParameter(context, PARAM_NAME_SOURCE_MAILBOX);
    const destinationMailboxPath = getMailboxPathFromNodeParameter(context, PARAM_NAME_DESTINATION_MAILBOX);

    const emailUid = context.getNodeParameter('emailUid', 0) as string;

    context.logger?.info(`Moving email "${emailUid}" from "${sourceMailboxPath}" to "${destinationMailboxPath}"`);

    await client.mailboxOpen(sourceMailboxPath, { readOnly: false });

    const resp : CopyResponseObject = await client.messageMove(emailUid, destinationMailboxPath, {
      uid: true,
    });

    if (!resp || !resp.uidMap) {
      throw new NodeApiError(context.getNode(), {}, {
        message: "Unable to move email, unknown error",
      });
    }

    var item_json = JSON.parse(JSON.stringify(resp));

    returnData.push({
      json: item_json,
    });

    client.close();
    return [returnData];
  },
};
