import { FetchQueryObject, ImapFlow } from "imapflow";
import { IExecuteFunctions, INodeExecutionData } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from "../../../utils/SearchFieldParameters";

export const downloadOperation: IResourceOperationDef = {
  operation: {
    name: 'Download',
    value: 'download',
  },
  parameters: [
    {
      ...parameterSelectMailbox,
      description: 'Select the mailbox',
    },
    {
      displayName: 'Email UID',
      name: 'emailUid',
      type: 'string',
      default: '',
      description: 'UID of the email to download',
    },
    {
      displayName: 'Put Output File in Field',
      name: 'binaryPropertyName',
      type: 'string',
      default: 'data',
      required: true,
      placeholder: 'e.g data',
      hint: 'The name of the output binary field to put the file in',
    },
  ],
  async executeImapAction(context: IExecuteFunctions, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    const mailboxPath = getMailboxPathFromNodeParameter(context, itemIndex);

    await client.mailboxOpen(mailboxPath, { readOnly: true });

    const emailUid = context.getNodeParameter('emailUid', itemIndex) as string;
    const binaryPropertyName = context.getNodeParameter('binaryPropertyName', itemIndex, 'data',) as string;

    // get source from the email
    const query: FetchQueryObject = {
      uid: true,
      source: true,
    };
    const emailInfo = await client.fetchOne(emailUid, query, { uid: true });

    const binaryData = await context.helpers.prepareBinaryData(emailInfo.source, mailboxPath + '_' + emailUid + '.eml', 'message/rfc822');

    const newItem: INodeExecutionData = {
      json: {},
      binary: {
        [binaryPropertyName]: binaryData,
      },
      pairedItem: {
        item: itemIndex,
      },
    };
    return [newItem];
  },
};
