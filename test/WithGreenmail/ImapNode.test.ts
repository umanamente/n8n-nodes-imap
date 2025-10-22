/**
 * Integration tests for Imap Node class with GreenMail server
 * 
 * These tests verify the complete functionality of the Imap node implementation
 * using a real GreenMail IMAP server running in Docker.
 */

import { IExecuteFunctions } from 'n8n-workflow';
import { Imap } from '../../nodes/Imap/Imap.node';
import { describeWithGreenMail, GreenMailServer } from '../TestUtils/Greenmail/greenmail';
import { createNodeParametersCheckerMock } from '../TestUtils/N8nMocks';
import { getGlobalGreenmail } from './setup';
import { ImapCredentialsData } from '../../credentials/ImapCredentials.credentials';
import { EmailParts } from '../../nodes/Imap/operations/email/functions/EmailGetList';


const EML_WITH_ATTACHMENTS = `
Content-Type: multipart/mixed; boundary="===============8319016768625485467=="
MIME-Version: 1.0
From: test@example.com
To: recipient@example.com
Subject: Test email with HTML and small attachments

--===============8319016768625485467==
Content-Type: multipart/alternative;
 boundary="===============7528588175812193873=="
MIME-Version: 1.0

--===============7528588175812193873==
Content-Type: text/plain; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit

This is a test email with plain text and HTML parts, plus two attachments.
--===============7528588175812193873==
Content-Type: text/html; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit

<html><body><p>This is a <b>test email</b> with <i>HTML</i> content and two attachments.</p></body></html>
--===============7528588175812193873==--

--===============8319016768625485467==
Content-Type: text/plain
MIME-Version: 1.0
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="hello.txt"

SGVsbG8gd29ybGQh

--===============8319016768625485467==
Content-Type: image/png
MIME-Version: 1.0
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="tiny.png"

iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGNgAAAAAgAB4iG8MwAA
AABJRU5ErkJggg==

--===============8319016768625485467==--
`.trim().replace(/\r\n/g, '\n');


