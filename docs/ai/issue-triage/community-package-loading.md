# Community Package Installation and Loading

[Triage index](../issue-triage.md) · Evidence checked: 2026-09-17. Recheck upstream status before replying.

## Recognize the case

n8n has known community-package installation/state failures: interrupted updates and concurrent installs can leave missing dependencies or an inconsistent node registry. Explain the n8n-side problem when evidence matches; say "consistent with" until the reporter's cause is established.

| Symptom | Check / earlier reports |
| --- | --- |
| Dependency `ENOENT` after update/reinstall | Incomplete installation, stale resolution, duplicates: [#126](https://github.com/umanamente/n8n-nodes-imap/issues/126), [#147](https://github.com/umanamente/n8n-nodes-imap/issues/147). |
| `Class could not be found` | Package exports/runtime compatibility as well as installation state: [#96](https://github.com/umanamente/n8n-nodes-imap/issues/96), [#101](https://github.com/umanamente/n8n-nodes-imap/issues/101), [#102](https://github.com/umanamente/n8n-nodes-imap/issues/102). |
| `Unrecognized node type`, especially on workers | Same package/version loaded on every execution process: [#88](https://github.com/umanamente/n8n-nodes-imap/issues/88), [#131](https://github.com/umanamente/n8n-nodes-imap/issues/131), [#132](https://github.com/umanamente/n8n-nodes-imap/issues/132). |

Do not assign `n8n-core-issue` from the message alone. [#115](https://github.com/umanamente/n8n-nodes-imap/issues/115) included node-side packaging/compatibility fixes confirmed in **2.16.2**. [#21](https://github.com/umanamente/n8n-nodes-imap/issues/21) included browser caching; [#130](https://github.com/umanamente/n8n-nodes-imap/issues/130) lacked diagnostics.

In #147, uninstall/redeploy restored installation. Its old `imapflow/lib/imap-flow.js` path suggests stale resolution after [imapflow 2.x moved to `dist/`](https://github.com/postalsys/imapflow/blob/v2.0.2/package.json), but the exact cause remains unconfirmed.

## Upstream evidence

- [n8n #21796](https://github.com/n8n-io/n8n/issues/21796): historical class-loading report, closed `not planned` with support/needs-info labels; **not proof of a fix**. The same symptom affected [Resend](https://github.com/resend/n8n-nodes-resend/issues/69).
- [n8n #30533, maintainer's explanation](https://github.com/n8n-io/n8n/issues/30533#issuecomment-5422712239): confirmed install races, registry gaps, and stale status; closed after fixes.
- Released milestones: update rollback in **2.30.0** ([#33256](https://github.com/n8n-io/n8n/pull/33256)); registry rebuild in **2.36.0** ([#36387](https://github.com/n8n-io/n8n/pull/36387)); serialized installs/status/startup fixes in **2.37.0** ([#36505](https://github.com/n8n-io/n8n/pull/36505), [#36727](https://github.com/n8n-io/n8n/pull/36727), [#36814](https://github.com/n8n-io/n8n/pull/36814)); failed-install recovery in **2.38.1** ([#36964](https://github.com/n8n-io/n8n/pull/36964), [#37034](https://github.com/n8n-io/n8n/pull/37034)). These do not guarantee every variant is fixed.

## Reply and recovery

1. Collect exact **failure-time** n8n, Node.js, and package versions, original `Cause`/stack, Docker image or install method, regular/queue mode, workers, and update/restart sequence. Check the affected release's `package.json`; v3 requires Node.js 20+ and `n8n-workflow >=1.95.0 <3`. Use n8n logs (`N8N_LOG_LEVEL=debug`); node debug output may be unavailable before loading.
2. Recommend a current stable n8n release containing the applicable fixes, then reinstall/restart. For queue mode, follow [manual installation](https://docs.n8n.io/integrations/community-nodes/installation-and-management/manual-installation/) and check every worker, persistent storage, and directory ownership. Avoid concurrent UI/CLI installs.
3. If reinstall fails, inventory all community packages/versions and back up n8n data. Stop processes writing to the nodes directory before manual cleanup; use the stopped container's mounted volume or a maintenance container (not `docker exec` into a stopped container). Back up and rebuild only community installation state under the verified `~/.n8n/nodes` path, typically `/home/node/.n8n/nodes`. The [cleanup reference](https://www.hostinger.com/support/the-specified-package-could-not-be-loaded-when-using-n8n-community-nodes/) removes **all community packages**: reinstall the recorded packages and restart before dependent workflows can run. Never delete the parent `.n8n` directory, edit DB records, or recommend `chmod 777`.

Use this reply only when the evidence matches; choose the closest earlier reports and omit diagnostics/recovery already supplied:

> Thanks for reporting this. Your symptoms are consistent with a known problem in n8n's community-package installation/loading flow: a failed update can leave dependencies or package state inconsistent. n8n has released related fixes ([upstream explanation](https://github.com/n8n-io/n8n/issues/30533#issuecomment-5422712239)); similar reports include [#126](https://github.com/umanamente/n8n-nodes-imap/issues/126) and [#147](https://github.com/umanamente/n8n-nodes-imap/issues/147).
>
> Please share the exact n8n, Node.js, and package versions at failure, the full error with secrets removed, and whether you use Docker/queue workers. Try a current stable n8n release and reinstall/restart ([manual installation](https://docs.n8n.io/integrations/community-nodes/installation-and-management/manual-installation/)). If this fails, [manual cleanup](https://www.hostinger.com/support/the-specified-package-could-not-be-loaded-when-using-n8n-community-nodes/) may help: first back up your data, record all community packages, and stop processes writing to the directory. Cleanup removes all community packages; reinstall them afterward.
>
> Please confirm what restored installation and which versions were involved so we can assess whether n8n needs a regression report.

## After confirmation: close or report upstream?

- Record failed/recovered versions and exact recovery steps; check whether a workflow now executes. Cleanup success alone does not prove the cause. Thank the reporter; when authorized, close the resolved installation issue as `completed`, noting **recovered by workaround**, not "fixed upstream". Track remaining IMAP runtime problems separately.
- Report upstream if the failure **originated on a release containing the applicable fix**, or new reproducible steps/logs expose another scenario. Include versions, deployment/storage topology, original error, trigger, recovery, and the local issue link. Corruption inherited from before an upgrade is not evidence of a new regression.
- Search current upstream issues first. Add evidence to a matching active report; for a distinct recurrence after a closed fix, prepare a new report linking it. With only "cleanup helped" on an old/unknown version, retain the local record and request missing facts; do not file a duplicate automatically. Ask the reporter for an upstream link, or post the prepared report when authorized, then cross-link and read back.
