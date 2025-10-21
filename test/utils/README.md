# Test Utilities

This directory contains utility modules for testing the n8n IMAP node.

## GreenMail Test Server

The `greenmail.ts` module provides a wrapper for running GreenMail IMAP server in Docker for integration testing.

### Prerequisites

- Docker must be installed and running on your system
- Docker daemon must be accessible from the command line

### Usage

```typescript
import { GreenMailServer } from './utils/greenmail';

// Create and start the server
const greenmail = new GreenMailServer();
await greenmail.start();

// Get credentials for testing
const credentials = greenmail.getCredentials('test@example.com', false);

// Create IMAP client with credentials
const client = createImapClient(credentials);

// Run your tests...

// Clean up
await greenmail.stop();
```

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

#### Slow startup

If tests timeout during startup, you can increase the timeout using either configuration or environment variable:

```typescript
// Option 1: Via configuration
const greenmail = new GreenMailServer({
  startupTimeout: 120000, // 120 seconds
});

// Option 2: Via environment variable (applies globally to all tests)
// GREENMAIL_STARTUP_TIMEOUT=120000 npm test
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

## Adding More Test Utilities

Additional test utilities can be added to this directory following the same pattern:

1. Create a new TypeScript file (e.g., `smtp-helper.ts`)
2. Export utility classes or functions
3. Document usage in this README
4. Add tests for the utility if needed
