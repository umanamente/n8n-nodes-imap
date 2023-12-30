/*
This file contains the list of all resources that are available for the ImapNode.
Each resource is located in a separate directory along with its operations.
*/

import { IResourceDef } from "../utils/CommonDefinitions";
import { emailResourceDefinitions } from "./email/OperationsList";
import { mailboxResourceDefinitions } from "./mailbox/OperationsList";

export const allResourceDefinitions: IResourceDef[] = [
  mailboxResourceDefinitions,
  emailResourceDefinitions,
];
