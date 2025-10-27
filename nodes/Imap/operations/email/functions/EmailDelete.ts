import { ImapFlow } from 'imapflow';
import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { IResourceOperationDef } from '../../../utils/CommonDefinitions';
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from '../../../utils/SearchFieldParameters';
import { ImapFlowErrorCatcher, NodeImapError } from '../../../utils/ImapUtils';

export const deleteEmailOperation: IResourceOperationDef = {
  operation: {
    name: 'Delete',
    value: 'deleteEmail',
    description: 'Permanently delete one or more emails from a mailbox',
  },
  parameters: [
    {
      ...parameterSelectMailbox,
      description: 'Select the mailbox containing the email to delete',
    },
    {
      displayName: 'Email UID',
      name: 'emailUid',
      type: 'string',
      default: '',
      description: 'UID of the email to delete',
      hint: 'You can use a comma separated list of UIDs to delete multiple emails at once',
      required: true,
    },
  ],
  async executeImapAction(
    context: IExecuteFunctions,
    itemIndex: number,
    client: ImapFlow,
  ): Promise<INodeExecutionData[] | null> {
    const returnData: INodeExecutionData[] = [];

    const mailboxPath = getMailboxPathFromNodeParameter(context, itemIndex);
    const emailUid = context.getNodeParameter('emailUid', itemIndex) as string;

    context.logger.info(`Deleting email "${emailUid}" from "${mailboxPath}"`);

    await client.mailboxOpen(mailboxPath, { readOnly: false });

    ImapFlowErrorCatcher.getInstance().startErrorCatching();
    const isDeleted = await client.messageDelete(emailUid, {
      uid: true,
    });

    if (!isDeleted) {
      const errorsList = ImapFlowErrorCatcher.getInstance().stopAndGetErrorsList();
      throw new NodeImapError(context.getNode(), 'Unable to delete email', errorsList);
    }

    returnData.push({
      json: {
        uid: emailUid,
        deleted: true,
      },
    });

    return returnData;
  },
};
