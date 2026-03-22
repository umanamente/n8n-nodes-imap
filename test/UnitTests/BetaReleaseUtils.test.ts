const {
  BETA_SECTION_END,
  BETA_SECTION_START,
  buildBetaReadmeSection,
  buildBetaReleaseInfoSource,
  injectBetaSection,
  normalizeRepositoryUrl,
  stripBetaSection,
} = require('../../scripts/beta-release-utils');

describe('beta-release-utils', () => {
  it('should normalize GitHub repository URLs', () => {
    expect(normalizeRepositoryUrl('git+https://github.com/umanamente/n8n-nodes-imap.git'))
      .toBe('https://github.com/umanamente/n8n-nodes-imap');
    expect(normalizeRepositoryUrl('git@github.com:umanamente/n8n-nodes-imap.git'))
      .toBe('https://github.com/umanamente/n8n-nodes-imap');
  });

  it('should build a beta README section with additional beta commits', () => {
    const section = buildBetaReadmeSection({
      betaVersion: '2.18.0-beta',
      stableVersion: '2.17.0',
      bugReportUrl: 'https://github.com/umanamente/n8n-nodes-imap/issues/new/choose',
      repositoryUrl: 'https://github.com/umanamente/n8n-nodes-imap',
      betaOnlyCommits: [
        {
          hash: '1234567890abcdef',
          subject: 'feat: beta feature',
        },
      ],
      masterOnlyCommits: [],
    });

    expect(section).toContain('## Beta Channel Notice');
    expect(section).toContain('2.18.0-beta');
    expect(section).toContain('Additional beta changes compared to stable');
    expect(section).toContain('[`1234567`](https://github.com/umanamente/n8n-nodes-imap/commit/1234567890abcdef) feat: beta feature');
  });

  it('should mention when there are no beta-only changes yet', () => {
    const section = buildBetaReadmeSection({
      betaVersion: '2.18.0-beta',
      stableVersion: '2.17.0',
      betaOnlyCommits: [],
      masterOnlyCommits: [],
    });

    expect(section).toContain('No additional beta-only changes compared to the stable branch are available yet.');
  });

  it('should inject and replace the generated beta section before installation', () => {
    const readme = [
      '# Example',
      '',
      'Intro',
      '',
      '## Installation',
      '',
      'Install steps',
      '',
    ].join('\n');

    const firstPass = injectBetaSection(readme, '## Beta Channel Notice\n\nFirst pass');
    const secondPass = injectBetaSection(firstPass, '## Beta Channel Notice\n\nSecond pass');

    expect(firstPass).toContain(BETA_SECTION_START);
    expect(firstPass).toContain(BETA_SECTION_END);
    expect(firstPass.indexOf('## Beta Channel Notice')).toBeLessThan(firstPass.indexOf('## Installation'));

    expect(secondPass).toContain('Second pass');
    expect(secondPass).not.toContain('First pass');
    expect(stripBetaSection(secondPass)).toBe(readme.trimEnd());
  });

  it('should strip duplicate beta sections before injecting a fresh one', () => {
    const readmeWithDuplicates = [
      '# Example',
      '',
      BETA_SECTION_START,
      '## Beta Channel Notice',
      '',
      'First stale block',
      BETA_SECTION_END,
      '',
      'Intro',
      '',
      BETA_SECTION_START,
      '## Beta Channel Notice',
      '',
      'Second stale block',
      BETA_SECTION_END,
      '',
      '## Installation',
      '',
      'Install steps',
      '',
    ].join('\n');

    const stripped = stripBetaSection(readmeWithDuplicates);
    const reinjected = injectBetaSection(readmeWithDuplicates, '## Beta Channel Notice\n\nFresh block');

    expect(stripped).not.toContain(BETA_SECTION_START);
    expect(stripped).not.toContain('First stale block');
    expect(stripped).not.toContain('Second stale block');
    expect(reinjected.match(new RegExp(BETA_SECTION_START, 'g'))).toHaveLength(1);
    expect(reinjected).toContain('Fresh block');
    expect(reinjected).not.toContain('First stale block');
    expect(reinjected).not.toContain('Second stale block');
  });

  it('should generate TypeScript beta release metadata source', () => {
    const source = buildBetaReleaseInfoSource({
      channel: 'beta',
      version: '2.18.0-beta',
      stableVersion: '2.17.0',
      showNotice: true,
      bugReportUrl: 'https://github.com/umanamente/n8n-nodes-imap/issues/new/choose',
      betaOnlyCommitCount: 2,
      masterOnlyCommitCount: 0,
      betaOnlyCommits: [
        {
          hash: '1234567890abcdef',
          subject: 'feat: beta feature',
        },
      ],
    });

    expect(source).toContain("channel: 'stable' | 'beta';");
    expect(source).toContain("version: '2.18.0-beta'");
    expect(source).toContain('showNotice: true');
    expect(source).toContain("betaOnlyCommits: [");
    expect(source).toContain("1234567 feat: beta feature");
  });
});
