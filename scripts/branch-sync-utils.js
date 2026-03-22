function assertNonNegativeInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
}

function getSyncBetaPlan(masterOnly, betaOnly) {
  assertNonNegativeInteger(masterOnly, 'masterOnly');
  assertNonNegativeInteger(betaOnly, 'betaOnly');

  if (masterOnly === 0) {
    return {
      changed: false,
      mode: 'up-to-date',
      message: 'Beta already contains all commits from master.',
    };
  }

  if (betaOnly === 0) {
    return {
      changed: true,
      mode: 'fast-forward',
      message: 'Fast-forwarded beta to master.',
    };
  }

  return {
    changed: true,
    mode: 'rebase',
    message: 'Rebased beta onto master and force-pushed the result.',
  };
}

function getPromotePlan(masterOnly, betaOnly) {
  assertNonNegativeInteger(masterOnly, 'masterOnly');
  assertNonNegativeInteger(betaOnly, 'betaOnly');

  if (betaOnly === 0) {
    return {
      changed: false,
      mode: 'up-to-date',
      message: 'Master already contains beta.',
    };
  }

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
