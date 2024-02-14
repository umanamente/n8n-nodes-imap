import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { ImapFlow, MailboxDeleteResponse } from 'imapflow';
import { IResourceOperationDef } from '../../../utils/CommonDefinitions';
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from '../../../utils/SearchFieldParameters';

export const deleteMailboxOperation: IResourceOperationDef = {
  operation: {
    name: 'Delete',
    value: 'deleteMailbox',
    description: 'Delete a mailbox',
  },
  parameters: [
    {
      ...parameterSelectMailbox,
      description: 'Select the mailbox',
      default: '',
    },
    // warning notice
    {
      displayName: 'WARNING: This operation will delete the selected mailbox and all its contents. This action cannot be undone',
      name: 'warning',
      type: 'notice',
      default: '',
    },
  ],
  async executeImapAction(context: IExecuteFunctions, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    var returnData: INodeExecutionData[] = [];
    const mailboxPath = getMailboxPathFromNodeParameter(context, itemIndex);
    context.logger?.info(`Deleting mailbox "${mailboxPath}"`);

    const imapResp : MailboxDeleteResponse = await client.mailboxDelete(mailboxPath);
    var item_json = JSON.parse(JSON.stringify(imapResp));
    returnData.push({
      json: item_json,
    });
    return returnData;
  },
};
