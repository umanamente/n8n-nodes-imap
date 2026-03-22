// Pure decision helpers for branch synchronization workflows.
// Keep branch policy here so it can be tested without touching a real git repository.

function assertNonNegativeInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
}

function getSyncBetaPlan(masterOnly, betaOnly) {
  assertNonNegativeInteger(masterOnly, 'masterOnly');
  assertNonNegativeInteger(betaOnly, 'betaOnly');

  // Beta is already up to date when there are no commits missing from master.
  if (masterOnly === 0) {
    return {
      changed: false,
      mode: 'up-to-date',
      message: 'Beta already contains all commits from master.',
    };
  }

  // A fast-forward is enough when beta has no unique commits of its own.
  if (betaOnly === 0) {
    return {
      changed: true,
      mode: 'fast-forward',
      message: 'Fast-forwarded beta to master.',
    };
  }

  // If both branches moved forward, the workflow will try to rebase beta onto master.
  return {
    changed: true,
    mode: 'rebase',
    message: 'Rebased beta onto master and force-pushed the result.',
  };
}

function getPromotePlan(masterOnly, betaOnly) {
  assertNonNegativeInteger(masterOnly, 'masterOnly');
  assertNonNegativeInteger(betaOnly, 'betaOnly');

  // Promotion is a no-op when master already includes everything from beta.
  if (betaOnly === 0) {
    return {
      changed: false,
      mode: 'up-to-date',
      message: 'Master already contains beta.',
    };
  }

  // Promotion is intentionally strict: master may only move by fast-forwarding to beta.
  if (masterOnly !== 0) {
    return {
      changed: false,
      mode: 'diverged',
      message: 'Master and beta have diverged. A fast-forward promotion is not possible.',
    };
  }

  return {
    changed: true,
    mode: 'fast-forward',
    message: 'Promoted beta to master with a fast-forward merge.',
  };
}

module.exports = {
  getPromotePlan,
  getSyncBetaPlan,
};
