import { DownloadObject, FetchQueryObject, ImapFlow } from "imapflow";
import { IExecuteFunctions, INodeExecutionData, NodeApiError } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from "../../../utils/SearchFieldParameters";
import { ImapFlowErrorCatcher } from "../../../utils/ImapUtils";
import { getEmailPartsInfoRecursive } from "../../../utils/EmailParts";

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
      displayName: 'All Attachments',
      name: 'allAttachments',
      type: 'boolean',
      default: false,
      description: 'Whether to download all attachments',
    },
    {
      displayName: 'Attachment Part IDs',
      name: 'partId',
      type: 'string',
      default: '',
      required: true,
      description: 'Comma-separated list of attachment part IDs to download',
      hint: 'Part IDs can be found in the email "attachmentsInfo" property',
      displayOptions: {
        show: {
          allAttachments: [
            false,
          ],
        },
      },
    },
  ],
  async executeImapAction(context: IExecuteFunctions, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {

    var returnItem: INodeExecutionData = {
      json: {},
      binary: {},
    };
    var jsonAttachments: any[] = [];
    var attachmentCounter = 0;

    const mailboxPath = getMailboxPathFromNodeParameter(context, itemIndex);

    await client.mailboxOpen(mailboxPath, { readOnly: true });

    const emailUid = context.getNodeParameter('emailUid', itemIndex) as string;
    const allAttachments = context.getNodeParameter('allAttachments', itemIndex) as boolean;

    let partsToDownload: string[] = [];

    if (allAttachments) {
      // get attachments info from the email
      const query: FetchQueryObject = {
        uid: true,
        bodyStructure: true,
      };
      const emailInfo = await client.fetchOne(emailUid, query, { uid: true });
      if (emailInfo.bodyStructure) {
        const partsInfo = getEmailPartsInfoRecursive(context, emailInfo.bodyStructure);
        for (const partInfo of partsInfo) {
          context.logger?.debug(`Attachment part info: ${JSON.stringify(partInfo)}`);
          if (partInfo.disposition === 'attachment') {
            partsToDownload.push(partInfo.partId);
          }
        }
      } else{
        context.logger?.warn(`IMAP server has not returned email body structure for email "${emailUid}"`);
      }
      if (partsToDownload.length > 0) {
        context.logger?.info(`Downloading all attachments from email "${emailUid}": ${partsToDownload.join(', ')}`);
      } else {
        context.logger?.warn(`Email "${emailUid}" does not have any attachments`);
      }
    } else {
      const partId = context.getNodeParameter('partId', itemIndex) as string;
      // split by comma and remove spaces
      const parts = partId.split(',').map((part) => part.trim());
      partsToDownload.push(...parts);
      context.logger?.info(`Downloading some attachments from email "${emailUid}": ${partsToDownload.join(', ')}`);
    }

    for (const partId of partsToDownload) {

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

      const fieldName = `attachment_${attachmentCounter}`;
      attachmentCounter++;

      const jsonAttachmentInfo = {
        partId: partId,
        binaryFieldName: fieldName,
        ...resp.meta,
      };
      jsonAttachments.push(jsonAttachmentInfo);

      returnItem.binary![fieldName] = binaryData;
    }

    // add attachments info to the return item
    returnItem.json!.attachments = jsonAttachments;
    return [returnItem];
  },
};
