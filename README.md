# <img src="nodes/Imap/node-imap-icon.svg"  height="40"> n8n-nodes-imap

This is an n8n community node that adds support for [IMAP](https://en.wikipedia.org/wiki/Internet_Message_Access_Protocol) email servers.

* [Installation](#installation)  
* [Operations](#operations)  
* [Credentials](#credentials)
* [Version history](CHANGELOG.md)

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
  * Move an email to another mailbox
  * Copy an email into another mailbox
  * Set/remove flags on an email ("seen", "answered", "flagged", "deleted", "draft")
  * Create email draft in a mailbox
    * Use `n8n-nodes-eml` node to create complex emails. It supports attachments and other features.

## Credentials

Currently, this node supports only basic authentication (username and password).  
OAuth2 authentication is not supported yet.  

> NOTE: You can reuse core [N8N IMAP Trigger node](https://docs.n8n.io/integrations/builtin/credentials/imap/) credentials for this node.

