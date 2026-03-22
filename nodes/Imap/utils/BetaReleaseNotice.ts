import { INodeProperties } from 'n8n-workflow';
import betaReleaseInfo, { BetaReleaseInfo } from '../release/BetaReleaseInfo';

export function buildBetaNoticeText(releaseInfo: BetaReleaseInfo): string {
  const versionText = releaseInfo.version
    ? `Beta version ${releaseInfo.version}.`
    : 'Beta version.';
  const stableVersionText = releaseInfo.stableVersion
    ? ` Stable version: ${releaseInfo.stableVersion}.`
    : '';
  const diffText = releaseInfo.betaOnlyCommitCount > 0
    ? ` Contains ${releaseInfo.betaOnlyCommitCount} beta-only commit${releaseInfo.betaOnlyCommitCount === 1 ? '' : 's'}.`
    : '';
  const bugReportText = releaseInfo.bugReportUrl
    ? ` Report bugs: ${releaseInfo.bugReportUrl}`
    : '';

  return `${versionText}${stableVersionText}${diffText}${bugReportText}`.trim();
}

export function getBetaNoticeProperties(releaseInfo: BetaReleaseInfo = betaReleaseInfo): INodeProperties[] {
  if (!releaseInfo.showNotice) {
    return [];
  }

  return [
    {
      displayName: buildBetaNoticeText(releaseInfo),
      name: 'notice',
      type: 'notice',
      default: '',
    },
  ];
}
