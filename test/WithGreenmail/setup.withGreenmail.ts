/**
 * Global setup for WithGreenmail test directory
 * 
 * This file creates a single GreenMail container that is shared across
 * all tests in the WithGreenmail directory. The container is started once
 * before all tests run and stopped after all tests complete.
 */

import { GreenMailServer, shouldSkipGreenMailTests, GreenMailConfig, getDefaultGreenMailConfig } from '../TestUtils/Greenmail/greenmail';
import { GreenmailApi } from '../TestUtils/Greenmail/GreenmailApi';

// Global greenmail config that will be shared across all tests
export const globalGreenmailConfig: GreenMailConfig = getDefaultGreenMailConfig({
  // enableDebugLogs: true, // Uncomment for debugging
});

// Global greenmail instance that will be shared across all tests
let globalGreenmail: GreenMailServer | undefined;

// Global greenmail API instance
let globalGreenmailApi: GreenmailApi | undefined;

/**
 * Get the global GreenMail API instance
 * This should be called from test files to access the shared API client
 */
export function getGlobalGreenmailApi(): GreenmailApi {
  if (!globalGreenmailApi) {
    globalGreenmailApi = new GreenmailApi(globalGreenmailConfig);
  }
  return globalGreenmailApi;
}

/**
 * Get the global GreenMail configuration with default values applied
 * This should be called from test files to access the complete config
 */
export function getGlobalGreenmailConfig(): Required<GreenMailConfig> {
  return getDefaultGreenMailConfig(globalGreenmailConfig);
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
    
  // Extended timeout for Docker startup
  jest.setTimeout(120 * 1000);

  globalGreenmail = new GreenMailServer(globalGreenmailConfig);

  await globalGreenmail.start();
  console.log('Global GreenMail container is ready.');
}, 120 * 1000); // 120 second timeout for Docker startup

/**
 * Teardown function - stops the GreenMail container
 * This is called automatically by Jest after all tests in this directory
 */
afterAll(async () => {
  if (globalGreenmail) {
    console.log('Stopping global GreenMail container...');
    await globalGreenmail.stop();
    globalGreenmail = undefined;
    globalGreenmailApi = undefined;
    console.log('Global GreenMail container stopped.');
  }
}, 30000); // 30 second timeout for Docker shutdown