describeWithGreenMail('Imap Node - with GreenMail', () => {
  let imap: Imap;
  let greenmail: GreenMailServer;
  let credentials: ImapCredentialsData;

  beforeAll(async () => {
    // Reset Greenmail before all tests to ensure clean state
    greenmail = getGlobalGreenmail();
    await greenmail.reset();
    credentials = greenmail.getCredentials('test@example.com');
  });

  beforeEach(() => {
    // Reset the Imap instance before each test
    imap = new Imap();
  });

  /**
   * Helper function to get the list of mailboxes from the IMAP server
   * @param includeStatusFields - Array of status fields to include (optional)
   * @returns Array of mailbox objects with their properties
   */
  async function getMailboxList(includeStatusFields: string[] = []): Promise<any[]> {
    const paramValues = {
      authentication: 'imapThisNode',
      resource: 'mailbox',
      operation: 'loadMailboxList',
      includeStatusFields,
    };
    const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);
    
    context.getCredentials = jest.fn().mockResolvedValue(credentials);
    context.getInputData = jest.fn().mockReturnValue([1]);
    
    const resultData = await imap.execute.call(context as IExecuteFunctions);
    
    // Extract the mailbox list from the result data structure
    return resultData?.[0]?.map((item: any) => item.json) || [];
  }

  describe('sequence test (read and write operations)', () => {

    let currentEmailUid: number;

    it('should successfully create a top level mailbox', async () => {
      // Create a mock parameters checker for testing
      const paramValues = {
        authentication: 'imapThisNode',
        resource: 'mailbox',
        operation: 'createMailbox',
        mailboxName: 'TestMailbox',
      };
      const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);
      
      // Mock getCredentials to return ImapCredentialsData
      context.getCredentials = jest.fn().mockResolvedValue(credentials);
      context.getInputData = jest.fn().mockReturnValue([1]);

      // Act
      const resultData = await imap.execute.call(context as IExecuteFunctions);
      // Assert
      expect(resultData).toHaveLength(1);
      expect(resultData[0]).toHaveLength(1);
      expect(resultData?.[0]?.[0]?.json).toEqual(
        {
          created: true,
          path: "TestMailbox",
        }
      );
    });

    it('should successfully list mailboxes after creating a new one', async () => {
      // Act
      const mailboxes = await getMailboxList();

      // Assert
      expect(mailboxes).toHaveLength(2);
      expect(mailboxes).toEqual([
        {
          "name": "INBOX",
          "path": "INBOX",
          "status": false
        },
        {
          "name": "TestMailbox",
          "path": "TestMailbox",
          "status": false
        }
      ]);
    });


    it('should successfully rename a mailbox', async () => {
      // Create a mock parameters checker for testing
      const paramValues = {
        authentication: 'imapThisNode',
        resource: 'mailbox',
        operation: 'renameMailbox',
        mailboxPath: {"value":'TestMailbox'},
        newMailboxName: 'TopLevelMailbox',
      };
      const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);

      // Mock getCredentials to return ImapCredentialsData
      context.getCredentials = jest.fn().mockResolvedValue(credentials);
      context.getInputData = jest.fn().mockReturnValue([1]);
      // Act
      const resultData = await imap.execute.call(context as IExecuteFunctions);
      // Assert
      expect(resultData).toHaveLength(1);
      expect(resultData[0]).toHaveLength(1);
      expect(resultData?.[0]?.[0]?.json).toEqual(
        {
          newPath: 'TopLevelMailbox',
          path: 'TestMailbox',
        }
      );
    });

    it('should successfully list mailboxes after renaming one', async () => {
      // Act
      const mailboxes = await getMailboxList();

      // Assert
      expect(mailboxes).toHaveLength(2);
      expect(mailboxes).toEqual([
        {
          "path": "INBOX",
          "name": "INBOX",
          "status": false
        },
        {
          "path": "TopLevelMailbox",
          "name": "TopLevelMailbox",
          "status": false
        },
      ]);
    });


    it('should successfully create a child mailbox', async () => {
      // Create a mock parameters checker for testing
      const paramValues = {
        authentication: 'imapThisNode',
        resource: 'mailbox',
        operation: 'createMailbox',
        topLevelMailbox: false,
        mailboxPath: {"value":'TopLevelMailbox'},
        mailboxName: 'ChildMailbox',
      };
      const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);

      // Mock getCredentials to return ImapCredentialsData
      context.getCredentials = jest.fn().mockResolvedValue(credentials);
      context.getInputData = jest.fn().mockReturnValue([1]);

      // Act
      const resultData = await imap.execute.call(context as IExecuteFunctions);
      // Assert
      expect(resultData).toHaveLength(1);
      expect(resultData[0]).toHaveLength(1);
      expect(resultData?.[0]?.[0]?.json).toEqual(
        {
          created: true,
          path: "TopLevelMailbox.ChildMailbox",
        }
      );

    });

    it('should successfully list mailboxes after creating a child mailbox', async () => {
      // Act
      const mailboxes = await getMailboxList();

      // Assert
      expect(mailboxes).toHaveLength(3);
      expect(mailboxes).toEqual([
        {
          "path": "INBOX",
          "name": "INBOX",
          "status": false
        },
        {
          "path": "TopLevelMailbox",
          "name": "TopLevelMailbox",
          "status": false
        },
        {
          "path": "TopLevelMailbox.ChildMailbox",
          "name": "ChildMailbox",
          "status": false
        }
      ]);
    });

    it('should successfully create an email draft in the child mailbox', async () => {
      // Create a mock parameters checker for testing
      const paramValues = {
        authentication: 'imapThisNode',
        resource: 'email',
        operation: 'createDraft',
        destinationMailbox: {"value": 'TopLevelMailbox'},
        inputFormat: 'fields',
        subject: 'Test Draft Email',
        from: 'test@example.com',
        to: 'recipient@example.com',
        text: 'This is a test draft email body.',
      };
      const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);

      // Mock getCredentials to return ImapCredentialsData
      context.getCredentials = jest.fn().mockResolvedValue(credentials);
      context.getInputData = jest.fn().mockReturnValue([1]);

      // Act
      const resultData = await imap.execute.call(context as IExecuteFunctions);

      // Assert
      expect(resultData).toHaveLength(1);
      expect(resultData[0]).toHaveLength(1);
      expect(resultData?.[0]?.[0]?.json).toHaveProperty('uid');
      expect(resultData?.[0]?.[0]?.json).toHaveProperty('path');
      expect(resultData?.[0]?.[0]?.json?.path).toBe('TopLevelMailbox');

      // set currentEmailUid for next test
      currentEmailUid = resultData?.[0]?.[0]?.json?.uid as number;
    });

    it('should successfully list mailboxes with email counts included', async () => {
      // Act
      const mailboxes = await getMailboxList([
        'includeMessageCount',
        'includeUnseenCount',
      ]);

      // Assert
      expect(mailboxes).toHaveLength(3);
      expect(mailboxes).toEqual([
        {
          "path": "INBOX",
          "name": "INBOX",
          "status": {
            "path": "INBOX",
            "messages":0,
            "unseen":0
          }
        },
        {
          "path": "TopLevelMailbox",
          "name": "TopLevelMailbox",
          "status": {
            "path": "TopLevelMailbox",
            "messages":1,
            "unseen":1
          }
        },
        {
          "path": "TopLevelMailbox.ChildMailbox",
          "name": "ChildMailbox",
          "status": {
            "path": "TopLevelMailbox.ChildMailbox",
            "messages":0,
            "unseen":0
          }
        }
      ]);
    });

    it('should successfully get mailbox status for TopLevelMailbox', async () => {
      // Create a mock parameters checker for testing
      const paramValues = {
        authentication: 'imapThisNode',
        resource: 'mailbox',
        operation: 'getMailboxStatus',
        mailboxPath: {"value":'TopLevelMailbox'},
      };
      const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);
      // Mock getCredentials to return ImapCredentialsData
      context.getCredentials = jest.fn().mockResolvedValue(credentials);
      context.getInputData = jest.fn().mockReturnValue([1]);

      // Act
      const resultData = await imap.execute.call(context as IExecuteFunctions);
      // Assert
      expect(resultData).toHaveLength(1);
      expect(resultData[0]).toHaveLength(1);
      expect(resultData?.[0]?.[0]?.json).toEqual(
        {
          "path": "TopLevelMailbox",
          "messages": 1,
          "recent": expect.any(Number),
          "unseen": 1,
          "uidNext": expect.any(Number),
          "uidValidity": expect.any(String)
        }
      );
    });

    it('should successfully copy an email from TopLevelMailbox to INBOX', async () => {
      // Create a mock parameters checker for testing
      const paramValues = {
        authentication: 'imapThisNode',
        resource: 'email',
        operation: 'copyEmail',
        sourceMailbox: {"value": 'TopLevelMailbox'},
        destinationMailbox: {"value": 'INBOX'},
        emailUid: currentEmailUid.toString(),
      };
      const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);
      // Mock getCredentials to return ImapCredentialsData
      context.getCredentials = jest.fn().mockResolvedValue(credentials);
      context.getInputData = jest.fn().mockReturnValue([{
        uid: 1, // assuming the draft email created earlier has UID 1
      }]);
      // Act
      const resultData = await imap.execute.call(context as IExecuteFunctions);
      // Assert
      expect(resultData).toHaveLength(1);
      expect(resultData[0]).toHaveLength(1);
      expect(resultData?.[0]?.[0]?.json).toEqual(
        {
          "destination": "INBOX",
          "path": "TopLevelMailbox",
          "uidMap": expect.any(Object),
          "uidValidity": expect.any(String),
        }
      );
    });

    it('should successfully retrieve a list of emails in INBOX', async () => {
      // Create a mock parameters checker for testing
      const paramValues = {
        authentication: 'imapThisNode',
        resource: 'email',
        operation: 'getEmailsList',
        mailboxPath: {"value": 'INBOX'},
        emailDateRange: {},
        emailFlags: {},
        emailSearchFilters: {},
        includeParts: ["textContent"]
      };
      const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);
      // Mock getCredentials to return ImapCredentialsData
      context.getCredentials = jest.fn().mockResolvedValue(credentials);
      context.getInputData = jest.fn().mockReturnValue([1]);
      // Act
      const resultData = await imap.execute.call(context as IExecuteFunctions);
      // Assert
      expect(resultData).toHaveLength(1);
      expect(resultData[0].length).toBeGreaterThan(0);
      const emailItem = resultData?.[0]?.find(item => item.json.uid === currentEmailUid);
      expect(emailItem).toBeDefined();
      expect(emailItem?.json).toHaveProperty('envelope.subject', 'Test Draft Email');
    });

    it('should successfully create an email from RFC822 content', async () => {
      // Create a mock parameters checker for testing
      const paramValues = {
        authentication: 'imapThisNode',
        resource: 'email',
        operation: 'createDraft',
        destinationMailbox: {"value": 'TopLevelMailbox.ChildMailbox'},
        inputFormat: 'rfc822',
        rfc822: EML_WITH_ATTACHMENTS,
      };
      const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);
      // Mock getCredentials to return ImapCredentialsData
      context.getCredentials = jest.fn().mockResolvedValue(credentials);
      context.getInputData = jest.fn().mockReturnValue([1]);
      // Act
      const resultData = await imap.execute.call(context as IExecuteFunctions);
      // Assert
      expect(resultData).toHaveLength(1);
      expect(resultData[0]).toHaveLength(1);
      expect(resultData?.[0]?.[0]?.json).toHaveProperty('uid');
      expect(resultData?.[0]?.[0]?.json).toHaveProperty('path');
      expect(resultData?.[0]?.[0]?.json?.path).toBe('TopLevelMailbox.ChildMailbox');
    });

    it('should successfully download email RFC822 content with attachments', async () => {
      // First, create the email in the mailbox
      const createParamValues = {
        authentication: 'imapThisNode',
        resource: 'email',
        operation: 'downloadEml',
        mailboxPath: {"value": 'TopLevelMailbox.ChildMailbox'},
        emailUid: '1',
        outputToBinary: false,
        binaryPropertyName: 'emlData',
      };
      const createContext = createNodeParametersCheckerMock(imap.description.properties, createParamValues);
      // Mock getCredentials to return ImapCredentialsData
      createContext.getCredentials = jest.fn().mockResolvedValue(credentials);
      createContext.getInputData = jest.fn().mockReturnValue([1]);
      // Act
      const resultData = await imap.execute.call(createContext as IExecuteFunctions);
      // Assert
      expect(resultData).toHaveLength(1);
      expect(resultData[0]).toHaveLength(1);
      const emailItem = resultData?.[0]?.[0];
          
      expect(emailItem.json).toHaveProperty('uid', 1);
      expect(emailItem.json).toHaveProperty('emlContent');
    
      const normalizedEmlContent = emailItem.json.emlContent && (emailItem.json.emlContent as string).replace(/\r\n/g, '\n').trim();
      
      expect(normalizedEmlContent).toBe(EML_WITH_ATTACHMENTS.trim());
    });

    it('should successfully retrieve a list of emails in ChildMailbox with all parts', async () => {
      // Create a mock parameters checker for testing
      const paramValues = {
        authentication: 'imapThisNode',
        resource: 'email',
        operation: 'getEmailsList',
        mailboxPath: {"value": 'TopLevelMailbox.ChildMailbox'},
        emailDateRange: {},
        emailFlags: {},
        emailSearchFilters: {},
        includeParts: [
          EmailParts.BodyStructure,
          EmailParts.Flags,
          EmailParts.Size,
          EmailParts.TextContent,
          EmailParts.Headers,
          EmailParts.AttachmentsInfo          
        ],
        includeAllHeaders: true,
      };
      const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);
      // Mock getCredentials to return ImapCredentialsData
      context.getCredentials = jest.fn().mockResolvedValue(credentials);
      context.getInputData = jest.fn().mockReturnValue([1]);
      // Act
      const resultData = await imap.execute.call(context as IExecuteFunctions);

      // Assert
      expect(resultData).toHaveLength(1);
      expect(resultData[0].length).toBeGreaterThan(0);
      const emailItem = resultData?.[0]?.[0];
      expect(emailItem).toBeDefined();
      expect(emailItem?.json).toHaveProperty('envelope.subject', 'Test email with HTML and small attachments');
      expect(emailItem?.json).toHaveProperty('bodyStructure.childNodes');
      expect(emailItem?.json).toHaveProperty('attachmentsInfo');
    });

    it('should successfully download email attachments (all)', async () => {
      // Create a mock parameters checker for testing
      const paramValues = {
        authentication: 'imapThisNode',
        resource: 'email',
        operation: 'downloadAttachment',
        mailboxPath: {"value": 'TopLevelMailbox.ChildMailbox'},
        emailUid: '1',
        allAttachments: true,
        includeInlineAttachments: true,
      };
      const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);
      // Mock getCredentials to return ImapCredentialsData
      context.getCredentials = jest.fn().mockResolvedValue(credentials);
      context.getInputData = jest.fn().mockReturnValue([1]);
      context.helpers = {
        prepareBinaryData: jest.fn().mockImplementation((data: Buffer, filename: string) => {
          return {
            data,
            fileName: filename,
            mimeType: 'application/octet-stream',
          };
        }),
      } as any;
      // Act
      const resultData = await imap.execute.call(context as IExecuteFunctions);

      console.log("Downloaded Attachments Result:", JSON.stringify(resultData, null, 2));
      // Assert
      expect(resultData).toHaveLength(1);
      expect(resultData[0]).toHaveLength(1);
      const emailItem = resultData?.[0]?.[0];
          
      // expect(emailItem.json).toHaveProperty('uid', 1);
      expect(emailItem.json).toHaveProperty('attachments');
      
      // Check attachments metadata in json
      const attachmentsInfo = emailItem.json.attachments as any[];
      expect(attachmentsInfo).toBeInstanceOf(Array);
      expect(attachmentsInfo).toHaveLength(2);
      
      // Check first attachment metadata
      expect(attachmentsInfo[0]).toMatchObject({
        partId: '2',
        binaryFieldName: 'attachment_0',
        contentType: 'text/plain',
        encoding: 'base64',
        disposition: 'attachment',
        filename: 'hello.txt'
      });
      
      // Check second attachment metadata
      expect(attachmentsInfo[1]).toMatchObject({
        partId: '3',
        binaryFieldName: 'attachment_1',
        contentType: 'image/png',
        encoding: 'base64',
        disposition: 'attachment',
        filename: 'tiny.png'
      });
      
      // Check binary data exists
      expect(emailItem.binary).toBeDefined();
      expect(emailItem.binary).toHaveProperty('attachment_0');
      expect(emailItem.binary).toHaveProperty('attachment_1');
      
      // Check first binary attachment
      expect(emailItem.binary?.attachment_0).toMatchObject({
        fileName: 'hello.txt',
        mimeType: 'application/octet-stream'
      });
      expect(emailItem.binary?.attachment_0?.data).toBeDefined();
      
      // Check second binary attachment
      expect(emailItem.binary?.attachment_1).toMatchObject({
        fileName: 'tiny.png',
        mimeType: 'application/octet-stream'
      });
      expect(emailItem.binary?.attachment_1?.data).toBeDefined();

    });




  }); // describe sequence test (read and write operations)
}); // describe Imap Node with GreenMail

