import { IResourceDef } from '../../utils/CommonDefinitions';
import { resourceEmail } from './ResourceName';
import { copyEmailOperation } from './functions/EmailCopy';
import { createDraftOperation } from './functions/EmailCreateDraft';
import { downloadOperation } from './functions/EmailDownload';
import { downloadAttachmentOperation } from './functions/EmailDownloadAttachment';
import { deleteEmailOperation } from './functions/EmailDelete';
import { getEmailsListOperation } from './functions/EmailGetList';
import { moveEmailOperation } from './functions/EmailMove';
import { setEmailFlagsOperation } from './functions/EmailSetFlags';

export const emailResourceDefinitions: IResourceDef = {
	resource: resourceEmail,
	operationDefs: [
		getEmailsListOperation,
		downloadOperation,
		downloadAttachmentOperation,
		deleteEmailOperation,
		moveEmailOperation,
		copyEmailOperation,
		setEmailFlagsOperation,
		createDraftOperation,
	],
};
