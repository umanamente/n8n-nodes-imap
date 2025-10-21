import { ImapCredentialsData } from "../../../credentials/ImapCredentials.credentials";

/**
 * Represents an email stored in a mailbox
 */
interface MockEmail {
  uid: number;
  rfc822Data: string | Buffer;
  flags: string[];
  internalDate?: Date;
}

/**
 * Represents a mailbox (folder) in the mock IMAP server
 */
interface MockMailbox {
  path: string;
  name: string;
  emails: Map<number, MockEmail>; // uid -> email
  uidNext: number;
  uidValidity: number;
  delimiter: string;
  flags: string[];
  specialUse?: string;
}

/**
 * Mock IMAP server user that stores mailboxes and emails for testing.
 * Does not implement actual network facilities.
 */
class MockImapServerUser {
  private mailboxes: Map<string, MockMailbox>;
  private login: string;
  private password: string;

  constructor(login: string, password: string) {
    this.login = login;
    this.password = password;
    this.mailboxes = new Map();
    
    // Create default INBOX
    this.createMailbox('INBOX');
  }

  /**
   * Get the user's login
   */
  getLogin(): string {
    return this.login;
  }

  /**
   * Get the user's password
   */
  getPassword(): string {
    return this.password;
  }

  /**
   * Get all mailboxes for this user
   * @returns Array of mailbox objects
   */
  getMailboxes(): MockMailbox[] {
    return Array.from(this.mailboxes.values()).map(mb => ({
      path: mb.path,
      name: mb.name,
      emails: new Map(mb.emails), // Return a copy
      uidNext: mb.uidNext,
      uidValidity: mb.uidValidity,
      delimiter: mb.delimiter,
      flags: [...mb.flags],
      specialUse: mb.specialUse,
    }));
  }

  /**
   * Get a specific mailbox by path
   * @param path Mailbox path (e.g., 'INBOX', 'Sent', 'Drafts')
   * @returns Mailbox object or undefined if not found
   */
  getMailbox(path: string): MockMailbox | undefined {
    return this.mailboxes.get(path);
  }

  /**
   * Create a new mailbox
   * @param path Mailbox path (e.g., 'INBOX', 'Sent', 'Drafts')
   * @param options Optional mailbox configuration
   * @returns The created mailbox
   */
  createMailbox(
    path: string,
    options?: {
      delimiter?: string;
      flags?: string[];
      specialUse?: string;
    }
  ): MockMailbox {
    if (this.mailboxes.has(path)) {
      throw new Error(`Mailbox '${path}' already exists`);
    }

    const pathParts = path.split(options?.delimiter || '/');
    const name = pathParts[pathParts.length - 1];

    const mailbox: MockMailbox = {
      path,
      name,
      emails: new Map(),
      uidNext: 1,
      uidValidity: Math.floor(Date.now() / 1000), // Unix timestamp
      delimiter: options?.delimiter || '/',
      flags: options?.flags || ['\\HasNoChildren'],
      specialUse: options?.specialUse,
    };

    this.mailboxes.set(path, mailbox);
    return mailbox;
  }

  /**
   * Delete a mailbox
   * @param path Mailbox path
   * @returns True if deleted, false if not found
   */
  deleteMailbox(path: string): boolean {
    if (path === 'INBOX') {
      throw new Error('Cannot delete INBOX');
    }
    return this.mailboxes.delete(path);
  }

  /**
   * Get all emails from a specific mailbox
   * @param mailboxPath Mailbox path
   * @returns Array of emails or undefined if mailbox not found
   */
  getEmails(mailboxPath: string): MockEmail[] | undefined {
    const mailbox = this.mailboxes.get(mailboxPath);
    if (!mailbox) {
      return undefined;
    }
    return Array.from(mailbox.emails.values()).map(email => ({
      uid: email.uid,
      rfc822Data: email.rfc822Data,
      flags: [...email.flags],
      internalDate: email.internalDate,
    }));
  }

  /**
   * Get a specific email by UID from a mailbox
   * @param mailboxPath Mailbox path
   * @param uid Email UID
   * @returns Email object or undefined if not found
   */
  getEmail(mailboxPath: string, uid: number): MockEmail | undefined {
    const mailbox = this.mailboxes.get(mailboxPath);
    if (!mailbox) {
      return undefined;
    }
    return mailbox.emails.get(uid);
  }

