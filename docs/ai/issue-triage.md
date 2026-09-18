# GitHub Issue Triage

Start here, then read only the matching guide. Keep recurring issue classes in focused files under `issue-triage/`; `AGENTS.md` links to this index.

| Issue class | Guide |
| --- | --- |
| Install/update fails; class not found, dependency `ENOENT`, or unrecognized node | [Community package installation and loading](issue-triage/community-package-loading.md) |
| Request for n8n Cloud availability or verification | [n8n Cloud eligibility](issue-triage/n8n-cloud.md) |

## Common rules

1. Read the issue and comments; acknowledge recovery already reported. Check the affected release and current upstream guidance before assigning a cause or calling something fixed.
2. Reply in concise English: thank the reporter, explain the evidence, link the matching instructions/issue, and request only missing diagnostics. Redact credentials, tokens, and private email data.
3. Keep installation failures separate from errors executing an installed node. Match duplicates by evidence, not title or error text alone.
4. Post comments, apply labels, close issues, or file upstream reports only within the task's authorization. Read back every mutation, including the close reason, to avoid duplicate actions.
