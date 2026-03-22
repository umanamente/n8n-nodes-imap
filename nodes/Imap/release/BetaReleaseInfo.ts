export interface BetaReleaseInfo {
  channel: 'stable' | 'beta';
  version: string;
  stableVersion: string;
  showNotice: boolean;
  bugReportUrl: string;
  betaOnlyCommitCount: number;
  masterOnlyCommitCount: number;
  betaOnlyCommits: string[];
}

const betaReleaseInfo: BetaReleaseInfo = {
  channel: 'stable',
  version: '',
  stableVersion: '',
  showNotice: false,
  bugReportUrl: 'https://github.com/umanamente/n8n-nodes-imap/issues/new/choose',
  betaOnlyCommitCount: 0,
  masterOnlyCommitCount: 0,
  betaOnlyCommits: [],
};

export default betaReleaseInfo;
