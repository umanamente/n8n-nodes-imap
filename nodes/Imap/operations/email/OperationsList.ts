import { IResourceDef } from '../../utils/CommonDefinitions';
import { resourceEmail } from './ResourceName';
import { copyEmailOperation } from './functions/EmailCopy';
import { createDraftOperation } from './functions/EmailCreateDraft';
import { downloadAttachmentOperation } from './functions/EmailDownloadAttachment';
import { getEmailsListOperation } from './functions/EmailGetList';
import { moveEmailOperation } from './functions/EmailMove';
import { setEmailFlagsOperation } from './functions/EmailSetFlags';

export const emailResourceDefinitions: IResourceDef = {
	resource: resourceEmail,
	operationDefs: [
		getEmailsListOperation,
		downloadAttachmentOperation,
		moveEmailOperation,
		copyEmailOperation,
		setEmailFlagsOperation,
		createDraftOperation,
	],
};
