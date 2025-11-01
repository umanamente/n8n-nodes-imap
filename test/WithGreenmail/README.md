# WithGreenmail Tests

This directory contains tests that require a GreenMail IMAP server running in a Docker container.

## Global Setup

All tests in this directory share a single GreenMail container instance that is:
- Started once before any tests run (via `setup.ts`)
- Available to all test files in this directory
- Stopped once after all tests complete

This approach improves test performance by avoiding the overhead of starting/stopping Docker containers for each test file.

## Using GreenMail in Tests

To access the shared GreenMail instance in your tests:

```typescript
import { getGlobalGreenmailApi } from './setup.withGreenmail';

describe('My Test Suite', () => {
  it('should do something with IMAP', async () => {
    const greenmailApi = getGlobalGreenmailApi();
    const credentials = greenmailApi.getCredentials('user@test.com', false);
    
    // Use credentials for your test...
  });
});
```

## Configuration

The global setup is configured in `jest.config.js` using Jest's project feature:

- Tests in `/test/WithGreenmail/` use `setup.withGreenmail.ts` for initialization
- Tests in other directories use the standard `test/setup.ts`

## Environment Variables

- `SKIP_GREENMAIL_TESTS=true` - Skip all tests that require GreenMail
- `GREENMAIL_STARTUP_TIMEOUT` - Timeout in milliseconds for GreenMail startup (default: 60000)
- `DEBUG_GREENMAIL=true` - Enable debug logs from GreenMail container

## Requirements

- Docker must be installed and running
- Ports 3143, 3993, 3025, 3465, 3110, 3995 must be available

## Adding New Tests

To add a new test file that uses GreenMail:

1. Create your test file in `/test/WithGreenmail/`
2. Import and use `getGlobalGreenmailApi()` from `./setup.withGreenmail`
3. The container will automatically be available

Example:

```typescript
import { getGlobalGreenmailApi } from './setup.withGreenmail';
import { describeWithGreenMail } from '../TestUtils/Greenmail/greenmail';

describeWithGreenMail('My New Test Suite', () => {
  it('should test something', async () => {
    const greenmailApi = getGlobalGreenmailApi();
    const credentials = greenmailApi.getCredentials('user@test.com', false);
    // Your test code here
  });
});
```
