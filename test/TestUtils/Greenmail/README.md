# Test Utilities

This directory contains utility modules for testing the n8n IMAP node.

## GreenMail Test Server

The `greenmail.ts` module provides a wrapper for running GreenMail IMAP server in Docker for integration testing.

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

### Prerequisites

- Docker must be installed and running on your system
- Docker daemon must be accessible from the command line

### Usage

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

### Test Helpers

The GreenMailServer class provides several helper methods:

- `getCredentials(email, useTls)` - Get credentials for test user
- `getDefaultTestUser()` - Get a default test user
- `createTestUser(email)` - Create custom test user
- `isRunning()` - Check if server is running
- `getHost()` - Get server host
- `getImapPort()` - Get IMAP port
- `getImapsPort()` - Get IMAPS port

### Configuration

You can customize the GreenMail server configuration:

```typescript
const greenmail = new GreenMailServer({
  host: 'localhost',
  imapPort: 3143,
  imapsPort: 3993,
  smtpPort: 3025,
  containerName: 'my-greenmail-test',
  dockerImage: 'greenmail/standalone:2.0.1',
  startupTimeout: 60000, // 60 seconds
});
```

### Environment Variables

- **`GREENMAIL_STARTUP_TIMEOUT`**: Override the default startup timeout (in milliseconds). Default is 60000ms (60 seconds).
  ```bash
  GREENMAIL_STARTUP_TIMEOUT=120000 npm test  # 120 seconds
  ```

- **`SKIP_GREENMAIL_TESTS`**: Set to `true` to skip GreenMail-based tests.
  ```bash
  SKIP_GREENMAIL_TESTS=true npm test
  ```

- **`DEBUG_GREENMAIL`**: Set to `true` to enable debug output from GreenMail.
  ```bash
  DEBUG_GREENMAIL=true npm test
  ```

### Default Ports

- IMAP (non-TLS): 3143
- IMAPS (TLS): 3993
- SMTP: 3025
- SMTPS: 3465
- POP3: 3110
- POP3S: 3995

### User Authentication

GreenMail uses a simple authentication scheme where the username and password are the same as the email address:

```typescript
// For email: test@example.com
// Username: test@example.com
// Password: test@example.com

const user = greenmail.getDefaultTestUser();
// user.email === 'test@example.com'
// user.username === 'test@example.com'
// user.password === 'test@example.com'
```

### Skipping GreenMail Tests

If Docker is not available or you want to skip GreenMail-based tests, use the `describeWithGreenMail` helper:

```typescript
import { describeWithGreenMail } from './utils/greenmail';

describeWithGreenMail('My IMAP tests', () => {
  // These tests will be skipped if SKIP_GREENMAIL_TESTS=true
  it('should connect to IMAP', async () => {
    // test code
  });
});
```

### Test Coverage

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



### Docker Image

By default, the utility uses `greenmail/standalone:2.0.1`. You can specify a different version:

```typescript
const greenmail = new GreenMailServer({
  dockerImage: 'greenmail/standalone:latest',
});
```

### Troubleshooting

#### Docker not found

If you see an error about Docker not being available:

1. Make sure Docker is installed: `docker --version`
2. Make sure Docker daemon is running
3. On Windows, ensure you're using Docker Desktop
4. Set `SKIP_GREENMAIL_TESTS=true` to skip these tests

#### Port conflicts

If you encounter port conflicts, you can change the ports:

```typescript
const greenmail = new GreenMailServer({
  imapPort: 4143,
  imapsPort: 4993,
  // ... other ports
});
```

#### Container already exists

The utility automatically removes any existing container with the same name before starting a new one.

#### Tests timeout

If tests timeout during startup, increase the timeout:

```typescript
beforeAll(async () => {
  greenmail = new GreenMailServer({
    startupTimeout: 30000, // 30 seconds
  });
  await greenmail.start();
}, 60000); // 60 second Jest timeout
```

Or use environment variable:

```bash
GREENMAIL_STARTUP_TIMEOUT=120000 npm test
```

#### Debug output

Enable debug logging:

```bash
DEBUG_GREENMAIL=true npm test
```

### Jest Configuration

In your test files using GreenMail, increase the timeout for setup:

```typescript
beforeAll(async () => {
  greenmail = new GreenMailServer();
  await greenmail.start();
}, 30000); // 30 second timeout

afterAll(async () => {
  await greenmail.stop();
}, 10000);
```

## Best Practices

1. **Always cleanup**: Use `afterAll` to stop GreenMail
2. **Use proper timeouts**: GreenMail needs time to start (30 seconds recommended)
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

## Adding More Test Utilities

Additional test utilities can be added to this directory following the same pattern:

1. Create a new TypeScript file (e.g., `smtp-helper.ts`)
2. Export utility classes or functions
3. Document usage in this README
4. Add tests for the utility if needed
