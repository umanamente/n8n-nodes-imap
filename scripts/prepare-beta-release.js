const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  DEFAULT_BUG_REPORT_URL,
  buildBetaReadmeSection,
  buildBetaReleaseInfoSource,
  injectBetaSection,
  normalizeRepositoryUrl,
} = require('./beta-release-utils');

const rootDir = path.resolve(__dirname, '..');
const readmePath = path.join(rootDir, 'README.md');
const packageJsonPath = path.join(rootDir, 'package.json');
const betaReleaseInfoPath = path.join(rootDir, 'nodes', 'Imap', 'release', 'BetaReleaseInfo.ts');

// Read repository state directly from git so beta artifacts can be prepared in CI
// without committing generated README content back to the beta branch.
function runGit(command) {
  return execSync(`git ${command}`, {
    cwd: rootDir,
    encoding: 'utf8',
  }).trim();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getJsonAtGitRef(ref, relativePath) {
  return JSON.parse(runGit(`show ${ref}:${relativePath}`));
}

function getCommits(range) {
  const output = runGit(`log --reverse --pretty=format:%H%x09%s ${range}`);

  if (!output) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [hash, subject] = line.split('\t');
      return { hash, subject };
    });
}

function appendSummary(summary) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;

  if (!summaryPath) {
    return;
  }

  fs.appendFileSync(summaryPath, `${summary}\n`, 'utf8');
}

function main() {
  const pkg = readJson(packageJsonPath);
  const repositoryUrl = normalizeRepositoryUrl(pkg.repository?.url || '');
  const bugReportUrl = process.env.BETA_BUG_REPORT_URL || (repositoryUrl ? `${repositoryUrl}/issues/new/choose` : DEFAULT_BUG_REPORT_URL);
  const stableBaseRef = process.env.BETA_BASE_REF || 'origin/master';
  const betaHeadRef = process.env.BETA_HEAD_REF || 'HEAD';
  const betaVersion = pkg.version;
  const stablePackageJson = getJsonAtGitRef(stableBaseRef, 'package.json');
  const stableVersion = stablePackageJson.version || '';

  const [masterOnlyCountValue, betaOnlyCountValue] = runGit(`rev-list --left-right --count ${stableBaseRef}...${betaHeadRef}`)
    .split(/\s+/);

  const masterOnlyCount = Number(masterOnlyCountValue || 0);
  const betaOnlyCount = Number(betaOnlyCountValue || 0);

  const betaOnlyCommits = getCommits(`${stableBaseRef}..${betaHeadRef}`);
  const masterOnlyCommits = getCommits(`${betaHeadRef}..${stableBaseRef}`);

  // Update the npm-facing README in the CI workspace before publishing the beta package.
  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  const betaSection = buildBetaReadmeSection({
    betaVersion,
    stableVersion,
    bugReportUrl,
    repositoryUrl,
    betaOnlyCommits,
    masterOnlyCommits,
  });

  fs.writeFileSync(readmePath, injectBetaSection(readmeContent, betaSection), 'utf8');

  // Generate runtime metadata consumed by the optional beta notice in the node UI.
  const betaReleaseInfoSource = buildBetaReleaseInfoSource({
    channel: 'beta',
    version: betaVersion,
    stableVersion,
    showNotice: betaOnlyCount > 0,
    bugReportUrl,
    betaOnlyCommitCount: betaOnlyCount,
    masterOnlyCommitCount: masterOnlyCount,
    betaOnlyCommits,
  });

  fs.writeFileSync(betaReleaseInfoPath, betaReleaseInfoSource, 'utf8');

  console.log(`Prepared beta release metadata for version ${betaVersion}`);
  console.log(`Stable-only commits: ${masterOnlyCount}`);
  console.log(`Beta-only commits: ${betaOnlyCount}`);

  appendSummary([
    '## Beta Release Preparation',
    '',
    `- Beta version: \`${betaVersion}\``,
    `- Stable version: \`${stableVersion}\``,
    `- Beta-only commits: ${betaOnlyCount}`,
    `- Stable-only commits: ${masterOnlyCount}`,
    `- Notice visible in n8n: ${betaOnlyCount > 0 ? 'yes' : 'no'}`,
    '',
  ].join('\n'));
}

main();
