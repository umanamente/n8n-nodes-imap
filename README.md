# <img src="nodes/Imap/node-imap-icon.svg"  height="40"> n8n-nodes-imap

This is an n8n community node that adds support for [IMAP](https://en.wikipedia.org/wiki/Internet_Message_Access_Protocol) email servers.

* [Installation](#installation)  
* [Operations](#operations)  
* [Credentials](#credentials)
* [Troubleshooting & Debug](#troubleshooting--debug)
* [Version history](CHANGELOG.md)
* **For Developers**: [Contributing Guide](CONTRIBUTING.md) | [Developer Quick Start](DEVELOPER.md)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

Use `n8n-nodes-imap` in N8N settings to install the stable version.

To install beta version, use `n8n-nodes-imap@beta`.

NPMJS: [n8n-nodes-imap](https://www.npmjs.com/package/n8n-nodes-imap)


## Operations

* Mailbox
  * Get list of mailboxes (including status information like number of messages)
  * Get status of a mailbox (number of messages, etc.)
  * Create a mailbox
  * Rename a mailbox
  * ~Delete a mailbox~ (disabled due to danger of accidental data loss and no apparent use case)
* Email
  * Get list of emails in a mailbox
  * Download attachments from an email
  * Permanently delete an email from a mailbox
  * Move an email to another mailbox
  * Copy an email into another mailbox
  * Set/remove flags on an email ("seen", "answered", "flagged", "deleted", "draft")
  * Create email draft in a mailbox
    * Use `n8n-nodes-eml` node to create complex emails. It supports attachments and other features.

## Credentials

Currently, this node supports only basic authentication (username and password).  
OAuth2 authentication is not supported yet.  

> NOTE: You can reuse core [N8N IMAP Trigger node](https://docs.n8n.io/integrations/builtin/credentials/imap/) credentials for this node.

## Troubleshooting & Debug

If you encounter issues with the IMAP node, you can enable debug mode to get detailed logs and diagnostic information:

### Enable Debug Mode

Set the following environment variable before starting n8n:

```bash
N8N_NODES_DEBUG_ENABLED=true
```

When debug mode is enabled:
- The IMAP node will create an additional **"debug"** output containing detailed logs
- Enhanced error messages and diagnostic information will be available
- Connection and operation details will be logged for troubleshooting

### Getting Debug Information

1. **Set environment variables**:
   ```bash
   N8N_LOG_LEVEL=debug
   N8N_NODES_DEBUG_ENABLED=true
   ```

2. **Restart your n8n instance**

3. **Execute your workflow** - the IMAP node will now provide debug output

4. **Check the debug output** - connect the debug output to a Set node or similar to view the diagnostic information

### Reporting Issues

When reporting bugs or issues:
- Always enable debug mode first
- Include the debug output in your issue report
- Remove any sensitive information (passwords, email addresses, etc.) from logs
- Use our [issue templates](.github/ISSUE_TEMPLATE/) for structured bug reports
