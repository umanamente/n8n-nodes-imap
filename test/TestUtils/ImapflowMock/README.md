# ImapFlow Mock

A Jest mock implementation for ImapFlow that uses an in-memory IMAP server for testing.

## Overview

This module provides a complete mock implementation of the ImapFlow client that can be used for unit testing without requiring an actual IMAP server. It uses `MockImapServer` to simulate IMAP server behavior in memory.

## Features

- ✅ Full authentication support (connect/logout)
- ✅ Mailbox operations (list, lock, status)
- ✅ Email operations (append, fetch, search, delete)
- ✅ Email manipulation (copy, move, set flags)
- ✅ Multiple users and mailboxes
- ✅ RFC822 email content support
- ✅ UID-based operations
- ✅ Jest mock functions for all methods

## Installation

The mock is already included in the test utilities. No additional installation required.

## Usage

### Basic Setup

```typescript
import { MockImapServer, createImapflowMock } from '../TestUtils/ImapflowMock';

describe('My IMAP Tests', () => {
  let server: MockImapServer;
  let mockClient: any;

  beforeEach(() => {
    // Create a mock server
    server = new MockImapServer();
    
    // Add a user
    const user = server.addUser('test@example.com', 'password');
    
    // Create some mailboxes
    user.createMailbox('Sent');
    user.createMailbox('Drafts');
    
    // Add some test emails
    user.createEmail('INBOX', 'From: sender@example.com\r\nSubject: Test\r\n\r\nTest body');
    
    // Create the mock client
    mockClient = createImapflowMock(server, {
      user: 'test@example.com',
      password: 'password',
    });
  });

  it('should connect and list mailboxes', async () => {
    await mockClient.connect();
    const mailboxes = await mockClient.list();
    
    expect(mockClient.authenticated).toBe(true);
    expect(mailboxes).toHaveLength(3); // INBOX, Sent, Drafts
  });
});
```

### Working with Emails

```typescript
it('should create and fetch an email', async () => {
  await mockClient.connect();
  
  // Append an email
  const result = await mockClient.append(
    'INBOX',
    'From: sender@example.com\r\nSubject: Test\r\n\r\nTest body',
    ['\\Seen']
  );
  
  expect(result.uid).toBe(1);
  
  // Get a lock on the mailbox
  const lock = await mockClient.getMailboxLock('INBOX');
  
  // Fetch the email
  const email = await mockClient.fetchOne(result.uid, { source: true });
  
  expect(email.uid).toBe(1);
  expect(email.flags).toContain('\\Seen');
  
  // Release the lock
  await lock.release();
});
```

### Copying and Moving Emails

```typescript
it('should copy an email to another mailbox', async () => {
  await mockClient.connect();
  
  // Setup: create an email in INBOX
  const user = server.getUser('test@example.com')!;
  user.createEmail('INBOX', 'Email to copy');
  
  // Get mailbox lock
  await mockClient.getMailboxLock('INBOX');
  
  // Copy the email
  const result = await mockClient.messageCopy(1, 'Sent');
  
  expect(result.destination).toBe('Sent');
  
  // Verify both copies exist
  expect(user.getEmail('INBOX', 1)).toBeDefined();
  expect(user.getEmail('Sent', 1)).toBeDefined();
});

it('should move an email to another mailbox', async () => {
  await mockClient.connect();
  
  const user = server.getUser('test@example.com')!;
  user.createEmail('INBOX', 'Email to move');
  
  await mockClient.getMailboxLock('INBOX');
  
  // Move the email
  const result = await mockClient.messageMove(1, 'Sent');
  
  expect(result.destination).toBe('Sent');
  
  // Original should be deleted
  expect(user.getEmail('INBOX', 1)).toBeUndefined();
  // Should exist in destination
  expect(user.getEmail('Sent', 1)).toBeDefined();
});
```

### Managing Flags