  /**
   * Create (append) a new email in a mailbox with RFC822 data
   * @param mailboxPath Mailbox path
   * @param rfc822Data RFC822 email data (raw email content)
   * @param options Optional email configuration
   * @returns The UID of the created email
   */
  createEmail(
    mailboxPath: string,
    rfc822Data: string | Buffer,
    options?: {
      flags?: string[];
      internalDate?: Date;
    }
  ): number {
    const mailbox = this.mailboxes.get(mailboxPath);
    if (!mailbox) {
      throw new Error(`Mailbox '${mailboxPath}' not found`);
    }

    const uid = mailbox.uidNext++;
    const email: MockEmail = {
      uid,
      rfc822Data,
      flags: options?.flags || [],
      internalDate: options?.internalDate || new Date(),
    };

    mailbox.emails.set(uid, email);
    return uid;
  }

  /**
   * Delete an email from a mailbox
   * @param mailboxPath Mailbox path
   * @param uid Email UID
   * @returns True if deleted, false if not found
   */
  deleteEmail(mailboxPath: string, uid: number): boolean {
    const mailbox = this.mailboxes.get(mailboxPath);
    if (!mailbox) {
      return false;
    }
    return mailbox.emails.delete(uid);
  }

  /**
   * Update email flags
   * @param mailboxPath Mailbox path
   * @param uid Email UID
   * @param flags New flags to set
   * @returns True if updated, false if email not found
   */
  setEmailFlags(mailboxPath: string, uid: number, flags: string[]): boolean {
    const mailbox = this.mailboxes.get(mailboxPath);
    if (!mailbox) {
      return false;
    }
    const email = mailbox.emails.get(uid);
    if (!email) {
      return false;
    }
    email.flags = [...flags];
    return true;
  }

  /**
   * Get mailbox status information
   * @param mailboxPath Mailbox path
   * @returns Status object or undefined if mailbox not found
   */
  getMailboxStatus(mailboxPath: string): {
    messages: number;
    recent: number;
    unseen: number;
    uidNext: number;
    uidValidity: number;
  } | undefined {
    const mailbox = this.mailboxes.get(mailboxPath);
    if (!mailbox) {
      return undefined;
    }

    const emails = Array.from(mailbox.emails.values());
    const unseen = emails.filter(e => !e.flags.includes('\\Seen')).length;
    const recent = emails.filter(e => e.flags.includes('\\Recent')).length;

    return {
      messages: mailbox.emails.size,
      recent,
      unseen,
      uidNext: mailbox.uidNext,
      uidValidity: mailbox.uidValidity,
    };
  }
}


class MockImapServer {
  public static readonly HOSTNAME = "imap.example.com";
  
  private users: Map<string, MockImapServerUser>;
  private autoCreateUsers: boolean;

  constructor(autoCreateUsers: boolean = true) {
    this.users = new Map();
    this.autoCreateUsers = autoCreateUsers;
  }

  addUser(email: string, password: string): MockImapServerUser {
    const user = new MockImapServerUser(email, password);
    this.users.set(email, user);
    return user;
  }

  getUser(email: string): MockImapServerUser | undefined {
    let user = this.users.get(email);
    
    // Auto-create user if not found and autoCreateUsers is enabled
    if (!user && this.autoCreateUsers) {
      user = this.addUser(email, email);
    }
    
    return user;
  }

  removeUser(email: string): boolean {
    return this.users.delete(email);
  }

  getAllUsers(): MockImapServerUser[] {
    return Array.from(this.users.values());
  }

  reset(): void {
    this.users.clear();
  }

  static getValidCredentials(user: string = 'user@example.com'): ImapCredentialsData {
    return {
      user: user,
      password: user,
      host: MockImapServer.HOSTNAME,
      port: 993,
      tls: true,
      allowUnauthorizedCerts: false,
    };
  }
}

/**
 * Creates a Jest mock for ImapFlow using MockImapServer to handle operations
 * @param server MockImapServer instance to use for handling operations
 * @param credentials Authentication credentials (user and password)
 * @returns Jest mocked ImapFlow client
 */
