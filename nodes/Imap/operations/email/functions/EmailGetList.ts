import { FetchQueryObject, ImapFlow, Readable } from "imapflow";
import { IExecuteFunctions, INodeExecutionData } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from "../../../utils/SearchFieldParameters";
import { emailSearchParameters, getEmailSearchParametersFromNode } from "../../../utils/EmailSearchParameters";
import { simpleParser } from 'mailparser';
import { getEmailPartsInfoRecursive } from "../../../utils/EmailParts";


enum EmailParts {
  BodyStructure = 'bodyStructure',
  Flags = 'flags',
  Size = 'size',
  AttachmentsInfo = 'attachmentsInfo',
  TextContent = 'textContent',
  HtmlContent = 'htmlContent',
  Headers = 'headers',
}

function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!stream) {
      resolve('');
    } else {
      const chunks: any[] = [];
      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      stream.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf8'));
      });
      stream.on('error', reject);
    }
  });
}


export const getEmailsListOperation: IResourceOperationDef = {
  operation: {
    name: 'Get Many',
    value: 'getEmailsList',
  },
  parameters: [
    {
      ...parameterSelectMailbox,
      description: 'Select the mailbox',
    },
    ...emailSearchParameters,
    //
    {
      displayName: 'Include Message Parts',
      name: 'includeParts',
      type: 'multiOptions',
      placeholder: 'Add Part',
      default: [],
      options: [
        {
          name: 'Text Content',
          value: EmailParts.TextContent,
        },
        {
          name: 'HTML Content',
          value: EmailParts.HtmlContent,
        },
        {
          name: 'Attachments Info',
          value: EmailParts.AttachmentsInfo,
        },
        {
          name: 'Flags',
          value: EmailParts.Flags,
        },
        {
          name: 'Size',
          value: EmailParts.Size,
        },
        {
          name: 'Body Structure',
          value: EmailParts.BodyStructure,
        },
        {
          name: 'Headers',
          value: EmailParts.Headers,
        },
      ],
    },
    {
      displayName: 'Include All Headers',
      name: 'includeAllHeaders',
      type: 'boolean',
      default: true,
      description: 'Whether to include all headers in the output',
      displayOptions: {
        show: {
          includeParts: [
            EmailParts.Headers,
          ],
        },
      },
    },
    {
      displayName: 'Headers to Include',
      name: 'headersToInclude',
      type: 'string',
      default: '',
      description: 'Comma-separated list of headers to include',
      placeholder: 'received,authentication-results,return-path',
      displayOptions: {
        show: {
          includeParts: [
            EmailParts.Headers,
          ],
          includeAllHeaders: [
            false,
          ],
        },
      },
    }
  ],
  async executeImapAction(context: IExecuteFunctions, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    var returnData: INodeExecutionData[] = [];

    const mailboxPath = getMailboxPathFromNodeParameter(context, itemIndex);

    context.logger?.info(`Getting emails list from ${mailboxPath}`);

    await client.mailboxOpen(mailboxPath, { readOnly: true });

    var searchObject = getEmailSearchParametersFromNode(context, itemIndex);

    const includeParts = context.getNodeParameter('includeParts', itemIndex) as string[];
    var fetchQuery : FetchQueryObject = {
      uid: true,
      envelope: true,
    };

    if (includeParts.includes(EmailParts.BodyStructure)) {
      fetchQuery.bodyStructure = true;
    }
    if (includeParts.includes(EmailParts.Flags)) {
      fetchQuery.flags = true;
    }
    if (includeParts.includes(EmailParts.Size)) {
      fetchQuery.size = true;
    }
    if (includeParts.includes(EmailParts.Headers)) {
      fetchQuery.headers = true;
      // check if user wants only specific headers
      const includeAllHeaders = context.getNodeParameter('includeAllHeaders', itemIndex) as boolean;
      if (!includeAllHeaders) {
        const headersToInclude = context.getNodeParameter('headersToInclude', itemIndex) as string;
        context.logger?.info(`Including headers: ${headersToInclude}`);
        if (headersToInclude) {
          fetchQuery.headers = headersToInclude.split(',').map((header) => header.trim());
          context.logger?.info(`Including headers: ${fetchQuery.headers}`);
        }
      }
    }

    // will parse the bodystructure to get the attachments info
    const includeAttachmentsInfo = includeParts.includes(EmailParts.AttachmentsInfo);
    if (includeAttachmentsInfo) {
      fetchQuery.bodyStructure = true;
    }
    // text Content and html Content
    const includeTextContent = includeParts.includes(EmailParts.TextContent);
    const includeHtmlContent = includeParts.includes(EmailParts.HtmlContent);
    if (includeTextContent || includeHtmlContent) {
      // will parse the bodystructure to get the parts IDs for text and html
      fetchQuery.bodyStructure = true;
    }

    // wait for all emails to be fetched before processing them
    // because we might need to fetch the body parts for each email,
    // and this will freeze the client if we do it in parallel
    const emailsList = [];
    for  await (let email of client.fetch(searchObject, fetchQuery)) {
      emailsList.push(email);
    }
    context.logger?.info(`Found ${emailsList.length} emails`);

    // process the emails
    for (const email of emailsList) {
      context.logger?.info(`  ${email.uid}`);
      var item_json = JSON.parse(JSON.stringify(email));

      // process the headers
      if (includeParts.includes(EmailParts.Headers)) {
        if (email.headers) {
          try {
            const headersString = email.headers.toString();
            const parsed = await simpleParser(headersString);
            item_json.headers = {};
            parsed.headers.forEach((value, key, map) => {
              //context.logger?.info(`    HEADER [${key}] = ${value}`);
              item_json.headers[key] = value;
            });
          } catch (error) {
            context.logger?.error(`    Error parsing headers: ${error}`);
          }
        }
      }


      const analyzeBodyStructure = includeAttachmentsInfo || includeTextContent || includeHtmlContent;

      var textPartId = null;
      var htmlPartId = null;
      var attachmentsInfo = [];


      if (analyzeBodyStructure) {
        // workaround: dispositionParameters is an object, but it is not typed as such
        const bodyStructure = email.bodyStructure as unknown as any;

        if (bodyStructure) {
          // check if multipart
          if (bodyStructure.childNodes) {
            // get the parts info (could be recursive)
            var partsInfo = getEmailPartsInfoRecursive(context, bodyStructure);
            for (const partInfo of partsInfo) {
              if (partInfo.disposition === 'attachment') {
                attachmentsInfo.push({
                  partId: partInfo.partId,
                  filename: partInfo.filename,
                  type: partInfo.type,
                  encoding: partInfo.encoding,
                  size: partInfo.size,
                });
              } else {
                if (partInfo.type === 'text/plain') {
                  textPartId = partInfo.partId;
                }
                if (partInfo.type === 'text/html') {
                  htmlPartId = partInfo.partId;
                }
              }
            }
          } else {
            // single part, use "TEXT" as part ID
            if (bodyStructure.type === 'text/plain') {
              textPartId = "TEXT";
            }
            if (bodyStructure.type === 'text/html') {
              htmlPartId = "TEXT";
            }
          }
        }
      }

      if (includeAttachmentsInfo) {
        item_json.attachmentsInfo = attachmentsInfo;
      }

      // fetch text and html content
      if (includeTextContent || includeHtmlContent) {
        if (includeTextContent && textPartId) {
          const textContent = await client.download(email.uid.toString(), textPartId, {
            uid: true,
          });
          if (textContent.content) {
            item_json.textContent = await streamToString(textContent.content);
          }
        }
        if (includeHtmlContent && htmlPartId) {
          const htmlContent = await client.download(email.uid.toString(), htmlPartId, {
            uid: true,
          });
          if (htmlContent.content) {
            item_json.htmlContent = await streamToString(htmlContent.content);
          }
        }
      }

      returnData.push({
        json: item_json,
      });
    }

    return returnData;
  },
};
