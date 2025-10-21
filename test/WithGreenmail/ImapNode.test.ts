/**
 * Integration tests for Imap Node class with GreenMail server
 * 
 * These tests verify the complete functionality of the Imap node implementation
 * using a real GreenMail IMAP server running in Docker.
 */

import { IExecuteFunctions } from 'n8n-workflow';
import { Imap } from '../../nodes/Imap/Imap.node';
import { describeWithGreenMail } from '../TestUtils/Greenmail/greenmail';
import { createNodeParametersCheckerMock } from '../TestUtils/N8nMocks';
import { getGlobalGreenmail } from './setup';

describeWithGreenMail('Imap Node - with GreenMail', () => {
  let imap: Imap;

  beforeEach(() => {
    // Reset the Imap instance before each test
    imap = new Imap();
  });

  describe('mailbox operations', () => {
    it('should successfully execute loadMailboxList operation', async () => {
      // Create a mock parameters checker for testing
      const paramValues = {
        authentication: 'imapThisNode',
        resource: 'mailbox',
        operation: 'loadMailboxList',
        includeStatusFields: [],
      };
      const context = createNodeParametersCheckerMock(imap.description.properties, paramValues);
      const greenmail = getGlobalGreenmail();

      // Mock getCredentials to return ImapCredentialsData
      const credentials = greenmail.getCredentials('test@example.com');
      context.getCredentials = jest.fn().mockResolvedValue(credentials);

      context.getInputData = jest.fn().mockReturnValue([
        1
      ]);

      context.getNode = jest.fn().mockReturnValue({
        name: 'Imap Test Node',
      });
      
      // Act
      const resultData = await imap.execute.call(context as IExecuteFunctions);

      // Assert
      expect(imap).toBeDefined();
      expect(imap).toBeInstanceOf(Imap);

      expect(resultData).toHaveLength(1);
      expect(resultData[0]).toHaveLength(1);
      expect(resultData?.[0]?.[0]?.json).toEqual(
        {
          name: 'INBOX',
          path: 'INBOX',
          status: false,
        }
      );

    });

  });

});

