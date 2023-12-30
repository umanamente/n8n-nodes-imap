import { IResourceDef } from "../../utils/CommonDefinitions";
import { resourceMailbox } from "./ResourceName";
import { createMailboxOperation } from "./functions/MailboxCreate";
import { getMailboxListOperation } from "./functions/MailboxGetList";
import { getMailboxStatusOperation } from "./functions/MailboxGetStatus";
import { renameMailboxOperation } from "./functions/MailboxRename";

export const mailboxResourceDefinitions: IResourceDef = {
  resource: resourceMailbox,
  operationDefs: [
    getMailboxListOperation,
    getMailboxStatusOperation,
    createMailboxOperation,
    renameMailboxOperation,

    // removed because it is dangerous, unless there will be a request to add it
    //deleteMailboxOperation,
  ],
};


