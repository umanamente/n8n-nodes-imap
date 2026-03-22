const BETA_SECTION_START = '<!-- beta-release-info:start -->';
const BETA_SECTION_END = '<!-- beta-release-info:end -->';
const DEFAULT_BUG_REPORT_URL = 'https://github.com/umanamente/n8n-nodes-imap/issues/new/choose';

// Shared helpers for beta package preparation.
// These functions build the temporary README block published to npm and
// the generated TypeScript module consumed by the node UI notice.
function normalizeRepositoryUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim().replace(/^git\+/, '').replace(/\.git$/, '');

  if (trimmed.startsWith('git@github.com:')) {
    return `https://github.com/${trimmed.slice('git@github.com:'.length)}`;
  }

  return trimmed;
}

function stripBetaSection(content) {
  const betaSectionPattern = new RegExp(
    `${BETA_SECTION_START}[\\s\\S]*?${BETA_SECTION_END}\\s*`,
    'gm',
  );

  return content.replace(betaSectionPattern, '').trimEnd();
}

function injectBetaSection(content, section) {
  const cleanContent = stripBetaSection(content);
  const betaSection = `${BETA_SECTION_START}\n${section.trim()}\n${BETA_SECTION_END}`;
  const installationHeading = '\n## Installation';
  const installationHeadingIndex = cleanContent.indexOf(installationHeading);

  // Keep the generated block near the top of README, before installation instructions.
  if (installationHeadingIndex === -1) {
    return `${betaSection}\n\n${cleanContent.trimStart()}`.trimEnd() + '\n';
  }

  const beforeInstallation = cleanContent.slice(0, installationHeadingIndex).trimEnd();
  const afterInstallation = cleanContent.slice(installationHeadingIndex).trimStart();

  return `${beforeInstallation}\n\n${betaSection}\n\n${afterInstallation}`.trimEnd() + '\n';
}

function formatCommitList(commits, repositoryUrl) {
  return commits.map((commit) => {
    const shortHash = commit.hash.slice(0, 7);

    if (!repositoryUrl) {
      return `- \`${shortHash}\` ${commit.subject}`;
    }

    return `- [\`${shortHash}\`](${repositoryUrl}/commit/${commit.hash}) ${commit.subject}`;
  });
}

function buildBetaReadmeSection({
  betaVersion,
  stableVersion,
  bugReportUrl = DEFAULT_BUG_REPORT_URL,
  repositoryUrl = '',
  betaOnlyCommits = [],
  masterOnlyCommits = [],
}) {
  const lines = [
    '## Beta Channel Notice',
    '',
    '![Beta channel](https://img.shields.io/badge/channel-beta-orange)',
    '',
    `> Published from the \`beta\` branch as version \`${betaVersion}\`.`,
  ];

  if (stableVersion) {
    lines.push(`> Current stable branch version: \`${stableVersion}\`.`);
  }

  lines.push(`> Report bugs: ${bugReportUrl}`);
  lines.push('');

  if (betaOnlyCommits.length > 0) {
    lines.push('### Additional beta changes compared to stable');
    lines.push('');
    lines.push(...formatCommitList(betaOnlyCommits, repositoryUrl));
  } else {
    lines.push('No additional beta-only changes compared to the stable branch are available yet.');
  }

  if (masterOnlyCommits.length > 0) {
    lines.push('');
    lines.push('### Stable commits not yet included in this beta build');
    lines.push('');
    lines.push(...formatCommitList(masterOnlyCommits, repositoryUrl));
  }

  return lines.join('\n').trim();
}

function escapeTypeScriptString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function buildBetaReleaseInfoSource({
  channel,
  version,
  stableVersion,
  showNotice,
  bugReportUrl,
  betaOnlyCommitCount,
  masterOnlyCommitCount,
  betaOnlyCommits = [],
}) {
  const betaOnlyCommitLiterals = betaOnlyCommits.map((commit) => {
    return `    '${escapeTypeScriptString(`${commit.hash.slice(0, 7)} ${commit.subject}`)}',`;
  });

  const betaOnlyCommitArray = betaOnlyCommitLiterals.length > 0
    ? `[\n${betaOnlyCommitLiterals.join('\n')}\n  ]`
    : '[]';

  return [
    'export interface BetaReleaseInfo {',
    "  channel: 'stable' | 'beta';",
    '  version: string;',
    '  stableVersion: string;',
    '  showNotice: boolean;',
    '  bugReportUrl: string;',
    '  betaOnlyCommitCount: number;',
    '  masterOnlyCommitCount: number;',
    '  betaOnlyCommits: string[];',
    '}',
    '',
    'const betaReleaseInfo: BetaReleaseInfo = {',
    `  channel: '${channel}',`,
    `  version: '${escapeTypeScriptString(version)}',`,
    `  stableVersion: '${escapeTypeScriptString(stableVersion)}',`,
    `  showNotice: ${showNotice ? 'true' : 'false'},`,
    `  bugReportUrl: '${escapeTypeScriptString(bugReportUrl)}',`,
    `  betaOnlyCommitCount: ${betaOnlyCommitCount},`,
    `  masterOnlyCommitCount: ${masterOnlyCommitCount},`,
    `  betaOnlyCommits: ${betaOnlyCommitArray},`,
    '};',
    '',
    'export default betaReleaseInfo;',
    '',
  ].join('\n');
}

module.exports = {
  BETA_SECTION_END,
  BETA_SECTION_START,
  DEFAULT_BUG_REPORT_URL,
  buildBetaReadmeSection,
  buildBetaReleaseInfoSource,
  injectBetaSection,
  normalizeRepositoryUrl,
  stripBetaSection,
};
