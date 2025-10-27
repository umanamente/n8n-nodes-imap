import { ImapFlow } from "imapflow";
import { IExecuteFunctions, INodeExecutionData } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from '../../../utils/SearchFieldParameters';
import { ImapFlowErrorCatcher, NodeImapError } from "../../../utils/ImapUtils";



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
      displayName: 'Source Mailbox',
      description: 'Select the source mailbox',
      name: PARAM_NAME_SOURCE_MAILBOX,
    },
    {
      displayName: 'Email UID',
      name: 'emailUid',
      type: 'string',
      default: '',
      description: 'UID of the email to move',
      hint: 'You can use comma separated list of UIDs to move multiple emails at once',
    },
    {
      ...parameterSelectMailbox,
      displayName: 'Destination Mailbox',
      description: 'Select the destination mailbox',
      name: PARAM_NAME_DESTINATION_MAILBOX,
    },
  ],
  async executeImapAction(context: IExecuteFunctions, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    var returnData: INodeExecutionData[] = [];

    const sourceMailboxPath = getMailboxPathFromNodeParameter(context, itemIndex, PARAM_NAME_SOURCE_MAILBOX);
    const destinationMailboxPath = getMailboxPathFromNodeParameter(context, itemIndex, PARAM_NAME_DESTINATION_MAILBOX);

    const emailUid = context.getNodeParameter('emailUid', itemIndex) as string;

    context.logger?.info(`Moving email "${emailUid}" from "${sourceMailboxPath}" to "${destinationMailboxPath}"`);

    await client.mailboxOpen(sourceMailboxPath, { readOnly: false });

    ImapFlowErrorCatcher.getInstance().startErrorCatching();

    const resp = await client.messageMove(emailUid, destinationMailboxPath, {
      uid: true,
    });

    if (!resp) {
      const errorsList = ImapFlowErrorCatcher.getInstance().stopAndGetErrorsList();
      throw new NodeImapError(
        context.getNode(),
        "Unable to move email",
        errorsList
      );
    }

    var item_json = JSON.parse(JSON.stringify(resp));

    returnData.push({
      json: item_json,
    });

    return returnData;
  },
};
