## [1.2.3](https://github.com/umanamente/n8n-nodes-imap/compare/v1.2.2...v1.2.3) (2024-02-14)


### Bug Fixes

* Don't terminate multiple items processing if a handler returned no data ([b46f86d](https://github.com/umanamente/n8n-nodes-imap/commit/b46f86d7b7fbe95306b389dc4cb0d357ed394f5f))

## [1.2.2](https://github.com/umanamente/n8n-nodes-imap/compare/v1.2.1...v1.2.2) (2024-02-14)


### Bug Fixes

* **dependabot:** NPM IP package vulnerable to Server-Side Request Forgery (SSRF) attacks ([3395bf9](https://github.com/umanamente/n8n-nodes-imap/commit/3395bf9f80653da6d2dd99fe0ff91595129fe732))

## [1.2.1](https://github.com/umanamente/n8n-nodes-imap/compare/v1.2.0...v1.2.1) (2024-02-14)


### Bug Fixes

* If IMAP node had multiple items as input, only first one was processed ([#5](https://github.com/umanamente/n8n-nodes-imap/issues/5)) ([8c78e20](https://github.com/umanamente/n8n-nodes-imap/commit/8c78e2024b9bc893049892a3d67aa737fde705cd))

## [1.2.0](https://github.com/umanamente/n8n-nodes-imap/compare/v1.1.1...v1.2.0) (2024-02-11)


### Features

* support credentials from core N8N IMAP Trigger node ([5959ca1](https://github.com/umanamente/n8n-nodes-imap/commit/5959ca1389a2e8dec589c613e2c363dd2c1b5818))

## [1.1.1](https://github.com/umanamente/n8n-nodes-imap/compare/v1.1.0...v1.1.1) (2024-01-07)


### Bug Fixes

* Checking for credentials problem during login and displaying server error message if failed ([6207a80](https://github.com/umanamente/n8n-nodes-imap/commit/6207a80f1ebed1ea311fb3ed15bf4cc53caf5866))
* Don't show "Cannot read properties of undefined (reading 'filename')" error if IMAP server hadn't returned attachment data ([5d306ad](https://github.com/umanamente/n8n-nodes-imap/commit/5d306ad143e93fd2c769e17e40a56c329a1a74de))

## [1.1.0](https://github.com/umanamente/n8n-nodes-imap/compare/v1.0.1...v1.1.0) (2023-12-31)


### Features

* Added "Set Flags" operation ([97c1166](https://github.com/umanamente/n8n-nodes-imap/commit/97c116670b0773dfa5c1356d78b5dc3cebf09333))

## [1.0.1](https://github.com/umanamente/n8n-nodes-imap/compare/v1.0.0...v1.0.1) (2023-12-30)


### Bug Fixes

* Mailboxes in "select mailbox" fields are loading correctly (fixed credential retrieval) ([0c48cc4](https://github.com/umanamente/n8n-nodes-imap/commit/0c48cc4772e04ce64a5656c50cd897d156709e55))
