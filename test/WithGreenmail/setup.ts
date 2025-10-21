/**
 * Global setup for WithGreenmail test directory
 * 
 * This file creates a single GreenMail container that is shared across
 * all tests in the WithGreenmail directory. The container is started once
 * before all tests run and stopped after all tests complete.
 */

import { GreenMailServer, shouldSkipGreenMailTests } from '../TestUtils/Greenmail/greenmail';

// Global greenmail instance that will be shared across all tests
let globalGreenmail: GreenMailServer | undefined;

/**
 * Get the global GreenMail instance
 * This should be called from test files to access the shared container
 */
export function getGlobalGreenmail(): GreenMailServer {
  if (!globalGreenmail) {
    throw new Error('GreenMail server not initialized. This should not happen if setup is configured correctly.');
  }
  return globalGreenmail;
}

/**
 * Setup function - creates and starts the GreenMail container
 * This is called automatically by Jest before any tests in this directory
 */
beforeAll(async () => {
  if (shouldSkipGreenMailTests()) {
    console.log('Skipping GreenMail tests');
    return;
  }
  
  console.log('Setting up global GreenMail container for WithGreenmail tests...');
  
  // Extended timeout for Docker startup
  jest.setTimeout(120 * 1000);

  globalGreenmail = new GreenMailServer({
    // enableDebugLogs: true, // Uncomment for debugging
  });

  await globalGreenmail.start();
  console.log('Global GreenMail container is ready.');
}, 60000); // 60 second timeout for Docker startup

/**
 * Teardown function - stops the GreenMail container
 * This is called automatically by Jest after all tests in this directory
 */
afterAll(async () => {
  if (globalGreenmail) {
    console.log('Stopping global GreenMail container...');
    await globalGreenmail.stop();
    globalGreenmail = undefined;
    console.log('Global GreenMail container stopped.');
  }
}, 30000); // 30 second timeout for Docker shutdown
