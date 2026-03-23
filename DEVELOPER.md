# Developer Guide

> 👨‍💻 **For Contributors**: See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed setup instructions, testing guidelines, and development workflow.

## Quick Start for Developers

```bash
# Clone and install
git clone https://github.com/umanamente/n8n-nodes-imap.git
cd n8n-nodes-imap
npm install

# Build and test
npm run build
npm test

# Development mode
npm run dev
```

## Project Architecture

### Resource-Based Structure

The node is organized around IMAP resources (Email, Mailbox) with operations for each:

```
nodes/Imap/operations/
├── ResourcesList.ts        # Registry of all resources
├── email/                  # Email operations
│   ├── OperationsList.ts   # Email operation definitions
│   └── functions/          # Individual email operations
└── mailbox/                # Mailbox operations
    ├── OperationsList.ts   # Mailbox operation definitions
    └── functions/          # Individual mailbox operations
```

### Adding New Operations

1. **Create operation function** in appropriate `functions/` directory
2. **Register in OperationsList.ts** with UI definitions
3. **Add comprehensive tests** (unit + integration)
4. **Update documentation** if user-facing

See [CONTRIBUTING.md](CONTRIBUTING.md#adding-new-operations) for detailed instructions.

## Testing Strategy

- **Unit Tests** (`/test/UnitTests/`) - Fast, isolated tests
- **Greenmail Tests** (`/test/WithGreenmail/`) - Full integration with Docker IMAP server
- **Mock Tests** (`/test/WithImapflowMock/`) - Integration tests with mocked connections

```bash
# Run all tests
npm test

# Run specific test types
npx jest --selectProjects UnitTests
npx jest --selectProjects WithGreenmail  # Requires Docker
npx jest --selectProjects WithImapflowMock
```

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build TypeScript to JavaScript |
| `npm run dev` | Watch mode for development |
| `npm run run-dev` | Run n8n with this node in development |
| `npm run test` | Run all tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Check code style |
| `npm run format` | Format code with Prettier |

## Release Automation

This repository publishes two npm channels:

- `master` publishes the stable package through `semantic-release`
- `beta` publishes the package under the npm `beta` dist-tag on every successful `beta` commit

### Release Files

- `.github/workflows/release.yml` - Publishes stable packages after the `Test` workflow succeeds and publishes beta packages directly from `beta`
- `.github/workflows/beta-ff-to-master.yml` - Automatically syncs `beta` from `master`
- `.github/workflows/promote-beta-to-master.yml` - Manually promotes a tested beta to `master`
- `scripts/prepare-beta-release.js` - Prepares beta README content and generated node metadata before beta publish
- `scripts/beta-release-utils.js` - Shared helpers used by beta release preparation
- `scripts/branch-sync.js` - Executes the git actions used by sync and promotion workflows
- `scripts/branch-sync-utils.js` - Pure branch policy helpers covered by unit tests
- `nodes/Imap/release/BetaReleaseInfo.ts` - Generated metadata consumed by the optional in-app beta notice

### Beta Publish Flow

1. The release workflow runs directly on pushes to `beta` or when the sync workflow dispatches it for `beta`.
2. The release workflow checks out the exact `beta` commit being published.
3. CI sets a beta-specific package version from `git describe` output.
4. The workflow runs `npm run prepublishOnly` and `npx jest --coverage` before publishing.
5. `npm run publish:beta:ci` runs `scripts/prepare-beta-release.js`.
6. That script updates `README.md` in the CI workspace with a beta notice and a commit diff against `master`.
7. The same script generates `nodes/Imap/release/BetaReleaseInfo.ts` for the node UI.
8. The package is published to npm with the `beta` dist-tag.

This flow does not depend on `feat`, `fix`, or breaking-change commit detection. Any new `beta` commit publishes a new beta package after the beta checks in `release.yml` pass.

If beta currently has no commits beyond stable, the README still includes the beta section but the node UI notice remains hidden.

### Branch Sync Rules

- `master -> beta` runs automatically on pushes to `master`
- CI fast-forwards `beta` when possible
- CI rebases `beta` onto `master` when both branches moved forward
- CI stops without pushing if the rebase conflicts
- When sync changes `beta`, CI dispatches `release.yml` on `beta` to run the beta checks and publish flow
- `beta -> master` is manual and only allowed as a fast-forward

## Contribution Workflow

1. **Fork** the repository
2. **Create feature branch**: `git checkout -b feat/your-feature`
3. **Follow Angular commit convention**: `feat: add new operation`
4. **Add tests** for your changes
5. **Keep history clean** with force-push and rebasing
6. **Submit PR** (don't update version/changelog; stable releases are handled by `semantic-release`, beta publishes are generated by CI)

## Key Technologies

- **TypeScript** - Primary language
- **n8n-workflow** - n8n node framework
- **imapflow** - IMAP client library
- **Jest** - Testing framework
- **Docker** - Integration testing with Greenmail
- **semantic-release** - Stable-channel automated versioning

---

📖 **Full Documentation**: [CONTRIBUTING.md](CONTRIBUTING.md)
