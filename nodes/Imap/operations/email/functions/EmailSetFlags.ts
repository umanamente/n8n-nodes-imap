import { ImapFlow } from "imapflow";
import { IDataObject, IExecuteFunctions, INodeExecutionData, Logger as N8nLogger } from "n8n-workflow";
import { IResourceOperationDef } from "../../../utils/CommonDefinitions";
import { getMailboxPathFromNodeParameter, parameterSelectMailbox } from '../../../utils/SearchFieldParameters';
import { ImapFlowErrorCatcher, NodeImapError } from "../../../utils/ImapUtils";


export enum ImapFlags {
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
          displayName: 'Remove Flags',
          name: 'removeFlags',
          type: 'string',
          placeholder: '$label1 $label2',
          default: '',
          description: 'Define flags to remove, space-separated',
        },
        {
          displayName: 'Seen',
          name: ImapFlags.Seen,
          type: 'boolean',
          default: false,
          description: 'Whether email is seen',
        },
        {
          displayName: 'Set Flags',
          name: 'setFlags',
          type: 'string',
          placeholder: '$label1 $label2',
          default: '',
          description: 'Define flags to set, space-separated',
        },
      ],
    },
  ],
  async executeImapAction(context: IExecuteFunctions, logger: N8nLogger, itemIndex: number, client: ImapFlow): Promise<INodeExecutionData[] | null> {
    var returnData: INodeExecutionData[] = [];

    const mailboxPath = getMailboxPathFromNodeParameter(context, itemIndex);
    const emailUid = context.getNodeParameter('emailUid', itemIndex) as string;
    const flags = context.getNodeParameter('flags', itemIndex) as IDataObject;

    var flagsToSet : string[] = [];
    var flagsToRemove : string[] = [];
    for (const key in flags) {
        if (key === 'setFlags') {
            const customVal = flags[key] as string;
            if (customVal && customVal.trim() !== '') {
                const customList = customVal.split(/\s+/).map(f => f.trim()).filter(f => f !== '');
                flagsToSet.push(...customList);
            }
        } else if (key === 'removeFlags') {
            const customVal = flags[key] as string;
            if (customVal && customVal.trim() !== '') {
                const customList = customVal.split(/\s+/).map(f => f.trim()).filter(f => f !== '');
                flagsToRemove.push(...customList);
            }
        } else {
            if (flags[key] === true) {
              flagsToSet.push(key);
            } else {
              flagsToRemove.push(key);
            }
        }
    }

    let jsonData: IDataObject = {
      uid: emailUid,
    };

    logger.info(`Setting flags "${flagsToSet.join(',')}" and removing flags "${flagsToRemove.join(',')}" on email "${emailUid}"`);

    await client.mailboxOpen(mailboxPath, { readOnly: false });

    if (flagsToSet.length > 0) {
      ImapFlowErrorCatcher.getInstance().startErrorCatching();
      const isSuccess : boolean = await client.messageFlagsAdd(emailUid, flagsToSet, {
        uid: true,
      });
      if (!isSuccess) {
        const errorsList = ImapFlowErrorCatcher.getInstance().stopAndGetErrorsList();
        throw new NodeImapError(
          context.getNode(),
          "Unable to set flags",
          errorsList
        );
      }
    }
    if (flagsToRemove.length > 0) {
      const isSuccess : boolean = await client.messageFlagsRemove(emailUid, flagsToRemove, {
        uid: true,
      });
      if (!isSuccess) {
        const errorsList = ImapFlowErrorCatcher.getInstance().stopAndGetErrorsList();
        throw new NodeImapError(
          context.getNode(),
          "Unable to remove flags", 
          errorsList
        );
      }
    }
    
    returnData.push({
      json: jsonData,
    });

    return returnData;
  },
};