export function createImapflowMock(
  server: MockImapServer,
  credentials: { user: string; password: string }
): any {
  let authenticated = false;
  let currentUser: MockImapServerUser | undefined;
  let currentMailbox: string | undefined;

  const mockClient = {
    authenticated: false,

    /**
     * Connect and authenticate to the mock IMAP server
     */
    connect: jest.fn().mockImplementation(async () => {
      if (credentials.user.indexOf('@') === -1) {
        throw new Error('Invalid username format');
      }

      const user = server.getUser(credentials.user);
      if (!user) {
        throw new Error(`User ${credentials.user} not found`);
      }
      if (user.getPassword() !== credentials.password) {
        throw new Error('Invalid credentials');
      }
      authenticated = true;
      currentUser = user;
      mockClient.authenticated = true;
    }),

    /**
     * Logout and disconnect from the mock IMAP server
     */
    logout: jest.fn().mockImplementation(async () => {
      authenticated = false;
      currentUser = undefined;
      currentMailbox = undefined;
      mockClient.authenticated = false;
    }),

    /**
     * Close the connection without logout
     */
    close: jest.fn().mockImplementation(async () => {
      authenticated = false;
      currentUser = undefined;
      currentMailbox = undefined;
      mockClient.authenticated = false;
    }),

    /**
     * List mailboxes
     */
    list: jest.fn().mockImplementation(async () => {
      if (!authenticated || !currentUser) {
        throw new Error('Not authenticated');
      }
      return currentUser.getMailboxes().map(mailbox => ({
        name: mailbox.name,
        path: mailbox.path,
        delimiter: mailbox.delimiter,
        flags: mailbox.flags,
        specialUse: mailbox.specialUse,
        listed: true,
        subscribed: true,
        parentPath: mailbox.path.split(mailbox.delimiter).slice(0, -1).join(mailbox.delimiter),
        parent: mailbox.path.split(mailbox.delimiter).slice(0, -1).pop() || '',
        pathAsListed: mailbox.path,
      }));
    }),

    /**
     * Get a mailbox lock for operations
     */
    getMailboxLock: jest.fn().mockImplementation(async (mailboxPath: string) => {
      if (!authenticated || !currentUser) {
        throw new Error('Not authenticated');
      }
      const mailbox = currentUser.getMailbox(mailboxPath);
      if (!mailbox) {
        throw new Error(`Mailbox '${mailboxPath}' not found`);
      }
      currentMailbox = mailboxPath;
      
      // Return a mock lock object
      return {
        path: mailboxPath,
        release: jest.fn().mockResolvedValue(undefined),
      };
    }),

    /**
     * Search for emails in the current mailbox
     */
    search: jest.fn().mockImplementation(async (query: any) => {
      if (!authenticated || !currentUser || !currentMailbox) {
        throw new Error('Not authenticated or no mailbox selected');
      }
      const emails = currentUser.getEmails(currentMailbox);
      if (!emails) {
        throw new Error(`Mailbox '${currentMailbox}' not found`);
      }
      
      // Simple search implementation - returns all UIDs for now
      // Can be extended to handle actual search queries
      return emails.map(email => email.uid);
    }),

    /**
     * Fetch a single email by UID
     */
    fetchOne: jest.fn().mockImplementation(async (uid: number | string, query: any, options?: any) => {
      if (!authenticated || !currentUser || !currentMailbox) {
        throw new Error('Not authenticated or no mailbox selected');
      }
      const uidNum = typeof uid === 'string' ? parseInt(uid, 10) : uid;
      const email = currentUser.getEmail(currentMailbox, uidNum);
      if (!email) {
        return null;
      }
      
      // Return email data based on what's requested in the query
      return {
        uid: email.uid,
        flags: email.flags,
        internalDate: email.internalDate,
        source: typeof email.rfc822Data === 'string' 
          ? Buffer.from(email.rfc822Data) 
          : email.rfc822Data,
      };
    }),

    /**
     * Append a message to a mailbox
     */
    append: jest.fn().mockImplementation(async (
      mailboxPath: string,
      content: string | Buffer,
      flags?: string[],
      internalDate?: Date
    ) => {
      if (!authenticated || !currentUser) {
        throw new Error('Not authenticated');
      }
      const uid = currentUser.createEmail(mailboxPath, content, {
        flags: flags || [],
        internalDate: internalDate || new Date(),
      });
      
      const mailbox = currentUser.getMailbox(mailboxPath);
      return {
        uid,
        uidValidity: mailbox?.uidValidity || 1,
        path: mailboxPath,
      };
    }),

    /**
     * Delete a message by UID
     */
    messageDelete: jest.fn().mockImplementation(async (
      uid: number | string,
      options?: any
    ) => {
      if (!authenticated || !currentUser || !currentMailbox) {
        throw new Error('Not authenticated or no mailbox selected');
      }
      const uidNum = typeof uid === 'string' ? parseInt(uid, 10) : uid;
      const deleted = currentUser.deleteEmail(currentMailbox, uidNum);
      return deleted;
    }),

    /**
     * Copy a message to another mailbox
     */
    messageCopy: jest.fn().mockImplementation(async (
      uid: number | string,
      destinationMailbox: string,
      options?: any
    ) => {
      if (!authenticated || !currentUser || !currentMailbox) {
        throw new Error('Not authenticated or no mailbox selected');
      }
      const uidNum = typeof uid === 'string' ? parseInt(uid, 10) : uid;
      const email = currentUser.getEmail(currentMailbox, uidNum);
      if (!email) {
        throw new Error(`Email with UID ${uidNum} not found`);
      }
      
      // Copy the email to the destination mailbox
      const newUid = currentUser.createEmail(destinationMailbox, email.rfc822Data, {
        flags: [...email.flags],
        internalDate: email.internalDate,
      });
      
      const destMailbox = currentUser.getMailbox(destinationMailbox);
      return {
        uid: newUid,
        uidValidity: destMailbox?.uidValidity || 1,
        path: destinationMailbox,
        destination: destinationMailbox,
      };
    }),

    /**
     * Move a message to another mailbox
     */
    messageMove: jest.fn().mockImplementation(async (
      uid: number | string,
      destinationMailbox: string,
      options?: any
    ) => {
      if (!authenticated || !currentUser || !currentMailbox) {
        throw new Error('Not authenticated or no mailbox selected');
      }
      const uidNum = typeof uid === 'string' ? parseInt(uid, 10) : uid;
      const email = currentUser.getEmail(currentMailbox, uidNum);
      if (!email) {
        throw new Error(`Email with UID ${uidNum} not found`);
      }
      
      // Copy the email to the destination mailbox
      const newUid = currentUser.createEmail(destinationMailbox, email.rfc822Data, {
        flags: [...email.flags],
        internalDate: email.internalDate,
      });
      
      // Delete from source mailbox
      currentUser.deleteEmail(currentMailbox, uidNum);
      
      const destMailbox = currentUser.getMailbox(destinationMailbox);
      return {
        uid: newUid,
        uidValidity: destMailbox?.uidValidity || 1,
        path: destinationMailbox,
        destination: destinationMailbox,
      };
    }),

    /**
     * Set flags on a message
     */
    setFlags: jest.fn().mockImplementation(async (
      uid: number | string,
      flags: string[],
      options?: any
    ) => {
      if (!authenticated || !currentUser || !currentMailbox) {
        throw new Error('Not authenticated or no mailbox selected');
      }
      const uidNum = typeof uid === 'string' ? parseInt(uid, 10) : uid;
      const updated = currentUser.setEmailFlags(currentMailbox, uidNum, flags);
      if (!updated) {
        throw new Error(`Email with UID ${uidNum} not found`);
      }
      return true;
    }),

    /**
     * Get mailbox status
     */
    status: jest.fn().mockImplementation(async (mailboxPath: string, query?: any) => {
      if (!authenticated || !currentUser) {
        throw new Error('Not authenticated');
      }
      const status = currentUser.getMailboxStatus(mailboxPath);
      if (!status) {
        throw new Error(`Mailbox '${mailboxPath}' not found`);
      }
      return status;
    }),
  };

  return mockClient;
}

export { MockImapServer, MockImapServerUser, MockEmail, MockMailbox };

