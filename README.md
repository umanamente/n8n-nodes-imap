# <img src="nodes/Imap/node-imap-icon.svg"  height="40"> n8n-nodes-imap

This is an n8n community node that adds support for [IMAP](https://en.wikipedia.org/wiki/Internet_Message_Access_Protocol) email servers.

* [Installation](#installation)  
* [Operations](#operations)  
* [Credentials](#credentials)
* [Version history](CHANGELOG.md)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

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
  * Set/remove flags on an email ("seen", "answered", "flagged", "deleted", "draft")

## Credentials

Currently, this node supports only basic authentication (username and password).  
OAuth2 authentication is not supported yet.  

