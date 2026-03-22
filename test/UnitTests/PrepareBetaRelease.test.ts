const path = require('path');

interface PackageJsonLike {
  version: string;
  repository?: {
    url?: string;
  };
}

interface LoadModuleOptions {
  gitOutputs?: Record<string, string>;
  normalizedRepositoryUrl?: string;
  pkg?: PackageJsonLike;
  readmeContent?: string;
}

interface PrepareBetaReleaseModule {
  appendSummary: (summary: string) => void;
  getCommits: (range: string) => Array<{ hash: string; subject: string }>;
  getAheadBehindCounts: (leftRef: string, rightRef: string) => { leftCount: number; rightCount: number };
  getJsonAtGitRef: (ref: string, relativePath: string) => Record<string, unknown>;
  main: () => void;
  readJson: (filePath: string) => Record<string, unknown>;
  runGit: (args: string[]) => string;
}

describe('prepare-beta-release', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const readmePath = path.join(rootDir, 'README.md');
  const packageJsonPath = path.join(rootDir, 'package.json');
  const betaReleaseInfoPath = path.join(rootDir, 'nodes', 'Imap', 'release', 'BetaReleaseInfo.ts');
  const summaryPath = path.join(rootDir, 'tmp', 'beta-summary.md');
  const defaultBugReportUrl = 'https://default.example/issues/new/choose';
  const originalEnv = process.env;
  const getBaseEnv = () => {
    const {
      BETA_BASE_REF: _betaBaseRef,
      BETA_BUG_REPORT_URL: _betaBugReportUrl,
      BETA_HEAD_REF: _betaHeadRef,
      GITHUB_STEP_SUMMARY: _githubStepSummary,
      ...rest
    } = originalEnv;

    return { ...rest };
  };

  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    process.env = getBaseEnv();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadModule(options: LoadModuleOptions = {}) {
    const pkg: PackageJsonLike = options.pkg ?? {
      version: '2.18.0-beta.3',
      repository: {
        url: 'git+https://github.com/umanamente/n8n-nodes-imap.git',
      },
    };
    const readmeContent = options.readmeContent ?? '# README\n\n## Installation\n\nInstall steps.\n';
    const gitOutputs = options.gitOutputs ?? {};

    const appendFileSync = jest.fn();
    const readFileSync = jest.fn((filePath: string) => {
      if (filePath === packageJsonPath) {
        return JSON.stringify(pkg);
      }

      if (filePath === readmePath) {
        return readmeContent;
      }

      throw new Error(`Unexpected file read: ${filePath}`);
    });
    const writeFileSync = jest.fn();
    const execFileSync = jest.fn((command: string, args: string[]) => {
      const key = `${command} ${args.join(' ')}`;
      const output = gitOutputs[key];

      if (output === undefined) {
        throw new Error(`Unexpected git command: ${key}`);
      }

      return output;
    });
    const normalizeRepositoryUrl = jest.fn(
      (_repositoryUrl: string) => options.normalizedRepositoryUrl ?? 'https://github.com/umanamente/n8n-nodes-imap',
    );
    const buildBetaReadmeSection = jest.fn((_input: Record<string, unknown>) => 'GENERATED README SECTION');
    const buildBetaReleaseInfoSource = jest.fn((_input: Record<string, unknown>) => 'GENERATED BETA RELEASE INFO');
    const injectBetaSection = jest.fn((_content: string, section: string) => `INJECTED:${section}`);

    jest.doMock('child_process', () => ({
      execFileSync,
    }));
    jest.doMock('fs', () => ({
      appendFileSync,
      readFileSync,
      writeFileSync,
    }));
    jest.doMock('../../scripts/beta-release-utils', () => ({
      DEFAULT_BUG_REPORT_URL: defaultBugReportUrl,
      buildBetaReadmeSection,
      buildBetaReleaseInfoSource,
      injectBetaSection,
      normalizeRepositoryUrl,
    }));

    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    let prepareBetaRelease!: PrepareBetaReleaseModule;

    jest.isolateModules(() => {
      prepareBetaRelease = require('../../scripts/prepare-beta-release') as PrepareBetaReleaseModule;
    });

    return {
      appendFileSync,
      buildBetaReadmeSection,
      buildBetaReleaseInfoSource,
      consoleLogSpy,
      execFileSync,
      injectBetaSection,
      normalizeRepositoryUrl,
      pkg,
      prepareBetaRelease,
      readFileSync,
      writeFileSync,
    };
  }

  it('should prepare README and runtime beta metadata with explicit CI refs', () => {
    process.env = {
      ...getBaseEnv(),
      BETA_BASE_REF: 'origin/release',
      BETA_BUG_REPORT_URL: 'https://bugs.example.com/beta',
      BETA_HEAD_REF: 'origin/beta',
      GITHUB_STEP_SUMMARY: summaryPath,
    };

    const {
      appendFileSync,
      buildBetaReadmeSection,
      buildBetaReleaseInfoSource,
      consoleLogSpy,
      normalizeRepositoryUrl,
      pkg,
      prepareBetaRelease,
      writeFileSync,
    } = loadModule({
      gitOutputs: {
        'git show origin/release:package.json': '{"version":"2.17.0"}\n',
        'git rev-list --left-right --count origin/release...origin/beta': '2\t3\n',
        'git log --reverse --pretty=format:%H%x09%s origin/release..origin/beta': '1234567890abcdef\tfeat: beta feature\nabcdef0123456789\tfix: beta bug',
        'git log --reverse --pretty=format:%H%x09%s origin/beta..origin/release': 'fedcba9876543210\tfix: stable hotfix',
      },
    });

    prepareBetaRelease.main();

    expect(normalizeRepositoryUrl).toHaveBeenCalledWith(pkg.repository?.url);
    expect(buildBetaReadmeSection).toHaveBeenCalledWith({
      betaOnlyCommits: [
        { hash: '1234567890abcdef', subject: 'feat: beta feature' },
        { hash: 'abcdef0123456789', subject: 'fix: beta bug' },
      ],
      betaVersion: '2.18.0-beta.3',
      bugReportUrl: 'https://bugs.example.com/beta',
      masterOnlyCommits: [
        { hash: 'fedcba9876543210', subject: 'fix: stable hotfix' },
      ],
      repositoryUrl: 'https://github.com/umanamente/n8n-nodes-imap',
      stableVersion: '2.17.0',
    });
    expect(writeFileSync).toHaveBeenNthCalledWith(1, readmePath, 'INJECTED:GENERATED README SECTION', 'utf8');
    expect(buildBetaReleaseInfoSource).toHaveBeenCalledWith({
      betaOnlyCommitCount: 3,
      betaOnlyCommits: [
        { hash: '1234567890abcdef', subject: 'feat: beta feature' },
        { hash: 'abcdef0123456789', subject: 'fix: beta bug' },
      ],
      bugReportUrl: 'https://bugs.example.com/beta',
      channel: 'beta',
      masterOnlyCommitCount: 2,
      showNotice: true,
      stableVersion: '2.17.0',
      version: '2.18.0-beta.3',
    });
    expect(writeFileSync).toHaveBeenNthCalledWith(2, betaReleaseInfoPath, 'GENERATED BETA RELEASE INFO', 'utf8');
    expect(appendFileSync).toHaveBeenCalledWith(
      summaryPath,
      expect.stringContaining('- Notice visible in n8n: yes'),
      'utf8',
    );
    expect(consoleLogSpy).toHaveBeenCalledWith('Prepared beta release metadata for version 2.18.0-beta.3');
    expect(consoleLogSpy).toHaveBeenCalledWith('Stable-only commits: 2');
    expect(consoleLogSpy).toHaveBeenCalledWith('Beta-only commits: 3');
  });

  it('should fall back to default repository and bug-report handling when metadata is missing', () => {
    process.env = getBaseEnv();

    const {
      appendFileSync,
      buildBetaReadmeSection,
      buildBetaReleaseInfoSource,
      prepareBetaRelease,
    } = loadModule({
      gitOutputs: {
        'git show origin/master:package.json': '{}\n',
        'git rev-list --left-right --count origin/master...HEAD': '0 0\n',
        'git log --reverse --pretty=format:%H%x09%s origin/master..HEAD': '',
        'git log --reverse --pretty=format:%H%x09%s HEAD..origin/master': '',
      },
      normalizedRepositoryUrl: '',
      pkg: {
        version: '2.18.0-beta.4',
      },
    });

    prepareBetaRelease.main();

    expect(buildBetaReadmeSection).toHaveBeenCalledWith({
      betaOnlyCommits: [],
      betaVersion: '2.18.0-beta.4',
      bugReportUrl: defaultBugReportUrl,
      masterOnlyCommits: [],
      repositoryUrl: '',
      stableVersion: '',
    });
    expect(buildBetaReleaseInfoSource).toHaveBeenCalledWith({
      betaOnlyCommitCount: 0,
      betaOnlyCommits: [],
      bugReportUrl: defaultBugReportUrl,
      channel: 'beta',
      masterOnlyCommitCount: 0,
      showNotice: false,
      stableVersion: '',
      version: '2.18.0-beta.4',
    });
    expect(appendFileSync).not.toHaveBeenCalled();
  });

  it('should derive the bug report URL from the repository when no override is provided', () => {
    process.env = getBaseEnv();

    const {
      buildBetaReadmeSection,
      buildBetaReleaseInfoSource,
      prepareBetaRelease,
    } = loadModule({
      gitOutputs: {
        'git show origin/master:package.json': '{"version":"2.17.0"}\n',
        'git rev-list --left-right --count origin/master...HEAD': '1 2\n',
        'git log --reverse --pretty=format:%H%x09%s origin/master..HEAD': '',
        'git log --reverse --pretty=format:%H%x09%s HEAD..origin/master': '',
      },
      normalizedRepositoryUrl: 'https://github.com/umanamente/n8n-nodes-imap',
    });

    prepareBetaRelease.main();

    expect(buildBetaReadmeSection).toHaveBeenCalledWith(expect.objectContaining({
      bugReportUrl: 'https://github.com/umanamente/n8n-nodes-imap/issues/new/choose',
    }));
    expect(buildBetaReleaseInfoSource).toHaveBeenCalledWith(expect.objectContaining({
      bugReportUrl: 'https://github.com/umanamente/n8n-nodes-imap/issues/new/choose',
    }));
  });

  it('should expose helper functions for git parsing, json loading, and summary writing', () => {
    process.env = {
      ...getBaseEnv(),
      GITHUB_STEP_SUMMARY: summaryPath,
    };

    const {
      appendFileSync,
      execFileSync,
      pkg,
      prepareBetaRelease,
    } = loadModule({
      gitOutputs: {
        'git rev-parse --short HEAD': 'abc1234\n',
        'git show origin/master:package.json': '{"version":"2.16.0"}\n',
        'git rev-list --left-right --count origin/master...HEAD': '4 5\n',
        'git log --reverse --pretty=format:%H%x09%s origin/master..HEAD': '1111111111111111\tfeat: one\n2222222222222222\tfix: two',
      },
    });

    expect(prepareBetaRelease.runGit(['rev-parse', '--short', 'HEAD'])).toBe('abc1234');
    expect(execFileSync).toHaveBeenCalledWith('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: rootDir,
      encoding: 'utf8',
    });
    expect(prepareBetaRelease.readJson(packageJsonPath)).toEqual(pkg);
    expect(prepareBetaRelease.getJsonAtGitRef('origin/master', 'package.json')).toEqual({
      version: '2.16.0',
    });
    expect(prepareBetaRelease.getAheadBehindCounts('origin/master', 'HEAD')).toEqual({
      leftCount: 4,
      rightCount: 5,
    });
    expect(prepareBetaRelease.getCommits('origin/master..HEAD')).toEqual([
      { hash: '1111111111111111', subject: 'feat: one' },
      { hash: '2222222222222222', subject: 'fix: two' },
    ]);

    prepareBetaRelease.appendSummary('summary line');

    expect(appendFileSync).toHaveBeenCalledWith(summaryPath, 'summary line\n', 'utf8');
  });

  it('should preserve tabs inside commit subjects when parsing git log output', () => {
    process.env = getBaseEnv();

    const { prepareBetaRelease } = loadModule({
      gitOutputs: {
        'git log --reverse --pretty=format:%H%x09%s origin/master..HEAD': '1111111111111111\tfeat:\tbeta note\twith tabs',
      },
    });

    expect(prepareBetaRelease.getCommits('origin/master..HEAD')).toEqual([
      { hash: '1111111111111111', subject: 'feat:\tbeta note\twith tabs' },
    ]);
  });

  it('should fall back to an empty subject when a git log line has no tab separator', () => {
    process.env = getBaseEnv();

    const { prepareBetaRelease } = loadModule({
      gitOutputs: {
        'git log --reverse --pretty=format:%H%x09%s origin/master..HEAD': '2222222222222222',
      },
    });

    expect(prepareBetaRelease.getCommits('origin/master..HEAD')).toEqual([
      { hash: '2222222222222222', subject: '' },
    ]);
  });

  it('should fail fast when git returns malformed ahead/behind counts', () => {
    process.env = getBaseEnv();

    const {
      buildBetaReadmeSection,
      buildBetaReleaseInfoSource,
      prepareBetaRelease,
      writeFileSync,
    } = loadModule({
      gitOutputs: {
        'git show origin/master:package.json': '{"version":"2.17.0"}\n',
        'git rev-list --left-right --count origin/master...HEAD': 'foo 1\n',
      },
    });

    expect(() => prepareBetaRelease.main()).toThrow('Unexpected ahead/behind output: "foo 1"');
    expect(buildBetaReadmeSection).not.toHaveBeenCalled();
    expect(buildBetaReleaseInfoSource).not.toHaveBeenCalled();
    expect(writeFileSync).not.toHaveBeenCalled();
  });
});
