import { ImapFlow } from "imapflow";
import { IDataObject, IExecuteFunctions, INodeExecutionData, NodeApiError } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from '../../../utils/SearchFieldParameters';


enum ImapFlags {
  Answered = '\\Answered',
  Flagged = '\\Flagged',
  Deleted = '\\Deleted',
  Seen = '\\Seen',
  Draft = '\\Draft',
}

export const setEmailFlagsOperation: IResourceOperationDef = {
  operation: {
    name: 'Set Flags',
    value: 'setEmailFlags',
    description: 'Set flags on an email like "Seen" or "Flagged"',
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
      description: 'UID of the email to set flags',
      hint: 'You can use comma separated list of UIDs',
    },
    {
      displayName: 'Flags',
      name: 'flags',
      type: 'collection',
      default: [],
      required: true,
      placeholder: 'Add Flag',
      options: [
        {
          displayName: 'Answered',
          name: ImapFlags.Answered,
          type: 'boolean',
          default: false,
          description: 'Whether email is answered',
        },
        {
          displayName: 'Deleted',
          name: ImapFlags.Deleted,
          type: 'boolean',
          default: false,
          description: 'Whether email is deleted',
        },
        {
          displayName: 'Draft',
          name: ImapFlags.Draft,
          type: 'boolean',
          default: false,
          description: 'Whether email is draft',
        },
        {
          displayName: 'Flagged',
          name: ImapFlags.Flagged,
          type: 'boolean',
          default: false,
          description: 'Whether email is flagged',
        },
        {
          displayName: 'Seen',
          name: ImapFlags.Seen,
          type: 'boolean',
          default: false,
          description: 'Whether email is seen',
        },
      ],
    },
  ],
  async executeImapAction(context: IExecuteFunctions, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    var returnData: INodeExecutionData[] = [];

    const mailboxPath = getMailboxPathFromNodeParameter(context, itemIndex);
    const emailUid = context.getNodeParameter('emailUid', itemIndex) as string;
    const flags = context.getNodeParameter('flags', itemIndex) as unknown as { [key: string]: boolean };

    var flagsToSet : string[] = [];
    var flagsToRemove : string[] = [];
    for (const flagName in flags) {
        if (flags[flagName]) {
          flagsToSet.push(flagName);
        } else {
          flagsToRemove.push(flagName);
        }
    }

    let jsonData: IDataObject = {
      uid: emailUid,
    };

    context.logger?.info(`Setting flags "${flagsToSet.join(',')}" and removing flags "${flagsToRemove.join(',')}" on email "${emailUid}"`);

    await client.mailboxOpen(mailboxPath, { readOnly: false });

    if (flagsToSet.length > 0) {
      const isSuccess : boolean = await client.messageFlagsAdd(emailUid, flagsToSet, {
        uid: true,
      });
      if (!isSuccess) {
        throw new NodeApiError(context.getNode(), {}, {
          message: "Unable to set flags, unknown error",
        });
      }
    }
    if (flagsToRemove.length > 0) {
      const isSuccess : boolean = await client.messageFlagsRemove(emailUid, flagsToRemove, {
        uid: true,
      });
      if (!isSuccess) {
        throw new NodeApiError(context.getNode(), {}, {
          message: "Unable to remove flags, unknown error",
        });
      }
    }
    
    returnData.push({
      json: jsonData,
    });

    return returnData;
  },
};
