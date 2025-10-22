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

  describe('mailbox operations (read only)', () => {
    it('should successfully execute loadMailboxList operation', async () => {
      // Act
      const mailboxes = await getMailboxList();

      // Assert
      expect(mailboxes).toHaveLength(1);
      expect(mailboxes[0]).toEqual({
        name: 'INBOX',
        path: 'INBOX',
        status: false,
      });
    });

    it('should return mailboxes matching expected structure', async () => {
      // Define expected structure
      const expectedStructure = [
        {
          name: 'INBOX',
          path: 'INBOX',
          status: false,
        },
      ];

      // Act
      const mailboxes = await getMailboxList();

      // Assert - Test structure matches expected
      expect(mailboxes).toEqual(expectedStructure);
      
      // Assert - Verify each mailbox has required properties
      mailboxes.forEach(mailbox => {
        expect(mailbox).toHaveProperty('name');
        expect(mailbox).toHaveProperty('path');
        expect(mailbox).toHaveProperty('status');
        expect(typeof mailbox.name).toBe('string');
        expect(typeof mailbox.path).toBe('string');
      });
    });

  });


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
  });
});

