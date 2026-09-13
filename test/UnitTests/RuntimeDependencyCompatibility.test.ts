import parser from 'imapflow/lib/handler/imap-parser';
import { formatMessageResponse, getStringList } from 'imapflow/lib/tools';
import { simpleParser } from 'mailparser';
import { IExecuteFunctions } from 'n8n-workflow';
import { createDraftOperation } from '../../nodes/Imap/operations/email/functions/EmailCreateDraft';
import { createNodeParametersCheckerMock } from '../TestUtils/N8nMocks';

describe('runtime dependency compatibility', () => {
	it('parses a valid FETCH response containing THREADID NIL', async () => {
		const response = await parser('* 1 FETCH (UID 42 THREADID NIL FLAGS (\\Seen))');
		const message = await formatMessageResponse(response, { path: 'INBOX' } as any);

		expect(getStringList(null)).toEqual([]);
		expect(message.uid).toBe(42);
		expect(message.threadId).toBeUndefined();
		expect(message.flags).toEqual(new Set(['\\Seen']));
	});

	it('composes fields-mode drafts with canonical CRLF bytes before APPEND', async () => {
		const context = createNodeParametersCheckerMock(createDraftOperation.parameters, {
			destinationMailbox: { value: 'Drafts' },
			inputFormat: 'fields',
			subject: 'Maintenance test',
			from: 'sender@example.com',
			to: 'recipient@example.com',
			text: 'First line\nSecond line',
		});
		let appendedMessage = '';
		const client = {
			mailboxOpen: jest.fn().mockResolvedValue(undefined),
			append: jest.fn().mockImplementation(async (_mailbox, message) => {
				appendedMessage = message;
				return { path: 'Drafts', uid: 42, uidValidity: BigInt(1) };
			}),
		};

		const result = await createDraftOperation.executeImapAction(
			context as IExecuteFunctions,
			context.logger!,
			0,
			client as any,
		);

		expect(client.append).toHaveBeenCalledWith('Drafts', expect.any(String), ['\\Draft']);
		expect(appendedMessage).toContain('\r\n');
		expect(appendedMessage.split('\r\n').join('')).not.toMatch(/[\r\n]/);

		const parsed = await simpleParser(Buffer.from(appendedMessage, 'utf8'));
		expect(parsed.subject).toBe('Maintenance test');
		expect(parsed.from?.text).toBe('sender@example.com');
		expect(Array.isArray(parsed.to) ? parsed.to[0]?.text : parsed.to?.text).toBe(
			'recipient@example.com',
		);
		expect(parsed.text).toBe('First line\nSecond line\n');
		expect(result?.[0].json).toEqual({ path: 'Drafts', uid: 42, uidValidity: '1' });
	});
});