```typescript
it('should set flags on an email', async () => {
  await mockClient.connect();
  
  const user = server.getUser('test@example.com')!;
  user.createEmail('INBOX', 'Email');
  
  await mockClient.getMailboxLock('INBOX');
  
  // Set flags
  await mockClient.setFlags(1, ['\\Seen', '\\Flagged']);
  
  // Verify flags were set
  const email = user.getEmail('INBOX', 1);
  expect(email?.flags).toContain('\\Seen');
  expect(email?.flags).toContain('\\Flagged');
});
```

### Using with createImapClient Mock

To use this with the existing `createImapClient` function in tests:

```typescript
import * as ImapUtils from '../nodes/Imap/utils/ImapUtils';
import { MockImapServer, createImapflowMock } from '../TestUtils/ImapflowMock';

jest.mock('../nodes/Imap/utils/ImapUtils', () => ({
  ...jest.requireActual('../nodes/Imap/utils/ImapUtils'),
  createImapClient: jest.fn(),
}));

describe('Node Tests', () => {
  let server: MockImapServer;
  let mockClient: any;

  beforeEach(() => {
    server = new MockImapServer();
    const user = server.addUser('test@example.com', 'password');
    
    mockClient = createImapflowMock(server, {
      user: 'test@example.com',
      password: 'password',
    });
    
    // Mock createImapClient to return our mock
    (ImapUtils.createImapClient as jest.Mock).mockReturnValue(mockClient);
  });

  // Your tests here...
});
```

## API Reference

### createImapflowMock(server, credentials)

Creates a Jest-mocked ImapFlow client.

**Parameters:**
- `server` (MockImapServer): The mock server instance
- `credentials` (Object): Authentication credentials
  - `user` (string): Username/email
  - `password` (string): Password

**Returns:** Mocked ImapFlow client with the following methods:

#### Authentication Methods
- `connect()`: Authenticate with the server
- `logout()`: Logout and disconnect
- `close()`: Close connection without logout

#### Mailbox Methods
- `list()`: List all mailboxes
- `getMailboxLock(mailboxPath)`: Get exclusive lock on a mailbox
- `status(mailboxPath, query?)`: Get mailbox status

#### Email Methods
- `search(query)`: Search for emails in current mailbox
- `fetchOne(uid, query, options?)`: Fetch a single email
- `append(mailboxPath, content, flags?, internalDate?)`: Append email to mailbox
- `messageDelete(uid, options?)`: Delete an email
- `messageCopy(uid, destinationMailbox, options?)`: Copy email to another mailbox
- `messageMove(uid, destinationMailbox, options?)`: Move email to another mailbox
- `setFlags(uid, flags, options?)`: Set flags on an email

### MockImapServer

The in-memory IMAP server.

**Methods:**
- `addUser(email, password)`: Add a user and return MockImapServerUser
- `getUser(email)`: Get a user by email
- `removeUser(email)`: Remove a user
- `getAllUsers()`: Get all users

### MockImapServerUser

Represents a user on the mock server.

**Methods:**
- `getMailboxes()`: Get all mailboxes
- `getMailbox(path)`: Get a specific mailbox
- `createMailbox(path, options?)`: Create a new mailbox
- `deleteMailbox(path)`: Delete a mailbox
- `getEmails(mailboxPath)`: Get all emails in a mailbox
- `getEmail(mailboxPath, uid)`: Get a specific email
- `createEmail(mailboxPath, rfc822Data, options?)`: Create an email
- `deleteEmail(mailboxPath, uid)`: Delete an email
- `setEmailFlags(mailboxPath, uid, flags)`: Set flags on an email
- `getMailboxStatus(mailboxPath)`: Get mailbox status

## Testing

Run the tests for the mock implementation:

```bash
npm test -- ImapflowMock.test.ts
```

## Notes

- All Jest mock functions (e.g., `connect`, `list`, etc.) are tracked and can be asserted with Jest matchers like `toHaveBeenCalled()`
- The `authenticated` property is automatically updated on connect/logout
- UIDs are auto-incremented starting from 1 for each mailbox
- INBOX mailbox is automatically created for each user
- Search implementation currently returns all UIDs (can be extended for query filtering)

## Examples

See `ImapflowMock.test.ts` for comprehensive usage examples.
