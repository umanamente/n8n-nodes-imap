import { AppendResonseObject, ImapFlow } from "imapflow";
import { IExecuteFunctions, INodeExecutionData, NodeApiError } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from '../../../utils/SearchFieldParameters';


function unicodeToBase64(str: string) {
  return Buffer.from(str).toString('base64');
}


const PARAM_NAME_DESTINATION_MAILBOX = 'destinationMailbox';

export const createDraftOperation: IResourceOperationDef = {
  operation: {
    name: 'Create Draft',
    value: 'createDraft',
  },
  parameters: [
    {
      ...parameterSelectMailbox,
      description: 'Select the mailbox',
      name: PARAM_NAME_DESTINATION_MAILBOX,
    },
    // select input format (RFC822 or fields)
    {
      displayName: 'Input Format',
      name: 'inputFormat',
      type: 'options',
      options: [
        {
          name: 'Fields',
          value: 'fields',
        },
        {
          name: 'RFC822 Formatted Email',
          value: 'rfc822',
        },
      ],
      default: 'fields',
      description: 'Select the input format of the email content',
    },
    // required parameters for fields input format
    {
      displayName: 'Subject',
      name: 'subject',
      type: 'string',
      default: '',
      description: 'The subject of the email',
      displayOptions: {
        show: {
          inputFormat: [
            'fields',
          ],
        },
      },
    },
    {
      displayName: 'From',
      name: 'from',
      type: 'string',
      default: '',
      description: 'The email address of the sender',
      displayOptions: {
        show: {
          inputFormat: [
            'fields',
          ],
        },
      },
    },
    {
      displayName: 'To',
      name: 'to',
      type: 'string',
      default: '',
      description: 'The email address of the recipient',
      displayOptions: {
        show: {
          inputFormat: [
            'fields',
          ],
        },
      },
    },
    {
      displayName: 'Text',
      name: 'text',
      type: 'string',
      default: '',
      description: 'The text of the email',
      typeOptions: {
        rows: 5,
      },
      displayOptions: {
        show: {
          inputFormat: [
            'fields',
          ],
        },
      },
    },
    // rfc822 input format
    {
      displayName: 'RFC822 Formatted Email',
      name: 'rfc822',
      type: 'string',
      default: '',
      required: true,
      typeOptions: {
        rows: 10,
      },
      displayOptions: {
        show: {
          inputFormat: [
            'rfc822',
          ],
        },
      },
    },
  ],

  async executeImapAction(context: IExecuteFunctions, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    var returnData: INodeExecutionData[] = [];

    const destinationMailboxPath = getMailboxPathFromNodeParameter(context, itemIndex, PARAM_NAME_DESTINATION_MAILBOX);

    const inputFormat = context.getNodeParameter('inputFormat', itemIndex) as string;

    // compose rfc822 content
    let rfc822Content = '';
    if (inputFormat === 'rfc822') {
      rfc822Content = context.getNodeParameter('rfc822', itemIndex) as string;
    } else {
      const subject = context.getNodeParameter('subject', itemIndex) as string;
      const from = context.getNodeParameter('from', itemIndex) as string;
      const to = context.getNodeParameter('to', itemIndex) as string;
      const text = context.getNodeParameter('text', itemIndex) as string;

      let headers = [];

      if (subject) {
        headers.push(`Subject: =?UTF-8?B?${unicodeToBase64(subject)}?=`)
      }
      if (from) {
        headers.push(`From: =?UTF-8?B?${unicodeToBase64(from)}?=`)
      }
      if (to) {
        headers.push(`To: =?UTF-8?B?${unicodeToBase64(to)}?=`)
      }
      if (text) {
        headers.push(`Content-Type: text/plain; charset=utf-8`)
        headers.push(`Content-Transfer-Encoding: base64`)
      }

      rfc822Content = headers.join('\r\n') + '\r\n\r\n';
      if (text) {
        rfc822Content += unicodeToBase64(text);
      }
    }

    await client.mailboxOpen(destinationMailboxPath, { readOnly: false });

    const resp : AppendResonseObject = await client.append(
      destinationMailboxPath,
      rfc822Content,
      ["\\Draft"],
    );


    if (!resp) {
      throw new NodeApiError(context.getNode(), {}, {
        message: "Unable to create draft, unknown error",
      });
    }

    var item_json = JSON.parse(JSON.stringify(resp));

    returnData.push({
      json: item_json,
    });

    return returnData;
  },
};
