import { IExecuteFunctions, INodeExecutionData, Logger as N8nLogger } from 'n8n-workflow';
import { ImapFlow, MailboxCreateResponse } from 'imapflow';
import { IResourceOperationDef } from '../../../utils/CommonDefinitions';
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from '../../../utils/SearchFieldParameters';

export const createMailboxOperation: IResourceOperationDef = {
  operation: {
    name: 'Create',
    value: 'createMailbox',
    description: 'Create a new mailbox',
  },
  parameters: [
    {
      displayName: 'Top Level Mailbox',
      name: 'topLevelMailbox',
      type: 'boolean',
      default: true,
      description: 'Whether the mailbox is a top level mailbox or a child mailbox',
      required: true,
    },
    {
      ...parameterSelectMailbox,
      description: 'Parent mailbox',
      required: false,
      displayOptions: {
        show: {
          topLevelMailbox: [false],
        },
      },
    },
    {
      displayName: 'Mailbox Name',
      name: 'mailboxName',
      type: 'string',
      default: '',
      description: 'Name of the mailbox to create',
      required: true,
    },
  ],
  async executeImapAction(context: IExecuteFunctions, logger: N8nLogger, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    var returnData: INodeExecutionData[] = [];
    const mailboxPath = getMailboxPathFromNodeParameter(context, itemIndex);
    const mailboxName = context.getNodeParameter('mailboxName', itemIndex) as string;
    var resultPath;
    // if mailboxPath is empty, then we are creating a top level mailbox
    if (mailboxPath) {
      resultPath = [mailboxPath, mailboxName];
    } else {
      resultPath = mailboxName;
    }
    logger.info(`Creating mailbox "${resultPath}"`);

    const mailboxCreateResp : MailboxCreateResponse = await client.mailboxCreate(resultPath);
    var item_json = JSON.parse(JSON.stringify(mailboxCreateResp));
    returnData.push({
      json: item_json,
    });
    return returnData;
  },
};
