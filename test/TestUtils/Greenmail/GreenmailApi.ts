/**
 * Greenmail REST API Client
 * Based on the Greenmail OpenAPI specification
 */

export interface GreenmailConfiguration {
  defaultHostname: string;
  portOffset: number;
  serverSetups: ServerSetup[];
}

export interface ServerSetup {
  port: number;
  address: string;
  protocol: 'pop3' | 'pop3s' | 'imap' | 'imaps' | 'smtp' | 'smtps';
  isSecure: boolean;
  readTimeout?: number;
  writeTimeout?: number;
  connectionTimeout?: number;
  serverStartupTimeout?: number;
  isDynamicPort?: boolean;
}

export interface User {
  login: string;
  email: string;
  password?: string;
}

export interface CreateUserRequest {
  email: string;
  login: string;
  password: string;
}

export interface Message {
  uid: number;
  messageId?: string;
  subject?: string;
  contentType: string;
  mimeMessage: string;
}

export interface ErrorResponse {
  message: string;
}

export interface SuccessResponse {
  message: string;
}

export class GreenmailApi {
  private baseUrl: string;

  /**
   * Creates a new Greenmail API client
   * @param baseUrl Base URL of the Greenmail service (e.g., 'http://localhost:8080')
   */
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  /**
   * Gets current GreenMail configuration
   * @returns Configuration object
   */
  async getConfiguration(): Promise<GreenmailConfiguration> {
    const response = await fetch(`${this.baseUrl}/api/configuration`);
    if (!response.ok) {
      const error = await response.json() as ErrorResponse;
      throw new Error(`Failed to get configuration: ${error.message}`);
    }
    return response.json() as Promise<GreenmailConfiguration>;
  }

//  /**
//   * Gets all GreenMail users
//   * @returns Array of users
//   */
//  async getAllUsers(): Promise<User[]> {
//    const response = await fetch(`${this.baseUrl}/api/user`);
//    if (!response.ok) {
//      const error = await response.json() as ErrorResponse;
//      throw new Error(`Failed to get users: ${error.message}`);
//    }
//    return response.json();
//  }
//
//  /**
//   * Creates a new GreenMail user
//   * @param user User data (email, login, password)
//   * @returns Newly created user
//   */
//  async createUser(user: CreateUserRequest): Promise<User> {
//    const response = await fetch(`${this.baseUrl}/api/user`, {
//      method: 'POST',
//      headers: {
//        'Content-Type': 'application/json',
//      },
//      body: JSON.stringify(user),
//    });
//    if (!response.ok) {
//      const error = await response.json() as ErrorResponse;
//      throw new Error(`Failed to create user: ${error.message}`);
//    }
//    return response.json();
//  }
//
//  /**
//   * Deletes a GreenMail user
//   * @param emailOrId User email or login
//   * @returns Success response
//   */
//  async deleteUser(emailOrId: string): Promise<SuccessResponse> {
//    const response = await fetch(`${this.baseUrl}/api/user/${encodeURIComponent(emailOrId)}`, {
//      method: 'DELETE',
//    });
//    if (!response.ok) {
//      const error = await response.json() as ErrorResponse;
//      throw new Error(`Failed to delete user: ${error.message}`);
//    }
//    return response.json();
//  }
//
//  /**
//   * Gets messages for a given user and folder
//   * @param emailOrId User email or login
//   * @param folderName Mail folder name (defaults to 'INBOX')
//   * @returns Array of messages
//   */
//  async getUserMessages(emailOrId: string, folderName: string = 'INBOX'): Promise<Message[]> {
//    const response = await fetch(
//      `${this.baseUrl}/api/user/${encodeURIComponent(emailOrId)}/messages/${encodeURIComponent(folderName)}`,
//    );
//    if (!response.ok) {
//      const error = await response.json() as ErrorResponse;
//      throw new Error(`Failed to get user messages: ${error.message}`);
//    }
//    return response.json();
//  }
//
//  /**
//   * Checks GreenMail readiness (if service is up and available)
//   * @returns True if service is ready, false otherwise
//   */
//  async checkReadiness(): Promise<boolean> {
//    try {
//      const response = await fetch(`${this.baseUrl}/api/service/readiness`);
//      return response.status === 200;
//    } catch (error) {
//      return false;
//    }
//  }
//
//  /**
//   * Restarts GreenMail using current configuration
//   * @returns Success response
//   */
//  async reset(): Promise<SuccessResponse> {
//    const response = await fetch(`${this.baseUrl}/api/service/reset`, {
//      method: 'POST',
//    });
//    if (!response.ok) {
//      const error = await response.json() as ErrorResponse;
//      throw new Error(`Failed to reset service: ${error.message}`);
//    }
//    return response.json();
//  }
//
//  /**
//   * Purges all mails from GreenMail
//   * @returns Success response
//   */
//  async purgeMail(): Promise<SuccessResponse> {
//    const response = await fetch(`${this.baseUrl}/api/mail/purge`, {
//      method: 'POST',
//    });
//    if (!response.ok) {
//      const error = await response.json() as ErrorResponse;
//      throw new Error(`Failed to purge mail: ${error.message}`);
//    }
//    return response.json();
//  }
//
//  /**
//   * Waits for the service to be ready
//   * @param timeoutMs Maximum time to wait in milliseconds
//   * @param intervalMs Interval between checks in milliseconds
//   * @returns True if service becomes ready, false if timeout
//   */
//  async waitForReadiness(timeoutMs: number = 30000, intervalMs: number = 500): Promise<boolean> {
//    const startTime = Date.now();
//    while (Date.now() - startTime < timeoutMs) {
//      if (await this.checkReadiness()) {
//        return true;
//      }
//      await new Promise((resolve) => setTimeout(resolve, intervalMs));
//    }
//    return false;
//  }
}
