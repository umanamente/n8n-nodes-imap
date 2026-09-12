# GitHub Issue Triage

Use this guide when reviewing or responding to GitHub issues. Keep other workflow-specific guidance in separate focused files under `docs/ai/` and add only a short pointer to `AGENTS.md`.

## n8n Cloud availability and verification

For requests to make `n8n-nodes-imap` available or verified on n8n Cloud:

1. Recheck the current [n8n community node verification guidelines](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines/) and the direct runtime dependencies in `package.json`. Do not rely on an earlier policy or dependency list.
2. If the restriction still applies, explain that verified community packages cannot include external dependencies and identify the dependencies that make this package ineligible.
3. State that the node remains available and supported for self-hosted n8n installations. Link to the README's [n8n Cloud compatibility](../../README.md#n8n-cloud-compatibility) section.
4. Describe Cloud eligibility as dependent on either a future n8n policy change or n8n explicitly permitting the required libraries. Do not imply affiliation with n8n or promise future Cloud support.
5. When authorized, close clear duplicates or requests that remain ineligible under the current rules. Use the close reason that best matches the issue, normally `not planned` for a request that is not currently actionable.
6. After posting a comment or changing issue state, read back the comment, issue state, and close reason to confirm the mutation and avoid duplicate actions.
