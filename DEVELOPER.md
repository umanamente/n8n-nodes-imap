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

## Contribution Workflow

1. **Fork** the repository
2. **Create feature branch**: `git checkout -b feat/your-feature`
3. **Follow Angular commit convention**: `feat: add new operation`
4. **Add tests** for your changes
5. **Keep history clean** with force-push and rebasing
6. **Submit PR** (don't update version/changelog - automated by semantic-release)

## Key Technologies

- **TypeScript** - Primary language
- **n8n-workflow** - n8n node framework
- **imapflow** - IMAP client library
- **Jest** - Testing framework
- **Docker** - Integration testing with Greenmail
- **semantic-release** - Automated versioning

---

📖 **Full Documentation**: [CONTRIBUTING.md](CONTRIBUTING.md)