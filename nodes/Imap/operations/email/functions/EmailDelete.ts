import { ImapFlow } from "imapflow";
import { IExecuteFunctions, INodeExecutionData } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from "../../../utils/SearchFieldParameters";
import { ImapFlowErrorCatcher, NodeImapError } from "../../../utils/ImapUtils";

const PARAM_NAME_SOURCE_MAILBOX = 'sourceMailbox';

export const deleteEmailOperation: IResourceOperationDef = {
  operation: {
    name: 'Delete',
    value: 'deleteEmail',
  },
  parameters: [
    {
      ...parameterSelectMailbox,
      displayName: 'Source Mailbox',
      description: 'Select the mailbox',
      name: PARAM_NAME_SOURCE_MAILBOX,
    },
    {
      displayName: 'Email UID',
      name: 'emailUid',
      type: 'string',
      default: '',
      description: 'UID of the email to delete',
      hint: 'You can use a comma separated list of UIDs to delete multiple emails at once',
    },
  ],
  async executeImapAction(context: IExecuteFunctions, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    var returnData: INodeExecutionData[] = [];

    const sourceMailboxPath = getMailboxPathFromNodeParameter(context, itemIndex, PARAM_NAME_SOURCE_MAILBOX);
    const emailUid = context.getNodeParameter('emailUid', itemIndex) as string;

    context.logger?.info(`Deleting email "${emailUid}" from "${sourceMailboxPath}"`);

    await client.mailboxOpen(sourceMailboxPath, { readOnly: false });

    ImapFlowErrorCatcher.getInstance().startErrorCatching();

    const resp: boolean = await client.messageDelete(emailUid, {
      uid: true,
    });

    if (!resp) {
      const errorsList = ImapFlowErrorCatcher.getInstance().stopAndGetErrorsList();
      throw new NodeImapError(
        context.getNode(),
        "Unable to delete email",
        errorsList
      );
    }

    var item_json = {
      success: resp,
      emailUid: emailUid,
      mailbox: sourceMailboxPath,
    };

    returnData.push({
      json: item_json,
    });

    return returnData;
  },
};
