import { IResourceDef } from '../../utils/CommonDefinitions';
import { resourceEmail } from './ResourceName';
import { copyEmailOperation } from './functions/EmailCopy';
import { createDraftOperation } from './functions/EmailCreateDraft';
import { downloadOperation } from './functions/EmailDownload';
import { downloadAttachmentOperation } from './functions/EmailDownloadAttachment';
import { getEmailsListOperation } from './functions/EmailGetList';
import { moveEmailOperation } from './functions/EmailMove';
import { setEmailFlagsOperation } from './functions/EmailSetFlags';
import { createReplyOperation } from './functions/EmailReply';

export const emailResourceDefinitions: IResourceDef = {
	resource: resourceEmail,
	operationDefs: [
		getEmailsListOperation,
		downloadOperation,
		downloadAttachmentOperation,
		moveEmailOperation,
		copyEmailOperation,
		setEmailFlagsOperation,
		createDraftOperation,
		createReplyOperation,
	],
};
