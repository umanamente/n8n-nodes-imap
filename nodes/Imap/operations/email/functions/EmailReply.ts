import { AppendResonseObject, ImapFlow } from 'imapflow';
import {
	IExecuteFunctions,
	INodeExecutionData,
	NodeApiError,
	NodeExecutionWithMetadata,
} from 'n8n-workflow';
import { IResourceOperationDef } from '../../../utils/CommonDefinitions';
import {
	getMailboxPathFromNodeParameter,
	parameterSelectMailbox,
} from '../../../utils/SearchFieldParameters';
import * as nodemailer from 'nodemailer';

const PARAM_NAME_DESTINATION_MAILBOX = 'destinationMailbox';

export const createReplyOperation: IResourceOperationDef = {
	operation: {
		name: 'Reply',
		value: 'Reply',
	},
	parameters: [
		{
			...parameterSelectMailbox,
			description: 'Select the mailbox',
			name: PARAM_NAME_DESTINATION_MAILBOX,
		},
		{
			displayName: 'Email UID',
			name: 'uid',
			type: 'string',
			default: '*',
			placeholder: 'e.g. 1234',
			description: 'Email UID to create a reply for',
		},
		{
			displayName: 'From Email',
			name: 'from',
			type: 'string',
			default: '',
			description: 'The email address of the sender',
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
	async executeImapAction(
		context: IExecuteFunctions,
		itemIndex: number,
		client: ImapFlow,
	): Promise<INodeExecutionData[] | NodeExecutionWithMetadata[] | null> {
		let returnData: INodeExecutionData[] = [];

		const destinationMailboxPath = getMailboxPathFromNodeParameter(
			context,
			itemIndex,
			PARAM_NAME_DESTINATION_MAILBOX,
		);

		let transporter = nodemailer.createTransport({
			streamTransport: true,
			buffer: true,
			newline: 'unix',
		});

		const uid = context.getNodeParameter('uid', itemIndex, undefined, {
			extractValue: true,
		}) as string;
		const from = context.getNodeParameter('from', itemIndex) as string;
		const text = context.getNodeParameter('text', itemIndex) as string;

		await client.mailboxOpen(destinationMailboxPath, { readOnly: false });

		const originalMessage = await client.fetchOne(uid, { envelope: true }, { uid: true });
		const envelope = originalMessage?.envelope;
		console.log('Original message', originalMessage);
		console.log('Envelope', envelope);

		if (!originalMessage) {
			throw new NodeApiError(
				context.getNode(),
				{},
				{
					message: 'Original message to reply to not found or envelope is missing.',
				},
			);
		}

		const toAddress =
			envelope.from && envelope.from.length > 0
				? `${envelope.from[0].name} <${envelope.from[0].address}>`
				: '';

		const senderAddress = from.length > 0
			? `${envelope.to[0].name} <${from}>`
			: '';
		console.log('To address', toAddress, "From address", senderAddress);

		let json_data = {
			inReplyTo: envelope.messageId,
			references: envelope.messageId,
			from: senderAddress,
			to: toAddress,
			subject: envelope.subject,
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

		function compose_reply(
			transporter: nodemailer.Transporter,
			mailOptions: nodemailer.SendMailOptions,
		): Promise<ComposeMailResult> {
			return new Promise((resolve) => {
				transporter.sendMail(mailOptions, (err, info) => {
					if (err) {
						resolve({ error: err, info: null });
						return;
					}

					const messageBuffer = (info as any).message;
					if (!info.envelope || !info.messageId || !messageBuffer) {
						resolve({
							error: new Error('Invalid info returned by Nodemailer.'),
							info: null,
						});
						return;
					}

					resolve({
						error: null,
						info: {
							envelope: info.envelope,
							messageId: info.messageId,
							message: messageBuffer,
						},
					});
				});
			});
		}

		const result = await compose_reply(transporter, json_data);

		if (result.error || !result.info) {
			throw new NodeApiError(
				context.getNode(),
				{},
				{
					message: `Error composing the email: ${result.error?.message}`,
				},
			);
		}

		let rfc822Content = result.info!.message.toString('utf8');

		const resp: AppendResonseObject = await client.append(destinationMailboxPath, rfc822Content, [
			'\\Draft',
		]);

		if (!resp) {
			throw new NodeApiError(
				context.getNode(),
				{},
				{
					message: 'Unable to create reply. Unknown error',
				},
			);
		}

		let item_json = JSON.parse(JSON.stringify(resp));

		returnData.push({
			json: item_json,
		});

		return returnData;
	},
};
