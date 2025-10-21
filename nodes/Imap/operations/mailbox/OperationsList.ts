import { IResourceDef } from "../../utils/CommonDefinitions";
import { resourceMailbox } from "./ResourceName";
import { createMailboxOperation } from "./functions/MailboxCreate";
import { getMailboxListOperation } from "./functions/MailboxGetList";
import {getMailboxQuotaOperation} from "./functions/MailboxGetQuota";
import { getMailboxStatusOperation } from "./functions/MailboxGetStatus";
import { renameMailboxOperation } from "./functions/MailboxRename";

export const mailboxResourceDefinitions: IResourceDef = {
  resource: resourceMailbox,
  operationDefs: [
    getMailboxListOperation,
    getMailboxQuotaOperation,
    getMailboxStatusOperation,
    createMailboxOperation,
    renameMailboxOperation,
  ],
};


