/**
 * GreenMail Test Utility
 * 
 * Provides utilities for running a GreenMail IMAP server for testing purposes.
 * GreenMail is run in a Docker container for easy setup and teardown.
 * 
 * Usage:
 *   const greenmail = new GreenMailServer();
 *   await greenmail.start();
 *   // ... run tests ...
 *   await greenmail.stop();
 */

import { execSync, spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import { GreenmailApi } from './GreenmailApi';
import { createImapClient } from '../../../nodes/Imap/utils/ImapUtils';

export interface GreenMailConfig {
  /** Host to bind GreenMail server to (default: localhost) */
  host?: string;
  /** IMAP port (default: 3143) */
  imapPort?: number;
  /** IMAPS port (default: 3993) */
  imapsPort?: number;
  /** SMTP port (default: 3025) */
  smtpPort?: number;
  /** SMTPS port (default: 3465) */
  smtpsPort?: number;
  /** POP3 port (default: 3110) */
  pop3Port?: number;
  /** POP3S port (default: 3995) */
  pop3sPort?: number;
  /** API server port (default: 8080) */
  apiPort?: number;
  /** Container name for Docker (default: greenmail-test) */
  containerName?: string;
  /** Docker image to use (default: greenmail/standalone:2.0.1) */
  dockerImage?: string;
  /** Startup timeout in milliseconds (default: 10000) */
  startupTimeout?: number;
  /** Enable debug logs from GreenMail container (default: false) */
  enableDebugLogs?: boolean;
}

/**
 * Get default GreenMail configuration with all required values
 * 
 * @param overrides - Optional config overrides to merge with defaults
 * @returns Complete GreenMailConfig with all required properties
 */
export function getDefaultGreenMailConfig(overrides: GreenMailConfig = {}): Required<GreenMailConfig> {
  return {
    host: overrides.host || 'localhost',
    imapPort: overrides.imapPort || 3143,
    imapsPort: overrides.imapsPort || 3993,
    smtpPort: overrides.smtpPort || 3025,
    smtpsPort: overrides.smtpsPort || 3465,
    pop3Port: overrides.pop3Port || 3110,
    pop3sPort: overrides.pop3sPort || 3995,
    apiPort: overrides.apiPort || 8080,
    containerName: overrides.containerName || 'greenmail-test',
    dockerImage: overrides.dockerImage || 'greenmail/standalone:2.1.7',
    startupTimeout: overrides.startupTimeout || (process.env.GREENMAIL_STARTUP_TIMEOUT ? parseInt(process.env.GREENMAIL_STARTUP_TIMEOUT, 10) : 60000),
    enableDebugLogs: overrides.enableDebugLogs || !!process.env.DEBUG_GREENMAIL,
  };
}

export class GreenMailServer {
  private config: Required<GreenMailConfig>;
  private containerRunning: boolean = false;
  private dockerProcess?: ChildProcess;
  private apiClient: GreenmailApi;

  constructor(config: GreenMailConfig = {}) {
    this.config = getDefaultGreenMailConfig(config);
    this.apiClient = new GreenmailApi(this.config);
  }

  /**
   * Check if Docker is available on the system
   */
  private isDockerAvailable(): boolean {
    try {
      execSync('docker --version', { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a container with the given name already exists
   */
  private containerExists(): boolean {
    try {
      const output = execSync(`docker ps -a --filter name=${this.config.containerName} --format "{{.Names}}"`, {
        encoding: 'utf-8',
      }).trim();
      return output === this.config.containerName;
    } catch (error) {
      return false;
    }
  }

  /**
   * Remove existing container if it exists
   */
  private async removeExistingContainer(): Promise<void> {
    if (this.containerExists()) {
      try {
        execSync(`docker rm -f ${this.config.containerName}`, { stdio: 'ignore' });
      } catch (error) {
        console.warn(`Failed to remove existing container: ${error}`);
      }
    }
  }

  /**
   * Start the GreenMail server in a Docker container
   */
  async start(): Promise<void> {
    if (!this.isDockerAvailable()) {
      throw new Error(
        'Docker is not available. Please install Docker to run GreenMail tests. ' +
        'Alternatively, set SKIP_GREENMAIL_TESTS=true to skip these tests.'
      );
    }

    // Remove any existing container with the same name
    await this.removeExistingContainer();

    const greenmailOpts = [
      '-Dgreenmail.setup.test.all',
      '-Dgreenmail.hostname=0.0.0.0',
      '-Dgreenmail.auth.disabled=false',
      '-Dgreenmail.verbose',
    ];

    const dockerArgs = [
      'run',
      '--rm',
      '--name', this.config.containerName,
      '-p', `${this.config.imapPort}:3143`,
      '-p', `${this.config.imapsPort}:3993`,
      '-p', `${this.config.smtpPort}:3025`,
      '-p', `${this.config.smtpsPort}:3465`,
      '-p', `${this.config.pop3Port}:3110`,
      '-p', `${this.config.pop3sPort}:3995`,
      '-p', `${this.config.apiPort}:8080`,
      '-e', `GREENMAIL_OPTS=${greenmailOpts.join(' ')}`,
      this.config.dockerImage,
    ];

    // Start Docker container
    this.dockerProcess = spawn('docker', dockerArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.dockerProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      if (this.config.enableDebugLogs) {
        console.log(`[GreenMail STDOUT]: ${output}`);
      }
    });

    this.dockerProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      if (this.config.enableDebugLogs) {
        console.error(`[GreenMail STDERR]: ${output}`);
      }
    });

    // Wait for GreenMail to be ready
    await this.waitForContainerReady();
    this.containerRunning = true;
  }

  /**
   * Check if a port is accessible by attempting to connect to it
   */
  private async checkPortConnection(port: number, host: string = this.config.host): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 2000; // 2 second timeout for connection attempt

      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, host);
    });
  }



  /**
   * Wait for GreenMail server to be fully ready
   * This checks:
   * 1. Port connection is accessible
   * 2. API reports readiness
   * 3. IMAP authentication works
   */
  private async waitForGreenmailServerReady(): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 500; // Check every 500ms

    while (Date.now() - startTime < this.config.startupTimeout) {
      try {
        // Step 1: Check if port is accessible
        const portReady = await this.checkPortConnection(this.config.apiPort);
        
        if (portReady) {
          //console.log(`API port ${this.config.apiPort} is accessible.`);
          
          // Step 2: Wait for API readiness
          await this.apiClient.waitForReadiness(15000, 500);
          
          // Step 3: Try IMAP authentication
          const authReady = await this.tryImapAuth();
          
          if (authReady) {
            console.log('IMAP authentication successful. GreenMail server is fully ready.');
            return;
          } else {
            // console.log('IMAP authentication failed, retrying...');
          }

        } else {
          // console.log(`API port ${this.config.apiPort} not accessible yet, retrying...`);
        }
      } catch (error) {
        // Continue waiting
        console.log(`Error during readiness check: ${error}, retrying...`);
      }

      await this.sleep(checkInterval);
    }

    throw new Error(
      `GreenMail server failed to start within ${this.config.startupTimeout}ms. ` +
      'Try increasing startupTimeout in config, set GREENMAIL_STARTUP_TIMEOUT environment variable (in milliseconds), or check Docker logs.'
    );
  }

  /**
   * Wait for GreenMail server to be ready by checking if the port is accessible
   */
  private async waitForContainerReady(): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 500; // Check every 500ms

    let containerIsReady = false;

    while (Date.now() - startTime < this.config.startupTimeout) {
      try {
        // Check if container is running
        const output = execSync(
          `docker ps --filter name=${this.config.containerName} --format "{{.Status}}"`,
          { encoding: 'utf-8' }
        ).trim();

        // console.log(`GreenMail container status: ${output}`);

        if (output.startsWith('Up')) {
          containerIsReady = true;
          break;
        }
      } catch (error) {
        // Continue waiting
      }

      await this.sleep(checkInterval);
    }

    if (!containerIsReady) {
      throw new Error(
        `GreenMail server failed to start within ${this.config.startupTimeout}ms. ` +
        'Try increasing startupTimeout in config, set GREENMAIL_STARTUP_TIMEOUT environment variable (in milliseconds), or check Docker logs.'
      );
    }

    // container is running, now check full readiness
    await this.waitForGreenmailServerReady();
  }



  /**
   * Stop the GreenMail server
   */
  async stop(): Promise<void> {
    if (!this.containerRunning) {
      return;
    }

    try {
      console.log('Stopping GreenMail container...');
      const stopStartTime = Date.now();
      execSync(`docker stop ${this.config.containerName}`, { stdio: 'ignore' });
      const stopTime = Date.now() - stopStartTime;
      console.log(`GreenMail container stopped in ${stopTime}ms`);
      // sleep a bit to allow Docker to fully stop
      const sleepSeconds = 5;
      console.log(`Waiting additional ${sleepSeconds} seconds for Docker to fully stop...`);
      await new Promise((resolve) => setTimeout(resolve, sleepSeconds * 1000));
      console.log('GreenMail server stopped.');

    } catch (error) {
      console.warn(`Failed to stop GreenMail container: ${error}`);
    }

    this.containerRunning = false;
    this.dockerProcess = undefined;
  }

  /**
   * Reset the GreenMail server (clears all emails and users)
   * Uses the API to reset without restarting the container
   */
  async reset(): Promise<void> {
    if (!this.containerRunning) {
      throw new Error('GreenMail server is not running. Call start() first.');
    }
    
    console.log('Resetting GreenMail server...');
    try {
      await this.apiClient.reset();
      await this.waitForGreenmailServerReady();
    } catch (error) {
      console.error('Failed to reset GreenMail server:', error);
      throw new Error(`Failed to reset GreenMail server: ${error}`);
    }
  }

  /**
   * Get the GreenMail API client
   */
  getApiClient(): GreenmailApi {
    return this.apiClient;
  }

  /**
   * Get the IMAP port (non-TLS)
   */
  getImapPort(): number {
    return this.config.imapPort;
  }

  /**
   * Get the IMAPS port (TLS)
   */
  getImapsPort(): number {
    return this.config.imapsPort;
  }

  /**
   * Get the host
   */
  getHost(): string {
    return this.config.host;
  }

  /**
   * Check if the server is running
   */
  isRunning(): boolean {
    return this.containerRunning;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Try to authenticate with IMAP using the provided credentials
   * 
   * @param credentials - The IMAP credentials to test
   * @returns Promise<boolean> - true if authentication succeeds, false otherwise
   */
  async tryImapAuth(): Promise<boolean> {
    const credentials = this.apiClient.getCredentials("wait-for-auth-test@imap.com");
    // Create a simple logger that doesn't depend on Jest (for global setup/teardown)
    const simpleLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    };
    const client = createImapClient(credentials, simpleLogger as any);
    try {
      await client.connect();
      await client.logout();
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Check if GreenMail tests should be skipped
 * Set environment variable SKIP_GREENMAIL_TESTS=true to skip
 */
export function shouldSkipGreenMailTests(): boolean {
  return process.env.SKIP_GREENMAIL_TESTS === 'true';
}

/**
 * Conditionally describe a test suite that requires GreenMail
 */
export function describeWithGreenMail(name: string, fn: () => void): void {
  if (shouldSkipGreenMailTests()) {
    describe.skip(`${name} (skipped - SKIP_GREENMAIL_TESTS=true)`, fn);
  } else {
    describe(name, fn);
  }
}
