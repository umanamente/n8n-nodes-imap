/*
This file contains utilities for generating the parameters that retreive data from the IMAP server.
E.g. the list of mailboxes, the list of emails in a mailbox, etc.
*/

import { ListResponse } from "imapflow";
import { IDataObject, IExecuteFunctions, ILoadOptionsFunctions, INodeListSearchResult, INodeProperties } from "n8n-workflow";
import { IMAP_CREDENTIALS_NAME, ImapCredentialsData } from "../../../credentials/ImapCredentials.credentials";
import { createImapClient } from "./ImapUtils";

export async function loadMailboxList(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
  const credentials = await this.getCredentials(IMAP_CREDENTIALS_NAME) as unknown as ImapCredentialsData;
  const client = createImapClient(credentials, this.logger);
  await client.connect();

  const mailboxes = await client.list();
  client.close();

  return {
    results: mailboxes.map((mailbox: ListResponse) => ({
      name: mailbox.path,
      value: mailbox.path,
    })),
  };
}

const DEFAULT_MAILBOX_PARAMETER_NAME = 'mailboxPath';
/**
 * base parameter for selecting a mailbox
 */
export const parameterSelectMailbox: INodeProperties  = {
  displayName: 'Mailbox',
  name: DEFAULT_MAILBOX_PARAMETER_NAME,
  type: 'resourceLocator',
  default: {
    mode: 'list',
    value: 'INBOX',
  },
  description: 'Select the mailbox',
  required: true,
  modes: [
    {
      displayName: 'List',
      name: 'list',
      type: 'list',
      typeOptions: {
        searchListMethod: 'loadMailboxList',
        searchable: false,
        searchFilterRequired: false
      }
    },
    {
      displayName: 'Path',
      name: 'path',
      type: 'string',
      hint: 'Full path to mailbox in the format same as returned by List Mailboxes operation',
      validation: [
      ],
      placeholder: 'Full path to mailbox',
    },
  ],
};


export function getMailboxPathFromNodeParameter(context: IExecuteFunctions, itemIndex: number,  paramName:string = DEFAULT_MAILBOX_PARAMETER_NAME): string {
  try {
    const mailboxPathObj = context.getNodeParameter(paramName, itemIndex) as IDataObject;
    // check if mailboxPathObj exists (could be undefined if mailboxPathObj is not required and not set)
    if (!mailboxPathObj) {
      return '';
    }
    // check if value exists
    if ("value" in mailboxPathObj === false) {
      return '';
    }
    const mailboxPath = mailboxPathObj['value'] as string;
    return mailboxPath;
  } catch (error) {
    return '';
  }
}
