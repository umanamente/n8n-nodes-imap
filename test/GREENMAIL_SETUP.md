# GreenMail Test Setup - Quick Start Guide

This guide explains how to use the new GreenMail test utilities created for testing the IMAP node.

## What Was Created

1. **`test/utils/greenmail.ts`** - Main GreenMail utility class
2. **`test/utils/index.ts`** - Index file for test utilities
3. **`test/utils/README.md`** - Comprehensive documentation
4. **`test/ImapUtils.test.ts`** - Tests for `createImapClient` function

## Quick Start

### Running Tests with GreenMail (Docker Required)

```bash
# Make sure Docker is running
docker --version

# Run the ImapUtils tests
npm test -- test/ImapUtils.test.ts
```

### Running Tests WITHOUT GreenMail (Skip Docker Tests)

```bash
# Windows PowerShell
$env:SKIP_GREENMAIL_TESTS="true"; npm test -- test/ImapUtils.test.ts

# Windows CMD
set SKIP_GREENMAIL_TESTS=true && npm test -- test/ImapUtils.test.ts

# Linux/Mac
SKIP_GREENMAIL_TESTS=true npm test -- test/ImapUtils.test.ts
```

## Using GreenMail in Your Tests

```typescript
import { GreenMailServer } from './utils/greenmail';
import { createImapClient } from '../nodes/Imap/utils/ImapUtils';

describe('My IMAP Tests', () => {
  let greenmail: GreenMailServer;

  beforeAll(async () => {
    greenmail = new GreenMailServer();
    await greenmail.start();
  }, 30000); // 30 second timeout

  afterAll(async () => {
    await greenmail.stop();
  }, 10000);

  it('should connect to IMAP server', async () => {
    const credentials = greenmail.getCredentials('test@example.com', false);
    const client = createImapClient(credentials);
    
    await client.connect();
    expect(client.authenticated).toBe(true);
    
    await client.logout();
  });
});
```

## Features

### GreenMail Server Management

- **Automatic Docker management** - Starts/stops GreenMail in Docker
- **Port configuration** - Customize IMAP, SMTP, POP3 ports
- **Automatic cleanup** - Removes existing containers on start
- **Error handling** - Graceful fallback if Docker is not available

### Test Helpers

- `getCredentials(email, useTls)` - Get credentials for test user
- `getDefaultTestUser()` - Get a default test user
- `createTestUser(email)` - Create custom test user
- `isRunning()` - Check if server is running

### Conditional Testing

Use `describeWithGreenMail` to skip tests when Docker is not available:

```typescript
import { describeWithGreenMail } from './utils/greenmail';

describeWithGreenMail('IMAP Connection Tests', () => {
  // These tests run only if SKIP_GREENMAIL_TESTS !== 'true'
  it('should connect', async () => {
    // test code
  });
});
```

## Test Coverage

The `ImapUtils.test.ts` file includes tests for:

1. **Basic client creation** - Creating ImapFlow instances
2. **Connection establishment** - Connecting to IMAP server
3. **Credentials configuration** - TLS, non-TLS, certificate handling
4. **Authentication** - Valid/invalid credentials
5. **Logger integration** - Debug logging functionality
6. **Error handling** - Connection failures, timeouts
7. **Multiple clients** - Independent client instances
8. **Lifecycle management** - Connect/disconnect behavior
9. **Edge cases** - Empty credentials, invalid ports, long hostnames

## Troubleshooting

### "Docker is not available" Error

**Solution**: Install Docker or set `SKIP_GREENMAIL_TESTS=true`

### Tests Timeout

**Solution**: Increase timeout in `beforeAll`:

```typescript
beforeAll(async () => {
  greenmail = new GreenMailServer({
    startupTimeout: 30000, // Increase to 30 seconds
  });
  await greenmail.start();
}, 60000); // Increase Jest timeout too
```

### Port Already in Use

**Solution**: Change ports:

```typescript
const greenmail = new GreenMailServer({
  imapPort: 4143,
  imapsPort: 4993,
});
```

### Debug Output

**Solution**: Enable debug logging:

```bash
DEBUG_GREENMAIL=true npm test
```

## Architecture

### GreenMail Server Class

```
GreenMailServer
├── start() - Start Docker container
├── stop() - Stop and remove container
├── getCredentials() - Generate test credentials
├── getDefaultTestUser() - Get default user
├── createTestUser() - Create custom user
├── isRunning() - Check server status
├── getHost() - Get server host
├── getImapPort() - Get IMAP port
└── getImapsPort() - Get IMAPS port
```

### Default Configuration

- **Host**: localhost
- **IMAP**: 3143
- **IMAPS**: 3993
- **SMTP**: 3025
- **SMTPS**: 3465
- **POP3**: 3110
- **POP3S**: 3995
- **Docker Image**: greenmail/standalone:2.0.1
- **Container Name**: greenmail-test
- **Startup Timeout**: 10000ms

## Best Practices

1. **Always cleanup**: Use `afterAll` to stop GreenMail
2. **Use proper timeouts**: GreenMail needs time to start
3. **Skip when needed**: Use `SKIP_GREENMAIL_TESTS` for CI without Docker
4. **Reuse server**: Start once in `beforeAll`, not before each test
5. **Independent tests**: Each test should work independently

## CI/CD Integration

For CI/CD pipelines without Docker:

```yaml
# GitHub Actions example
- name: Run tests
  run: SKIP_GREENMAIL_TESTS=true npm test
  env:
    SKIP_GREENMAIL_TESTS: true
```

Or with Docker:

```yaml
# GitHub Actions example
- name: Start Docker
  run: docker --version
  
- name: Run tests with GreenMail
  run: npm test
```

## Next Steps

1. Add more IMAP operation tests using GreenMail
2. Test email retrieval with pre-populated mailboxes
3. Test SMTP sending via GreenMail
4. Add performance tests with large mailboxes
5. Test error conditions and edge cases

## Documentation

For more details, see:
- `test/utils/README.md` - Full documentation
- `test/ImapUtils.test.ts` - Example usage
- `test/utils/greenmail.ts` - Implementation details
