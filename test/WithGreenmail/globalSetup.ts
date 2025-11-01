/**
 * Global setup for WithGreenmail test directory
 * 
 * This file creates a single GreenMail container that is shared across
 * all tests in the WithGreenmail directory. The container is started once
 * before all tests run.
 */

import { GreenMailServer, shouldSkipGreenMailTests, GreenMailConfig, getDefaultGreenMailConfig } from '../TestUtils/Greenmail/greenmail';

// Global greenmail config that will be shared across all tests
export const globalGreenmailConfig: GreenMailConfig = getDefaultGreenMailConfig({
  //enableDebugLogs: true, // Uncomment for debugging
});

// Global greenmail instance that will be shared across all tests
let globalGreenmail: GreenMailServer | undefined;

/**
 * Global setup function - creates and starts the GreenMail container
 * This is called automatically by Jest before any tests in this project
 */
export default async function globalSetup() {
  if (shouldSkipGreenMailTests()) {
    console.log('Skipping GreenMail tests');
    return;
  }

  console.log('Starting global GreenMail container...');
  
  globalGreenmail = new GreenMailServer(globalGreenmailConfig);
  await globalGreenmail.start();
  
  console.log('Global GreenMail container is ready.');
  
  // Store the greenmail instance globally so it can be accessed by globalTeardown
  (global as any).__GREENMAIL_INSTANCE__ = globalGreenmail;
}