import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { ImapFlow, MailboxRenameResponse } from 'imapflow';
import { IResourceOperationDef } from '../../../utils/CommonDefinitions';
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from '../../../utils/SearchFieldParameters';

export const renameMailboxOperation: IResourceOperationDef = {
  operation: {
    name: 'Rename',
    value: 'renameMailbox',
    description: 'Rename a mailbox',
  },
  parameters: [
    {
      ...parameterSelectMailbox,
      description: 'Select the mailbox',
    },
    {
      displayName: 'New Mailbox Name',
      name: 'newMailboxName',
      type: 'string',
      default: '',
      description: 'New name of the mailbox',
      required: true,
    },
  ],
  async executeImapAction(context: IExecuteFunctions, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    var returnData: INodeExecutionData[] = [];
    const mailboxPath = getMailboxPathFromNodeParameter(context, itemIndex);
    const newMailboxName = context.getNodeParameter('newMailboxName', itemIndex) as string;

    context.logger?.info(`Renaming mailbox "${mailboxPath}" to "${newMailboxName}"`);

    const imapResp : MailboxRenameResponse = await client.mailboxRename(mailboxPath, newMailboxName);
    context.logger?.info(JSON.stringify(imapResp));
    var item_json = JSON.parse(JSON.stringify(imapResp));
    returnData.push({
      json: item_json,
    });
    return returnData;
  },
};
