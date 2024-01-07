import { DownloadObject, ImapFlow } from "imapflow";
import { IExecuteFunctions, INodeExecutionData, NodeApiError } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from "../../../utils/SearchFieldParameters";
import { ImapFlowErrorCatcher } from "../../../utils/ImapUtils";

export const downloadAttachmentOperation: IResourceOperationDef = {
  operation: {
    name: 'Download Attachment',
    value: 'downloadAttachment',
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
      displayName: 'Attachment Part ID',
      name: 'partId',
      type: 'string',
      default: '',
      required: true,
      description: 'ID of the part to download',
      hint: 'Part ID can be found in the email "attachmentsInfo" property',
    },
  ],
  async executeImapAction(context: IExecuteFunctions, client: ImapFlow) {
    var returnData: INodeExecutionData[] = [];

    const mailboxPath = getMailboxPathFromNodeParameter(context);

    await client.mailboxOpen(mailboxPath, { readOnly: true });

    const emailUid = context.getNodeParameter('emailUid', 0) as string;
    const partId = context.getNodeParameter('partId', 0) as string;

    context.logger?.info(`Downloading attachment "${partId}" from email "${emailUid}"`);


		// start catching errors
		ImapFlowErrorCatcher.getInstance().startErrorCatching();

    const resp : DownloadObject = await client.download(emailUid, partId, {
      uid: true,
    });
		if (!resp.meta) {
			// get IMAP errors
			const internalImapErrors = ImapFlowErrorCatcher.getInstance().stopAndGetErrors();
			var errorDetails = "";
			if (internalImapErrors.length > 0) {
				errorDetails = "IMAP server responded: \n" + internalImapErrors.join(", \n");
			}

			context.logger?.error(`IMAP server has not returned attachment info: ${errorDetails}`);

			throw new NodeApiError(context.getNode(), {}, {
				message: "IMAP server has not returned attachment info",
				description: errorDetails,
			});
		}
		const binaryData = await context.helpers.prepareBinaryData(resp.content, resp.meta.filename, resp.meta.contentType);
    context.logger?.info(`Attachment downloaded: ${binaryData.data.length} bytes`);

    returnData.push({
      json: resp.meta,
      binary: {
        attachment: binaryData,
      },
    });

    client.close();
    return [returnData];
  },
};
