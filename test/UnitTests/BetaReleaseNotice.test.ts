import { BetaReleaseInfo } from '../../nodes/Imap/release/BetaReleaseInfo';
import { buildBetaNoticeText, getBetaNoticeProperties } from '../../nodes/Imap/utils/BetaReleaseNotice';

describe('BetaReleaseNotice', () => {
  const betaReleaseInfo: BetaReleaseInfo = {
    channel: 'beta',
    version: '2.18.0-beta',
    stableVersion: '2.17.0',
    showNotice: true,
    bugReportUrl: 'https://github.com/umanamente/n8n-nodes-imap/issues/new/choose',
    betaOnlyCommitCount: 3,
    masterOnlyCommitCount: 0,
    betaOnlyCommits: [
      '1234567 feat: beta feature',
    ],
  };

  it('should build a beta notice message with version and bug report URL', () => {
    const noticeText = buildBetaNoticeText(betaReleaseInfo);

    expect(noticeText).toContain('Beta version 2.18.0-beta.');
    expect(noticeText).toContain('Stable version: 2.17.0.');
    expect(noticeText).toContain('Contains 3 beta-only commits.');
    expect(noticeText).toContain(betaReleaseInfo.bugReportUrl);
  });

  it('should return a notice property when the beta notice should be shown', () => {
    expect(getBetaNoticeProperties(betaReleaseInfo)).toEqual([
      {
        displayName: expect.stringContaining('Beta version 2.18.0-beta.'),
        name: 'notice',
        type: 'notice',
        default: '',
      },
    ]);
  });

  it('should not return a notice property when the beta notice is disabled', () => {
    expect(getBetaNoticeProperties({
      ...betaReleaseInfo,
      showNotice: false,
      betaOnlyCommitCount: 0,
    })).toEqual([]);
  });
});
