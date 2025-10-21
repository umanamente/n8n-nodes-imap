import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { ImapFlow } from 'imapflow';
import { IResourceOperationDef } from '../../../utils/CommonDefinitions';

enum MailboxListStatusFields {
  includeMessageCount = 'includeMessageCount',
  includeRecentCount = 'includeRecentCount',
  includeUnseenCount = 'includeUnseenCount',
  includeUidNext = 'includeUidNext',
  includeUidValidity = 'includeUidValidity',
  includeHighestModseq = 'includeHighestModseq',
};

export const getMailboxListOperation: IResourceOperationDef = {
  operation: {
    name: 'Get Many',
    description: 'Get a list of mailboxes',
    value: 'loadMailboxList',
  },
  parameters: [
    {
      displayName: 'Including status fields might slow down the response',
      name: 'noticeSlowResponse',
      type: 'notice',
      default: '',
    },
    {
      displayName: 'Include Status Fields',
      name: 'includeStatusFields',
      type: 'multiOptions',
      default: [],
      // eslint-disable-next-line n8n-nodes-base/node-param-multi-options-type-unsorted-items
      options: [
        {
          name: 'Message Count',
          value: MailboxListStatusFields.includeMessageCount,
        },
        {
          name: 'Recent Count',
          value: MailboxListStatusFields.includeRecentCount,
        },
        {
          name: 'Unseen Count',
          value: MailboxListStatusFields.includeUnseenCount,
        },
        {
          name: 'UID Next',
          value: MailboxListStatusFields.includeUidNext,
        },
        {
          name: 'UID Validity',
          value: MailboxListStatusFields.includeUidValidity,
        },
        {
          name: 'Highest Modseq',
          value: MailboxListStatusFields.includeHighestModseq,
        },
      ],
    },

  ],
  async executeImapAction(context: IExecuteFunctions, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    var returnData: INodeExecutionData[] = [];
    context.logger.info("includeStatusFields: " + context.getNodeParameter('includeStatusFields', itemIndex) as string);
    const includeStatusFields = context.getNodeParameter('includeStatusFields', itemIndex) as string[];
    var statusQuery = {
      messages: includeStatusFields.includes(MailboxListStatusFields.includeMessageCount),
      recent: includeStatusFields.includes(MailboxListStatusFields.includeRecentCount),
      unseen: includeStatusFields.includes(MailboxListStatusFields.includeUnseenCount),
      uidnext: includeStatusFields.includes(MailboxListStatusFields.includeUidNext),
      uidvalidity: includeStatusFields.includes(MailboxListStatusFields.includeUidValidity),
      highestmodseq: includeStatusFields.includes(MailboxListStatusFields.includeHighestModseq),
    };
    const mailboxes = await client.list({
      statusQuery: statusQuery,
    });
    for (const mailbox of mailboxes) {
      context.logger.info(`  ${mailbox.path}`);
      var item_json = {
        path: mailbox.path,
        name: mailbox.name,
        status: mailbox.status,
      };
      context.logger.info(`  ${JSON.stringify(item_json)}`);
      returnData.push({
        json: item_json,
      });
    }
    return returnData;
  },
};
