# Contributing to n8n-nodes-imap

Thank you for your interest in contributing to the n8n-nodes-imap project! This guide will help you set up your development environment and understand how to contribute effectively.

## 📋 Table of Contents

- [Workspace Setup](#workspace-setup)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [Adding New Operations](#adding-new-operations)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Commit Convention](#commit-convention)
- [Version Management](#version-management)
- [Release Channels](#release-channels)
- [Git Workflow](#git-workflow)

## 🚀 Workspace Setup

### Prerequisites

- **Node.js** (version 18 or higher)
- **npm** or **yarn**
- **Docker** (required for Greenmail integration tests)
- **Git**

### Installation Steps

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/n8n-nodes-imap.git
   cd n8n-nodes-imap
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Verify the setup:**
   > Greenmail tests require Docker to be running. See the [Running Tests](#running-tests) section for more details.
   ```bash
   npx jest --ignoreProjects WithGreenmail
   ```

## 🔧 Local Development Environment Setup

For testing your node in a local n8n instance, follow these steps to set up a complete development environment.

For more detailed information about testing nodes locally, see the [official n8n documentation](https://docs.n8n.io/integrations/creating-nodes/test/run-node-locally/).


### Install n8n Globally

First, install n8n globally using npm:

```bash
npm install n8n -g
```

### Link Your Node Package

When you're ready to test your node:

1. **Build and link your node locally:**
   ```bash
   # In your node directory (n8n-nodes-imap)
   npm run build

   # create a global link for your node package
   npm link
   ```

2. **Install the node into your local n8n instance:**

   
   Navigate to the nodes directory within your n8n installation.

   ```bash
   # check where n8n is installed
   npm list -g n8n

   # Navigate to the custom nodes directory
   cd <path-to-n8n-installation>

   # Link the node package (use the name from package.json)
   npm link n8n-nodes-imap
   ```

### Start n8n

Start your local n8n instance:

```bash
n8n start
```

### Access Your Node

Open n8n in your browser (typically http://localhost:5678). You should see your IMAP nodes when you search for them in the nodes panel.

> **Important:** Search using the node name (e.g., "IMAP"), not the package name ("n8n-nodes-imap").

### Development Workflow

For efficient development, use this workflow:

1. Make changes to your node code
2. Build the project: `npm run build`
3. Restart n8n to see the changes
4. Test your changes in the n8n UI


## 🧪 Running Tests

The project uses Jest with multiple test configurations for different testing scenarios.

### Test Categories

1. **Unit Tests** (`/test/UnitTests/`) - Fast tests that don't require external dependencies
2. **Integration Tests with Greenmail** (`/test/WithGreenmail/`) - Tests using a real IMAP server via Docker
3. **Integration Tests with Mocks** (`/test/WithImapflowMock/`) - Tests using mocked IMAP connections

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Greenmail Prerequisites (Docker)

For integration tests that require a real IMAP server, we use **Greenmail** running in Docker:

**Requirements:**
- Docker must be installed and running
  - Install Docker from [here](https://www.docker.com/get-started)

**Environment Variables:**
```bash
# Skip Greenmail tests if Docker is not available
export SKIP_GREENMAIL_TESTS=true

# Enable debug logs from Greenmail container
export DEBUG_GREENMAIL=true
```

**Docker Setup:**
The Greenmail container is automatically managed by the test suite. No manual Docker commands are needed.

## 🏗️ Project Structure

### Overview

The project follows a resource-based architecture where functionality is organized by IMAP resources (Email, Mailbox) and their operations.

```
├── credentials/                 # Authentication configurations
│   └── ImapCredentials.credentials.ts
├── nodes/
│   └── Imap/
│       ├── Imap.node.ts        # Main node entry point
│       ├── operations/         # Business logic
│       │   ├── ResourcesList.ts    # Registry of all resources
│       │   ├── email/              # Email operations
│       │   │   ├── OperationsList.ts
│       │   │   └── functions/      # Individual operation implementations
│       │   └── mailbox/            # Mailbox operations
│       │       ├── OperationsList.ts
│       │       └── functions/      # Individual operation implementations
│       └── utils/              # Shared utilities
├── test/                       # Test suites
│   ├── UnitTests/             # Fast unit tests
│   ├── WithGreenmail/         # Integration tests with Docker
│   ├── WithImapflowMock/      # Integration tests with mocks
│   └── TestUtils/             # Test utilities and mocks
```

### Resource Organization

Each resource (Email, Mailbox) is organized as follows:

1. **Resource Directory** (`/nodes/Imap/operations/{resource}/`)
   - `OperationsList.ts` - Defines all operations for the resource
   - `ResourceName.ts` - Resource identifier constants
   - `functions/` - Individual operation implementations

2. **Operation Structure**
   - Each operation is implemented as a separate function
   - Operations receive standardized parameters (credentials, parameters, helpers)
   - Operations return standardized results

## ➕ Adding New Operations

### Step 1: Choose the Resource

Determine whether your operation belongs to an existing resource (Email, Mailbox) or if you need to create a new resource.

### Step 2: Create the Operation Function

Create a new file in `/nodes/Imap/operations/{resource}/functions/`:

```typescript
// Example: /nodes/Imap/operations/email/functions/markAsRead.ts
import { IExecuteFunctions } from 'n8n-workflow';
import { IImapCredentials } from '../../../utils/CommonDefinitions';

export async function markAsRead(
  this: IExecuteFunctions,
  credentials: IImapCredentials,
  itemIndex: number
): Promise<any> {
  // Implementation here
  const emailId = this.getNodeParameter('emailId', itemIndex) as string;
  
  // Your operation logic
  
  return { success: true, emailId };
}
```

### Step 3: Register the Operation

Add your operation to the resource's `OperationsList.ts`:

```typescript
// In /nodes/Imap/operations/email/OperationsList.ts
import { markAsRead } from './functions/markAsRead';

export const emailOperations = {
  // ... existing operations
  markAsRead,
};

export const emailResourceDefinitions: IResourceDef = {
  name: 'email',
  displayName: 'Email',
  operations: {
    // ... existing operations
    markAsRead: {
      displayName: 'Mark as Read',
      name: 'markAsRead',
      action: 'Mark an email as read',
      description: 'Mark an email as read in the mailbox',
      properties: [
        {
          displayName: 'Email ID',
          name: 'emailId',
          type: 'string',
          required: true,
          default: '',
          description: 'The ID of the email to mark as read',
        },
      ],
    },
  },
};
```

### Step 4: Add Tests

Create comprehensive tests for your operation:

```typescript
// /test/UnitTests/operations/email/markAsRead.test.ts
describe('markAsRead operation', () => {
  it('should mark email as read', async () => {
    // Test implementation
  });
});
```

### Step 5: Update Documentation

Update the main README.md to include your new operation in the operations list.

## 📝 Pull Request Guidelines

### What to Include

✅ **Required:**
- Implementation of the new feature/fix
- Comprehensive tests (unit + integration)
- Updated documentation (README.md if adding operations)
- Follow the existing code style and patterns

❌ **Do NOT include:**
- Version bumps in `package.json`
- Updates to `CHANGELOG.md`
- Manual version tags

> **Note:** Do not update versions or `CHANGELOG.md` manually. Stable releases from `master` are handled by [semantic-release](https://semantic-release.gitbook.io/semantic-release/) based on conventional commits, while `beta` publishes a new beta package on every successful `beta` commit regardless of commit type.

### PR Checklist

- [ ] Code follows the existing style and patterns
- [ ] All tests pass (`npm test`)
- [ ] New functionality includes tests
- [ ] Documentation is updated (if applicable)
- [ ] Commit messages follow the Angular convention
- [ ] No version/changelog changes included

## 📋 Commit Convention

This project uses the [Angular Commit Convention](https://www.conventionalcommits.org/en/v1.0.0/#summary) for automated semantic versioning.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding/updating tests
- **chore**: Maintenance tasks
- **perf**: Performance improvements
- **ci**: CI/CD changes

### Examples

```bash
# New feature
feat(email): add mark as read operation

# Bug fix
fix(mailbox): handle special characters in mailbox names

# Documentation
docs: update installation instructions

# Tests
test(email): add integration tests for attachment download
```

### Scope (Optional)

Use scopes to indicate which part of the codebase is affected:
- `email` - Email operations
- `mailbox` - Mailbox operations
- `credentials` - Authentication
- `utils` - Utility functions
- `tests` - Test infrastructure

## 🔄 Version Management

### Stable Releases From `master`

The `master` branch uses **semantic-release** for automated stable version management:

- **`feat:`** commits trigger a **minor** version bump (e.g., 1.2.0 → 1.3.0)
- **`fix:`** commits trigger a **patch** version bump (e.g., 1.2.0 → 1.2.1)
- **`BREAKING CHANGE:`** in footer triggers a **major** version bump (e.g., 1.2.0 → 2.0.0)

### Important Notes

- **Never manually update** version numbers in `package.json`
- **Never manually edit** `CHANGELOG.md`
- Ensure your commit message type (`feat`, `fix`) accurately reflects the change for stable releases from `master`
- Breaking changes must include `BREAKING CHANGE:` in the commit footer

### Beta Releases From `beta`

The `beta` branch does **not** use semantic version analysis to decide whether to publish.

- Every successful `beta` commit triggers a new npm publish under the `beta` dist-tag
- Beta version numbers are derived from git metadata, not from `feat` / `fix` / `BREAKING CHANGE` detection
- Commit messages should still follow the Angular convention for repository consistency, but they do not gate beta publishing

## Release Channels

This repository publishes two npm channels:

- `master` -> stable npm releases
- `beta` -> npm releases with the `beta` dist-tag

### Automation Files

- `.github/workflows/release.yml` publishes stable and beta packages after the `Test` workflow succeeds
- `.github/workflows/beta-ff-to-master.yml` syncs `beta` with `master`
- `.github/workflows/promote-beta-to-master.yml` manually promotes a tested beta to `master`
- `scripts/prepare-beta-release.js` prepares beta README content and generated node metadata before beta publish
- `scripts/branch-sync.js` contains the git automation used by the sync/promote workflows
- `scripts/branch-sync-utils.js` contains the decision logic used by `scripts/branch-sync.js`

### Beta Publishing Behavior

When the `beta` branch is published:

1. CI checks out the tested `beta` commit.
2. The version is set to a beta-specific value for that publish using `git describe` output (for example `2.17.0-1-gabc1234-beta`).
3. `scripts/prepare-beta-release.js` updates `README.md` in the CI workspace with:
   - a beta notice
   - a summary of differences from stable
   - a list of beta-only commits
4. The same script generates `nodes/Imap/release/BetaReleaseInfo.ts`.
5. The package is published with the npm `beta` dist-tag.

This publish happens for every new `beta` commit after `Test` succeeds, even if the commit is `docs:`, `chore:`, or any other non-release type.

If beta does not currently contain commits beyond stable, the README explicitly says so and the in-app node notice stays hidden.

### Promotion Rules

- `master -> beta` is automatic
- If possible, CI fast-forwards `beta` to `master`
- If both branches moved forward, CI attempts to rebase `beta` onto `master`
- If the rebase conflicts, CI stops and requires manual intervention
- `beta -> master` is manual and only allowed as a fast-forward

## 🌳 Git Workflow

### Branch Management

1. **Fork the repository** to your GitHub account
2. **Create a feature branch** from `master`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Make your changes** with proper commit messages
4. **Use force-push** to keep history clean:
   ```bash
   git push --force-with-lease origin feat/your-feature-name
   ```

### Keeping History Clean

**Recommended practices:**

```bash
# Combine multiple commits into one
git rebase -i HEAD~3  # Interactive rebase for last 3 commits

# Amend the last commit instead of creating a new one
git commit --amend

# Drop commits instead of reverting
git rebase -i HEAD~5  # Mark commits as 'drop' instead of reverting

# Force push to update your branch (safe with --force-with-lease)
git push --force-with-lease origin your-branch
```

**Benefits:**
- Cleaner commit history
- Easier code review
- Better semantic-release behavior
- Professional Git practices

### Before Submitting PR

```bash
# Rebase on latest master
git fetch upstream
git rebase upstream/master

# Run final checks
npm test
npm run lint

# Force push your clean branch
git push --force-with-lease origin your-branch
```
