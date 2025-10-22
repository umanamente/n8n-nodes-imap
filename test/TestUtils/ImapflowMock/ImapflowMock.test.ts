/**
 * Tests for the ImapFlow mock implementation
 */

import { MockImapServer, createImapflowMock } from './ImapflowMock';

describe('createImapflowMock', () => {
  let server: MockImapServer;
  const testUser = 'test@example.com';
  const testPassword = 'password123';

  beforeEach(() => {
    server = new MockImapServer();
    const user = server.addUser(testUser, testPassword);
    // Create some test mailboxes
    user.createMailbox('Sent');
    user.createMailbox('Drafts');
  });

  describe('authentication', () => {
    it('should successfully connect with valid credentials', async () => {
      // Arrange
      const mockClient = createImapflowMock(server, {
        user: testUser,
        password: testPassword,
      });

      // Act
      await mockClient.connect();

      // Assert
      expect(mockClient.authenticated).toBe(true);
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should fail to connect with invalid password', async () => {
      // Arrange
      const mockClient = createImapflowMock(server, {
        user: testUser,
        password: 'wrongpassword',
      });

      // Act & Assert
      await expect(mockClient.connect()).rejects.toThrow('Invalid credentials');
      expect(mockClient.authenticated).toBe(false);
    });

    it('should successfully logout', async () => {
      // Arrange
      const mockClient = createImapflowMock(server, {
        user: testUser,
        password: testPassword,
      });
      await mockClient.connect();

      // Act
      await mockClient.logout();

      // Assert
      expect(mockClient.authenticated).toBe(false);
      expect(mockClient.logout).toHaveBeenCalledTimes(1);
    });
  });

  describe('mailbox operations', () => {
    it('should list mailboxes', async () => {
      // Arrange
      const mockClient = createImapflowMock(server, {
        user: testUser,
        password: testPassword,
      });
      await mockClient.connect();

      // Act
      const mailboxes = await mockClient.list();

      // Assert
      expect(mailboxes).toHaveLength(3); // INBOX, Sent, Drafts
      expect(mailboxes[0]).toMatchObject({
        name: 'INBOX',
        path: 'INBOX',
      });
      expect(mockClient.list).toHaveBeenCalledTimes(1);
    });

    it('should fail to list mailboxes when not authenticated', async () => {
      // Arrange
      const mockClient = createImapflowMock(server, {
        user: testUser,
        password: testPassword,
      });

      // Act & Assert
      await expect(mockClient.list()).rejects.toThrow('Not authenticated');
    });

    it('should get mailbox lock', async () => {
      // Arrange
      const mockClient = createImapflowMock(server, {
        user: testUser,
        password: testPassword,
      });
      await mockClient.connect();

      // Act
      const lock = await mockClient.getMailboxLock('INBOX');

      // Assert
      expect(lock).toBeDefined();
      expect(lock.path).toBe('INBOX');
      expect(lock.release).toBeDefined();
      expect(typeof lock.release).toBe('function');
    });

    it('should get mailbox status', async () => {
      // Arrange
      const mockClient = createImapflowMock(server, {
        user: testUser,
        password: testPassword,
      });
      await mockClient.connect();
      const user = server.getUser(testUser)!;
      user.createEmail('INBOX', 'Test email content');

      // Act
      const status = await mockClient.status('INBOX');

      // Assert
      expect(status).toMatchObject({
        messages: 1,
        uidNext: 2,
      });
    });
  });

  describe('email operations', () => {
    it('should append an email to a mailbox', async () => {
      // Arrange
      const mockClient = createImapflowMock(server, {
        user: testUser,
        password: testPassword,
      });
      await mockClient.connect();
      const emailContent = 'From: sender@example.com\r\nSubject: Test\r\n\r\nTest body';

      // Act
      const result = await mockClient.append('INBOX', emailContent, ['\\Seen']);

      // Assert
      expect(result).toMatchObject({
        uid: 1,
        path: 'INBOX',
      });
      expect(mockClient.append).toHaveBeenCalledWith('INBOX', emailContent, ['\\Seen']);
    });

    it('should fetch an email by UID', async () => {
      // Arrange
      const mockClient = createImapflowMock(server, {
        user: testUser,
        password: testPassword,
      });
      await mockClient.connect();
      const user = server.getUser(testUser)!;
      const emailContent = 'From: sender@example.com\r\nSubject: Test\r\n\r\nTest body';
      user.createEmail('INBOX', emailContent);
      await mockClient.getMailboxLock('INBOX');

      // Act
      const email = await mockClient.fetchOne(1, { source: true });

      // Assert
      expect(email).toBeDefined();
      expect(email.uid).toBe(1);
      expect(email.source).toBeDefined();
    });

    it('should search for emails in a mailbox', async () => {
      // Arrange
      const mockClient = createImapflowMock(server, {
        user: testUser,
        password: testPassword,
      });
      await mockClient.connect();
      const user = server.getUser(testUser)!;
      user.createEmail('INBOX', 'Email 1');
      user.createEmail('INBOX', 'Email 2');
      await mockClient.getMailboxLock('INBOX');

      // Act
      const uids = await mockClient.search({});

      // Assert
      expect(uids).toHaveLength(2);
      expect(uids).toContain(1);
      expect(uids).toContain(2);
    });

    it('should delete an email by UID', async () => {
      // Arrange
      const mockClient = createImapflowMock(server, {
        user: testUser,
        password: testPassword,
      });
      await mockClient.connect();
      const user = server.getUser(testUser)!;
      user.createEmail('INBOX', 'Email to delete');
      await mockClient.getMailboxLock('INBOX');

      // Act
      const result = await mockClient.messageDelete(1);

      // Assert
      expect(result).toBe(true);
      expect(user.getEmail('INBOX', 1)).toBeUndefined();
    });

    it('should copy an email to another mailbox', async () => {
      // Arrange
      const mockClient = createImapflowMock(server, {
        user: testUser,
        password: testPassword,
      });
      await mockClient.connect();
      const user = server.getUser(testUser)!;
      const emailContent = 'Email to copy';
      user.createEmail('INBOX', emailContent);
      await mockClient.getMailboxLock('INBOX');

      // Act
      const result = await mockClient.messageCopy(1, 'Sent');

      // Assert
      expect(result).toMatchObject({
        uid: 1,
        destination: 'Sent',
      });
      // Original email should still exist
      expect(user.getEmail('INBOX', 1)).toBeDefined();
      // Copy should exist in destination
      expect(user.getEmail('Sent', 1)).toBeDefined();
    });

    it('should move an email to another mailbox', async () => {
      // Arrange
      const mockClient = createImapflowMock(server, {
        user: testUser,
        password: testPassword,
      });
      await mockClient.connect();
      const user = server.getUser(testUser)!;
      const emailContent = 'Email to move';
      user.createEmail('INBOX', emailContent);
      await mockClient.getMailboxLock('INBOX');

      // Act
      const result = await mockClient.messageMove(1, 'Sent');

      // Assert
      expect(result).toMatchObject({
        uid: 1,
        destination: 'Sent',
      });
      // Original email should be deleted
      expect(user.getEmail('INBOX', 1)).toBeUndefined();
      // Email should exist in destination
      expect(user.getEmail('Sent', 1)).toBeDefined();
    });

    it('should set flags on an email', async () => {
      // Arrange
      const mockClient = createImapflowMock(server, {
        user: testUser,
        password: testPassword,
      });
      await mockClient.connect();
      const user = server.getUser(testUser)!;
      user.createEmail('INBOX', 'Email with flags');
      await mockClient.getMailboxLock('INBOX');

      // Act
      const result = await mockClient.setFlags(1, ['\\Seen', '\\Flagged']);

      // Assert
      expect(result).toBe(true);
      const email = user.getEmail('INBOX', 1);
      expect(email?.flags).toContain('\\Seen');
      expect(email?.flags).toContain('\\Flagged');
    });
  });

  describe('error handling', () => {
    it('should throw error when accessing mailbox without authentication', async () => {
      // Arrange
      const mockClient = createImapflowMock(server, {
        user: testUser,
        password: testPassword,
      });

      // Act & Assert
      await expect(mockClient.getMailboxLock('INBOX')).rejects.toThrow('Not authenticated');
    });

    it('should throw error when accessing non-existent mailbox', async () => {
      // Arrange
      const mockClient = createImapflowMock(server, {
        user: testUser,
        password: testPassword,
      });
      await mockClient.connect();

      // Act & Assert
      await expect(mockClient.getMailboxLock('NonExistent')).rejects.toThrow(
        "Mailbox 'NonExistent' not found"
      );
    });

    it('should throw error when searching without mailbox lock', async () => {
      // Arrange
      const mockClient = createImapflowMock(server, {
        user: testUser,
        password: testPassword,
      });
      await mockClient.connect();

      // Act & Assert
      await expect(mockClient.search({})).rejects.toThrow('Not authenticated or no mailbox selected');
    });
  });
});
