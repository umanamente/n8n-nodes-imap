jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
}));

const { execFileSync } = require('child_process');
const { runGit } = require('../../scripts/branch-sync');

describe('branch-sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should trim captured git output', () => {
    execFileSync.mockReturnValue('  ok \n');

    expect(runGit(['status'])).toBe('ok');
    expect(execFileSync).toHaveBeenCalledWith('git', ['status'], expect.objectContaining({
      encoding: 'utf8',
    }));
  });

  it('should return an empty string when stdio is inherited', () => {
    execFileSync.mockReturnValue(null);

    expect(runGit(['checkout', '-B', 'beta', 'origin/beta'], { stdio: 'inherit' })).toBe('');
  });
});
