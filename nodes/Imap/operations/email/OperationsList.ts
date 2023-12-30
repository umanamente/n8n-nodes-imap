import { IResourceDef } from "../../utils/CommonDefinitions";
import { resourceEmail } from "./ResourceName";
import { downloadAttachmentOperation } from "./functions/EmailDownloadAttachment";
import { getEmailsListOperation } from "./functions/EmailGetList";
import { moveEmailOperation } from "./functions/EmailMove";

export const emailResourceDefinitions: IResourceDef = {
  resource: resourceEmail,
  operationDefs: [
    getEmailsListOperation,
    downloadAttachmentOperation,
    moveEmailOperation,
  ],
};


