/**
 * Global teardown for WithGreenmail test directory
 * 
 * This file stops the GreenMail container that was shared across
 * all tests in the WithGreenmail directory. The container is stopped
 * after all tests complete.
 */

import { GreenMailServer } from '../TestUtils/Greenmail/greenmail';

/**
 * Global teardown function - stops the GreenMail container
 * This is called automatically by Jest after all tests in this project
 */
export default async function globalTeardown() {
  const globalGreenmail: GreenMailServer | undefined = (global as any).__GREENMAIL_INSTANCE__;
  
  if (globalGreenmail) {
    console.log('Stopping global GreenMail container...');
    await globalGreenmail.stop();
    console.log('Global GreenMail container stopped.');
    
    // Clean up the global reference
    delete (global as any).__GREENMAIL_INSTANCE__;
  }
}