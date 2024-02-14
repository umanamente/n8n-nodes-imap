import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { ImapFlow, StatusObject } from 'imapflow';
import { IResourceOperationDef } from '../../../utils/CommonDefinitions';
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from '../../../utils/SearchFieldParameters';

export const getMailboxStatusOperation: IResourceOperationDef = {
  operation: {
    name: 'Get Status',
    value: 'getMailboxStatus',
    description: 'Get status of a single mailbox',
  },
  parameters: [
    {
      ...parameterSelectMailbox,
      description: 'Select the mailbox',
    },
  ],
  async executeImapAction(context: IExecuteFunctions, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    var returnData: INodeExecutionData[] = [];
    var statusQuery = {
      messages: true,
      recent: true,
      unseen: true,
      uidNext: true,
      uidValidity: true,
      highestModseq: true,
    };
    const mailboxPath = getMailboxPathFromNodeParameter(context, itemIndex);

    const mailbox : StatusObject = await client.status(mailboxPath, statusQuery);
    var item_json = JSON.parse(JSON.stringify(mailbox));
    returnData.push({
      json: item_json,
    });
    return returnData;
  },
};
