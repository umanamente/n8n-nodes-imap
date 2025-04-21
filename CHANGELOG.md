## [2.7.0](https://github.com/umanamente/n8n-nodes-imap/compare/v2.6.1...v2.7.0) (2025-04-21)

### Features

* add option to include inline attachments in "download attachments" operation ([5d97f9f](https://github.com/umanamente/n8n-nodes-imap/commit/5d97f9f3beddc0332623de9b028472df9239d54e))

## [2.6.1](https://github.com/umanamente/n8n-nodes-imap/compare/v2.6.0...v2.6.1) (2025-04-14)

### Bug Fixes

* uidMap is optional ([a24b81e](https://github.com/umanamente/n8n-nodes-imap/commit/a24b81ef048f81f5ad7b1765e39a29a28ddaf9ff))

## [2.6.0](https://github.com/umanamente/n8n-nodes-imap/compare/v2.5.0...v2.6.0) (2025-04-14)

### Features

* added "Download as EML" operation ([aab6e46](https://github.com/umanamente/n8n-nodes-imap/commit/aab6e46de50666c5be68ee2217b201f888e77742))

## [2.5.0](https://github.com/umanamente/n8n-nodes-imap/compare/v2.4.3...v2.5.0) (2025-03-08)

### Features

* added 'mailboxPath' to Email items output ([dbda35f](https://github.com/umanamente/n8n-nodes-imap/commit/dbda35f4f9cc9b770318343e5181a63a6d57dcad))

## [2.4.3](https://github.com/umanamente/n8n-nodes-imap/compare/v2.4.2...v2.4.3) (2025-02-25)

### Bug Fixes

* issues with RFC822 content composition, ([bb54fc1](https://github.com/umanamente/n8n-nodes-imap/commit/bb54fc16b9571e0b179bdfaaa28d81b8735854cb))

## [2.4.2](https://github.com/umanamente/n8n-nodes-imap/compare/v2.4.1...v2.4.2) (2024-12-05)

### Bug Fixes

* fixed issue with reading emails from specific IMAP servers (Xeams) ([5687b2e](https://github.com/umanamente/n8n-nodes-imap/commit/5687b2e41fff5dd2e63d3d3eb7f8c982b5576dc4))

## [2.4.1](https://github.com/umanamente/n8n-nodes-imap/compare/v2.4.0...v2.4.1) (2024-10-31)

### Bug Fixes

* "Mailbox Create" operation used incorrect input parameters resulting in failure to create mailbox ([d38d029](https://github.com/umanamente/n8n-nodes-imap/commit/d38d02965d74873e547883921647b2280fa08e7b))

## [2.4.0](https://github.com/umanamente/n8n-nodes-imap/compare/v2.3.0...v2.4.0) (2024-10-15)

### Features

* add "UID" to search filters in "Get Emails" operation ([fa0260e](https://github.com/umanamente/n8n-nodes-imap/commit/fa0260e2fb734cec8ca12887376d9c539f8cbf61))

## [2.3.0](https://github.com/umanamente/n8n-nodes-imap/compare/v2.2.0...v2.3.0) (2024-09-04)

### Features

* **email:** Add Copy operation ([12653d4](https://github.com/umanamente/n8n-nodes-imap/commit/12653d443cce0875c017430bd8b62822af46d612))

## [2.2.0](https://github.com/umanamente/n8n-nodes-imap/compare/v2.1.1...v2.2.0) (2024-08-15)

### Features

* **mailbox:** add "Get Quota" operation ([62abb23](https://github.com/umanamente/n8n-nodes-imap/commit/62abb2377e345ce1c13a9eadedbe6454025894b1))

## [2.1.1](https://github.com/umanamente/n8n-nodes-imap/compare/v2.1.0...v2.1.1) (2024-07-27)

### Bug Fixes

* **create draft:** make field "Text" multiline ([131e777](https://github.com/umanamente/n8n-nodes-imap/commit/131e7775478a111bdf08036300396d54c3242c1f))

## [2.1.0](https://github.com/umanamente/n8n-nodes-imap/compare/v2.0.1...v2.1.0) (2024-07-27)

### Features

* "create email draft" operation ([81e673f](https://github.com/umanamente/n8n-nodes-imap/commit/81e673f52306d1766d89ea807e24434ea09e0f4f))

## [2.0.1](https://github.com/umanamente/n8n-nodes-imap/compare/v2.0.0...v2.0.1) (2024-07-12)


### Bug Fixes

* "Credentials not found" error when using mailbox autocompletion with N8N IMAP credentials ([1f9977b](https://github.com/umanamente/n8n-nodes-imap/commit/1f9977ba32bdf345a4663187f4594e5086b79b83))

## [2.0.0](https://github.com/umanamente/n8n-nodes-imap/compare/v1.3.1...v2.0.0) (2024-06-12)


### ⚠ BREAKING CHANGES

* **attachments:** The downloadAttachment node output is changed. Each output item could now contain multiple binary fields named "attachment_0", "attachment_1", etc.
Previously, there was only one binary field per output item named "attachment".

### Features

* **attachments:** add option to download all attachments or a comma-separated list of attachment IDs ([2c7a353](https://github.com/umanamente/n8n-nodes-imap/commit/2c7a353bbc03b8da311cac6468917924c56d30db))

## [1.3.1](https://github.com/umanamente/n8n-nodes-imap/compare/v1.3.0...v1.3.1) (2024-05-30)


### Bug Fixes

* Check if IMAP server returned empty email content ([53a5ed3](https://github.com/umanamente/n8n-nodes-imap/commit/53a5ed3902fcf855b9a889ee9723a56aff26f1ec))

## [1.3.0](https://github.com/umanamente/n8n-nodes-imap/compare/v1.2.3...v1.3.0) (2024-05-27)


### Features

* option to include email headers ([c3d89bb](https://github.com/umanamente/n8n-nodes-imap/commit/c3d89bb3349f1160c0d73f676bc57137fba2fb0b))
* option to include specific headers only ([f7c36dc](https://github.com/umanamente/n8n-nodes-imap/commit/f7c36dc3db86c036e86ea532d83d1f8c492cce3c))


### Bug Fixes

* close IMAP connection gracefully after use ([b2d4bc3](https://github.com/umanamente/n8n-nodes-imap/commit/b2d4bc3db862f7fb87803e42eecfbdf7edd2e9d6))
* fix text and HTML email content conversion ([102dea9](https://github.com/umanamente/n8n-nodes-imap/commit/102dea92c9709879b72a4475ed83135fd23d80ea))
* retrieve HTML or Text content correctly for single-part messages ([87a94f9](https://github.com/umanamente/n8n-nodes-imap/commit/87a94f90ee4756dfe2e6da94fb6232d65a6d339a))

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
