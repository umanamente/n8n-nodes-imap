import { AppendResonseObject, ImapFlow } from "imapflow";
import { IExecuteFunctions, INodeExecutionData, NodeApiError, NodeExecutionWithMetadata } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from "../../../utils/SearchFieldParameters";
import * as nodemailer from 'nodemailer';

const PARAM_NAME_DESTINATION_MAILBOX = 'destinationMailbox';

export const createReplyOperation: IResourceOperationDef = {
	operation: {
		name: 'Reply',
		value: 'Reply'
	},
	parameters: [
		{
			...parameterSelectMailbox,
			description: 'Select the mailbox',
			name: PARAM_NAME_DESTINATION_MAILBOX,
		},
		{
			displayName: 'Message',
			name: 'messageId',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			required: true,
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					placeholder: 'Select a message...',
					typeOptions: {
						searchListMethod: 'searchMessages',
						searchable: true,
					},
				},
				{
					displayName: 'ID',
					name: 'id',
					type: 'string',
					placeholder: 'e.g. AAAkAAAhAAA0BBc5LLLwOOOtNNNkZS05Nz...',
				},
			],
		},
		{
      displayName: 'From',
      name: 'from',
      type: 'string',
      default: '',
      description: 'The email address of the sender',
    },
		{
			displayName: 'To',
			name: 'toRecipients',
			description: 'Comma-separated list of email addresses of recipients',
			type: 'string',
			default: '',
		},
		{
      displayName: 'Text',
      name: 'text',
      type: 'string',
      default: '',
      description: 'Email message body content',
      typeOptions: {
        rows: 5,
      },
    },
	],
	async executeImapAction(context: IExecuteFunctions, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | NodeExecutionWithMetadata[] | null> {

		let returnData: INodeExecutionData[] = [];

		const destinationMailboxPath = getMailboxPathFromNodeParameter(context, itemIndex, PARAM_NAME_DESTINATION_MAILBOX);

		let transporter = nodemailer.createTransport({
				streamTransport: true,
				buffer: true,
				newline: 'unix'
		})

		const messageId = context.getNodeParameter('messageId', itemIndex, undefined, {
			extractValue: true,
		}) as string;
		const from = context.getNodeParameter('from', itemIndex) as string;
		const toRecipients = context.getNodeParameter('to', itemIndex) as string;
		const text = context.getNodeParameter('text', itemIndex) as string;

		let json_data = {
			inReplyTo: messageId,
			references: messageId,
			from: from,
			to: toRecipients,
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

		const promise_compose_reply: Promise<ComposeMailResult> = new Promise((resolve, reject) => {
			transporter.sendMail(json_data, (err, info) => {
				if (err) {
					resolve({
						error: err,
						info: null,
					});
					return;
				} else {
					if (!info.envelope || !info.messageId || info.message) {
						resolve({
							error: new Error('Invalid info object returned by Nodemailer. Expected fields: envelope, messageId, message. Found: ' + JSON.stringify(info)),
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

		const result: ComposeMailResult = await promise_compose_reply;

		if (result.error) {
			throw new NodeApiError(context.getNode(), {}, {
				message: `Error composing the email: ${result.error}`,
			});
		}

		let rfc822Content = result.info!.message.toString('utf8');

		await client.mailboxOpen(destinationMailboxPath, {readOnly: false});

		const resp: AppendResonseObject = await client.append(
			destinationMailboxPath,
			rfc822Content,
			['\\Reply']
		)

		if (!resp) {
			throw new NodeApiError(context.getNode(), {}, {
				message: "Unable to create reply. Unknown error",
			});
		}

		let item_json = JSON.parse(JSON.stringify(resp));

		returnData.push({
			json: item_json,
		});

		return returnData;
	},
}
