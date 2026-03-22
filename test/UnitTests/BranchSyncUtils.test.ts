const { getPromotePlan, getSyncBetaPlan } = require('../../scripts/branch-sync-utils');

describe('branch-sync-utils', () => {
  describe('getSyncBetaPlan', () => {
    it('should return up-to-date when beta already contains master', () => {
      expect(getSyncBetaPlan(0, 3)).toEqual({
        changed: false,
        mode: 'up-to-date',
        message: 'Beta already contains all commits from master.',
      });
    });

    it('should return fast-forward when beta has no additional commits', () => {
      expect(getSyncBetaPlan(4, 0)).toEqual({
        changed: true,
        mode: 'fast-forward',
        message: 'Fast-forwarded beta to master.',
      });
    });

    it('should return rebase when both branches have unique commits', () => {
      expect(getSyncBetaPlan(2, 5)).toEqual({
        changed: true,
        mode: 'rebase',
        message: 'Rebased beta onto master and force-pushed the result.',
      });
    });
  });

  describe('getPromotePlan', () => {
    it('should return up-to-date when master already contains beta', () => {
      expect(getPromotePlan(0, 0)).toEqual({
        changed: false,
        mode: 'up-to-date',
        message: 'Master already contains beta.',
      });
    });

    it('should return diverged when master has commits missing from beta', () => {
      expect(getPromotePlan(1, 3)).toEqual({
        changed: false,
        mode: 'diverged',
        message: 'Master and beta have diverged. A fast-forward promotion is not possible.',
      });
    });

    it('should return fast-forward when beta is ahead and master is not divergent', () => {
      expect(getPromotePlan(0, 2)).toEqual({
        changed: true,
        mode: 'fast-forward',
        message: 'Promoted beta to master with a fast-forward merge.',
      });
    });
  });

  it('should reject invalid divergence counters', () => {
    expect(() => getSyncBetaPlan(-1, 0)).toThrow('masterOnly must be a non-negative integer');
    expect(() => getPromotePlan(0, 1.5)).toThrow('betaOnly must be a non-negative integer');
  });
});
