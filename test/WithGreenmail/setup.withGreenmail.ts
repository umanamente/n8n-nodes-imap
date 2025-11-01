/**
 * Setup file for WithGreenmail test directory
 * 
 * This file provides utility functions to access the shared GreenMail
 * container and configuration. The actual container lifecycle is managed
 * by globalSetup.ts and globalTeardown.ts.
 */

import { GreenMailConfig, getDefaultGreenMailConfig } from '../TestUtils/Greenmail/greenmail';
import { GreenmailApi } from '../TestUtils/Greenmail/GreenmailApi';
import { globalGreenmailConfig } from './globalSetup';

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


