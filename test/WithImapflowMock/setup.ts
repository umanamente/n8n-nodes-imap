/**
 * Global setup for WithImapflowMock test directory
 * 
 * This file creates a global Imap server mock that is shared across
 * all tests in the WithImapflowMock directory. 
 * The mock is set up once before all tests run and torn down after all tests complete.
 */

import { MockImapServer, createImapflowMock } from '../TestUtils/ImapflowMock';
import * as ImapUtils from '../../nodes/Imap/utils/ImapUtils';

// Mock the createImapClient function
jest.mock('../../nodes/Imap/utils/ImapUtils', () => ({
  ...jest.requireActual('../../nodes/Imap/utils/ImapUtils'),
  createImapClient: jest.fn(),
}));

// Global imap instance that will be shared across all tests
let globalImapMock: MockImapServer | undefined;

/**
 * Get the global Imap server mock instance
 * This should be called from test files to access the shared container
 */
export function getGlobalImapMock(): MockImapServer {
  if (!globalImapMock) {
    throw new Error('Imap server mock not initialized. This should not happen if setup is configured correctly.');
  }
  return globalImapMock;
}

/**
 * Setup function - creates the Imap server mock,
 * mocks createImapClient to return the mock instance
 * This is called automatically by Jest before any tests in this directory
 */
beforeAll(async () => {
  globalImapMock = new MockImapServer();
  
  // Mock createImapClient to return a mock client dynamically
  // The mock will create a client based on the credentials passed to it
  (ImapUtils.createImapClient as jest.Mock).mockImplementation((credentials: any) => {
    // Create a mock client for the given credentials
    return createImapflowMock(globalImapMock!, {
      user: credentials.user,
      password: credentials.password,
    });
  });
});

/**
 * Teardown function - removes the mock of createImapClient
 * This is called automatically by Jest after all tests in this directory
 */
afterAll(async () => {
  (ImapUtils.createImapClient as jest.Mock).mockReset();
});
