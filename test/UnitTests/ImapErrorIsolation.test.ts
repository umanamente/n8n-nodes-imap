import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { DEFAULT_STARTTLS_USAGE } from '../../credentials/ImapCredentials.credentials';
import { executeWithHandler } from '../../nodes/Imap/Imap.node';
import { IResourceOperationDef } from '../../nodes/Imap/utils/CommonDefinitions';
import { ImapNodeDebugUtils } from '../../nodes/Imap/utils/debug/ImapNodeDebugUtils';
import { createMockLogger, createNodeParametersCheckerMock } from '../TestUtils/N8nMocks';

// The DebugMode setup replaces this export. These regressions exercise the real
// client/logger wiring while mocking only network I/O on each client.
const { createImapClient } = jest.requireActual<typeof import('../../nodes/Imap/utils/ImapUtils')>(
  '../../nodes/Imap/utils/ImapUtils',
);

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function createClient() {
  const client = createImapClient({
    host: 'imap.example.com',
    port: 993,
    user: 'user@example.com',
    password: 'password',
    tls: true,
    allowUnauthorizedCerts: false,
    startTLSUsage: DEFAULT_STARTTLS_USAGE,
  }, createMockLogger(false, false, false, false));
  jest.spyOn(client, 'connect').mockResolvedValue(undefined as any);
  jest.spyOn(client, 'logout').mockResolvedValue(undefined);
  return client;
}

function createContext(continueOnFail = false, itemCount = 1) {
  const context = createNodeParametersCheckerMock([], {}, continueOnFail);
  context.getInputData = jest.fn().mockReturnValue(Array.from({ length: itemCount }, () => ({ json: {} })));
  return context as IExecuteFunctions;
}

function createHandler(executeImapAction: IResourceOperationDef['executeImapAction']): IResourceOperationDef {
  return {
    operation: { name: 'Test', value: 'test' },
    parameters: [],
    executeImapAction,
  };
}

function rejection(result: PromiseSettledResult<unknown>): NodeOperationError {
  expect(result.status).toBe('rejected');
  if (result.status !== 'rejected') {
    throw new Error('Expected node execution to reject');
  }
  expect(result.reason).toBeInstanceOf(NodeOperationError);
  return result.reason;
}

describe('IMAP diagnostic isolation', () => {
  beforeEach(() => {
    jest.spyOn(ImapNodeDebugUtils, 'ImapNodeDebugUtilsEnabled').mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('preserves each concurrent client diagnostics without clearing or mixing them', async () => {
    const clientA = createClient();
    const clientB = createClient();
    const aStarted = deferred();
    const bStarted = deferred();
    const aFinished = deferred();

    const handlerA = createHandler(async () => {
      clientA.log.error({ msg: 'Client A early error' });
      aStarted.resolve();
      await bStarted.promise;
      clientA.log.warn({ msg: 'Client A late warning' });
      throw new Error('Client A command failed');
    });
    const handlerB = createHandler(async () => {
      clientB.log.error({ msg: 'Client B error' });
      bStarted.resolve();
      await aFinished.promise;
      throw new Error('Client B command failed');
    });

    const executionA = executeWithHandler(createContext(), clientA, handlerA);
    void executionA.then(aFinished.resolve, aFinished.resolve);
    await aStarted.promise;
    const executionB = executeWithHandler(createContext(), clientB, handlerB);
    const [resultA, resultB] = await Promise.allSettled([executionA, executionB]);

    const errorA = rejection(resultA);
    const errorB = rejection(resultB);
    expect(errorA.description).toContain('Client A early error');
    expect(errorA.description).toContain('Client A late warning');
    expect(errorA.description).not.toContain('Client B error');
    expect(errorB.description).toContain('Client B error');
    expect(errorB.description).not.toContain('Client A');
  });

  it('does not stop another client collection when an execution succeeds', async () => {
    const clientA = createClient();
    const clientB = createClient();
    const aStarted = deferred();
    const bFinished = deferred();

    const executionA = executeWithHandler(createContext(), clientA, createHandler(async () => {
      clientA.log.error({ msg: 'Client A early error' });
      aStarted.resolve();
      await bFinished.promise;
      clientA.log.warn({ msg: 'Client A late warning' });
      throw new Error('Client A command failed');
    }));
    await aStarted.promise;
    const executionB = executeWithHandler(createContext(), clientB, createHandler(async () => {
      clientB.log.warn({ msg: 'Client B successful command warning' });
      return [{ json: { success: true } }];
    }));
    void executionB.then(bFinished.resolve, bFinished.resolve);

    const [resultA, resultB] = await Promise.allSettled([executionA, executionB]);
    const errorA = rejection(resultA);
    expect(resultB.status).toBe('fulfilled');
    expect(errorA.description).toContain('Client A early error');
    expect(errorA.description).toContain('Client A late warning');
    expect(errorA.description).not.toContain('Client B');
  });

  it('does not carry diagnostics from previous successful or failed input items', async () => {
    const client = createClient();
    const result = await executeWithHandler(createContext(true, 3), client, createHandler(async (_context, _logger, itemIndex) => {
      if (itemIndex === 0) {
        client.log.warn({ msg: 'Successful item warning' });
        return [{ json: { success: true } }];
      }
      if (itemIndex === 1) {
        client.log.error({ msg: 'First failed item error' });
      }
      throw new Error(`Item ${itemIndex} failed`);
    }));

    expect(result[0]).toHaveLength(3);
    const firstError = result[0][1].error as NodeOperationError;
    const secondError = result[0][2].error as NodeOperationError;
    expect(firstError.description).toContain('First failed item error');
    expect(firstError.description).not.toContain('Successful item warning');
    expect(secondError.description).toBe('No additional details were provided by the IMAP server.');
  });

  it('preserves server diagnostics containing BigInt without replacing the command error', async () => {
    const previousToJson = Object.getOwnPropertyDescriptor(BigInt.prototype, 'toJSON');
    Reflect.deleteProperty(BigInt.prototype, 'toJSON');
    try {
      const client = createClient();
      const [result] = await Promise.allSettled([
        executeWithHandler(createContext(), client, createHandler(async () => {
          client.log.warn({ msg: 'Server command warning', highestModseq: BigInt('9007199254740993') });
          throw new Error('IMAP command failed');
        })),
      ]);
      const error = rejection(result);
      expect(error.message).toBe('IMAP command failed');
      expect(error.description).toContain('Server command warning');
      expect(error.description).toContain('"highestModseq": "9007199254740993"');
    } finally {
      if (previousToJson) {
        Object.defineProperty(BigInt.prototype, 'toJSON', previousToJson);
      }
    }
  });

  it('keeps the original command error when its logged properties contain BigInt', async () => {
    const previousToJson = Object.getOwnPropertyDescriptor(BigInt.prototype, 'toJSON');
    Reflect.deleteProperty(BigInt.prototype, 'toJSON');
    try {
      const client = createClient();
      const context = createContext();
      const originalError = Object.assign(new Error('IMAP command failed'), {
        highestModseq: BigInt('9007199254740993'),
      });
      const [result] = await Promise.allSettled([
        executeWithHandler(context, client, createHandler(async () => { throw originalError; })),
      ]);

      expect(rejection(result).message).toBe('IMAP command failed');
      expect(context.logger.error).toHaveBeenCalledWith(expect.stringContaining('"highestModseq":"9007199254740993"'));
    } finally {
      if (previousToJson) {
        Object.defineProperty(BigInt.prototype, 'toJSON', previousToJson);
      }
    }
  });
});
