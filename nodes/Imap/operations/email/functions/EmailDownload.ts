import { FetchQueryObject, ImapFlow } from "imapflow";
import { IBinaryKeyData, IDataObject, IExecuteFunctions, INodeExecutionData, Logger as N8nLogger } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from "../../../utils/SearchFieldParameters";
import { ImapFlowErrorCatcher, NodeImapError } from '../../../utils/ImapUtils';

export const downloadOperation: IResourceOperationDef = {
  operation: {
    name: 'Download as EML',
    value: 'downloadEml',
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
      displayName: 'Output to Binary Data',
      name: 'outputToBinary',
      type: 'boolean',
      default: true,
      description: 'Whether to output the email as binary data or JSON as text',
      hint: 'If true, the email will be output as binary data. If false, the email will be output as JSON as text.',
    },
    {
      displayName: 'Put Output File in Field',
      name: 'binaryPropertyName',
      type: 'string',
      default: 'data',
      required: true,
      placeholder: 'e.g data',
      hint: 'The name of the output binary field to put the file in',
      displayOptions: {
        show: {
          outputToBinary: [true],
        },
      },
    },

  ],
  async executeImapAction(context: IExecuteFunctions, logger: N8nLogger, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    const mailboxPath = getMailboxPathFromNodeParameter(context, itemIndex);

    await client.mailboxOpen(mailboxPath, { readOnly: true });

    const emailUid = context.getNodeParameter('emailUid', itemIndex) as string;
    const outputToBinary = context.getNodeParameter('outputToBinary', itemIndex, true) as boolean;
    const binaryPropertyName = context.getNodeParameter('binaryPropertyName', itemIndex, 'data',) as string;

    // get source from the email
    const query: FetchQueryObject = {
      uid: true,
      source: true,
    };
    const emailInfo = await client.fetchOne(emailUid, query, { uid: true });

    if (!emailInfo) {
      const errors = ImapFlowErrorCatcher.getInstance().stopAndGetErrorsList();
      throw new NodeImapError(context.getNode(), 'Failed to fetch email', errors);
    }

    let binaryFields: IBinaryKeyData | undefined = undefined;
    let jsonData: IDataObject = {
      uid: emailInfo.uid,
    };

    if (outputToBinary) {
      // output to binary data
      const binaryData = await context.helpers.prepareBinaryData(emailInfo.source!, mailboxPath + '_' + emailUid + '.eml', 'message/rfc822');
      binaryFields = {
        [binaryPropertyName]: binaryData,
      };
    } else {
      // output to JSON as text
      jsonData = {
        ...jsonData,
        emlContent: emailInfo.source!.toString(),
      };
    }

    const newItem: INodeExecutionData = {
      json: jsonData,
      binary: binaryFields,
      pairedItem: {
        item: itemIndex,
      },
    };
    return [newItem];
  },
};
