import { IExecuteFunctions, INodeExecutionData, Logger as N8nLogger } from 'n8n-workflow';
import {ImapFlow} from 'imapflow';
import { IResourceOperationDef } from '../../../utils/CommonDefinitions';
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from '../../../utils/SearchFieldParameters';

export const getMailboxQuotaOperation: IResourceOperationDef = {
  operation: {
    name: 'Get Quota',
    value: 'getMailboxQuota',
    description: 'Get quota (space usage) of an account',
  },
  parameters: [
    {
      ...parameterSelectMailbox,
      description: 'Select the mailbox',
			hint: "Leave as INBOX unless your email provider supports per-folder quotas"
    },
  ],
  async executeImapAction(context: IExecuteFunctions, logger: N8nLogger, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
		let returnData: INodeExecutionData[] = [];
		const mailboxPath = getMailboxPathFromNodeParameter(context, itemIndex);

    let info = await client.getQuota(mailboxPath);
		if (info === false || info === undefined) {
			// do nothing, returnData is left as an empty array (0 items)
		} else {
			let item_json = JSON.parse(JSON.stringify(info));
			returnData.push({
				json: item_json,
			});
		}
    return returnData;
  },
};
