import { ImapFlow } from 'imapflow';
import * as nodemailer from 'nodemailer';
import { IExecuteFunctions, INodeExecutionData, NodeApiError, Logger as N8nLogger } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from '../../../utils/SearchFieldParameters';
import { ImapFlowErrorCatcher, NodeImapError } from '../../../utils/ImapUtils';


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
      displayName: 'Use <a href="https://github.com/umanamente/n8n-nodes-eml" target="_blank"><pre>n8n-nodes-eml</pre></a> to compose complex emails. ' + 
        'It supports attachments and other features. ' +
        'Then use RFC822 input format provided by that node.',
      name: 'noticeSlowResponse',
      type: 'notice',
      default: '',
      displayOptions: {
        show: {
          inputFormat: [
            'fields',
          ],
        },
      },
    },
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

  async executeImapAction(context: IExecuteFunctions, logger: N8nLogger, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    var returnData: INodeExecutionData[] = [];

    const destinationMailboxPath = getMailboxPathFromNodeParameter(context, itemIndex, PARAM_NAME_DESTINATION_MAILBOX);

    const inputFormat = context.getNodeParameter('inputFormat', itemIndex) as string;

    // compose rfc822 content
    let rfc822Content = '';
    if (inputFormat === 'rfc822') {
      // rfc822 content is provided by the user
      rfc822Content = context.getNodeParameter('rfc822', itemIndex) as string;
    } else {
      // fields are provided by the user
      // compose rfc822 content using nodemailer

      let transporter = nodemailer.createTransport({
          streamTransport: true,
          buffer: true,
          newline: 'unix',
      });


      const subject = context.getNodeParameter('subject', itemIndex) as string;
      const from = context.getNodeParameter('from', itemIndex) as string;
      const to = context.getNodeParameter('to', itemIndex) as string;
      const text = context.getNodeParameter('text', itemIndex) as string;

      let json_data = {
        from: from,
        to: to,
        subject: subject,
        text: text,
      };

      type ComposeMailResult = {
        error: Error | null;
        info: ComposedEmailInfo | null;
      };

      type ComposedEmailInfo = {
        envelope: any;
        messageId: string;
        message: Buffer;
      };



      const promise_compose_rfc822: Promise<ComposeMailResult> = new Promise((resolve, reject) => {
        transporter.sendMail(json_data, (err, info) => {
          if (err) {
            resolve({
              error: err,
              info: null,
            });
            return;
          } else {
            // try to convert info type to ComposedEmailInfo
            // check fields
            if (!info.envelope || !info.messageId || !info.message) {
              resolve({
                error: new Error('Invalid info object returned by nodemailer. Expected fields: envelope, messageId, message. Found: ' + JSON.stringify(info)),
                info: null,
              });
              return;
            }

            let result: ComposeMailResult = {
              error: null,
              info: info as ComposedEmailInfo,
            };
            resolve(result);
          }
        });
      });

      const result: ComposeMailResult = await promise_compose_rfc822;

      // check errors
      if (result.error) {
        throw new NodeApiError(context.getNode(), {}, {
          message: `Error composing the email: ${result.error}`,
        });
      }

      // convert the email to rfc822 format
      rfc822Content = result.info!.message.toString('utf8');
    }

    await client.mailboxOpen(destinationMailboxPath, { readOnly: false });

    ImapFlowErrorCatcher.getInstance().startErrorCatching();

    const resp = await client.append(
      destinationMailboxPath,
      rfc822Content,
      ["\\Draft"],
    );


    if (!resp) {
      const errorsList = ImapFlowErrorCatcher.getInstance().stopAndGetErrorsList();
      throw new NodeImapError(
        context.getNode(),
        "Unable to create draft",
        errorsList
      );
    }

    var item_json = JSON.parse(JSON.stringify(resp));

    returnData.push({
      json: item_json,
    });

    return returnData;
  },
};
