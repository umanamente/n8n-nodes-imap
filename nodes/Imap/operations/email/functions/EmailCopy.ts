import { ImapFlow } from 'imapflow';
import { IExecuteFunctions, INodeExecutionData, Logger as N8nLogger } from 'n8n-workflow';
import { IResourceOperationDef } from '../../../utils/CommonDefinitions';
import {
  getMailboxPathFromNodeParameter,
  parameterSelectMailbox,
} from '../../../utils/SearchFieldParameters';
import { ImapFlowErrorCatcher, NodeImapError } from '../../../utils/ImapUtils';

const PARAM_NAME_SOURCE_MAILBOX = 'sourceMailbox';
const PARAM_NAME_DESTINATION_MAILBOX = 'destinationMailbox';

export const copyEmailOperation: IResourceOperationDef = {
  operation: {
    name: 'Copy',
    value: 'copyEmail',
  },
  parameters: [
    {
      ...parameterSelectMailbox,
      displayName: 'Source Mailbox',
      description: 'Select the source mailbox',
      name: PARAM_NAME_SOURCE_MAILBOX,
    },
    {
      displayName: 'Email UID',
      name: 'emailUid',
      type: 'string',
      default: '',
      description: 'UID of the email to copy',
      hint: 'You can use comma separated list of UIDs to copy multiple emails at once',
    },
    {
      ...parameterSelectMailbox,
      displayName: 'Destination Mailbox',
      description: 'Select the destination mailbox',
      name: PARAM_NAME_DESTINATION_MAILBOX,
    },
  ],
  async executeImapAction(
    context: IExecuteFunctions,
    logger: N8nLogger,
    itemIndex: number,
    client: ImapFlow,
  ): Promise<INodeExecutionData[] | null> {
    var returnData: INodeExecutionData[] = [];

    const sourceMailboxPath = getMailboxPathFromNodeParameter(
      context,
      itemIndex,
      PARAM_NAME_SOURCE_MAILBOX,
    );
    const destinationMailboxPath = getMailboxPathFromNodeParameter(
      context,
      itemIndex,
      PARAM_NAME_DESTINATION_MAILBOX,
    );

    const emailUid = context.getNodeParameter('emailUid', itemIndex) as string;

    logger.info(
      `Copying email "${emailUid}" from "${sourceMailboxPath}" to "${destinationMailboxPath}"`,
    );

    await client.mailboxOpen(sourceMailboxPath, { readOnly: false });

    ImapFlowErrorCatcher.getInstance().startErrorCatching();

    const resp = await client.messageCopy(emailUid, destinationMailboxPath, {
      uid: true,
    });

    if (!resp) {
      const errors = ImapFlowErrorCatcher.getInstance().stopAndGetErrorsList();
      throw new NodeImapError(context.getNode(), 'Email copy operation failed', errors);
    }

    var item_json = JSON.parse(JSON.stringify(resp));

    returnData.push({
      json: item_json,
    });

    return returnData;
  },
};
