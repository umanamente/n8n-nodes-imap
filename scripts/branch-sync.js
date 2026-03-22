const fs = require('fs');
const { execFileSync } = require('child_process');
const { getPromotePlan, getSyncBetaPlan } = require('./branch-sync-utils');

// Wrapper around git commands used by the release workflows.
// Keeping this logic in a script makes the YAML shorter and easier to review.
function runGit(args, options = {}) {
  const output = execFileSync('git', args, {
    encoding: 'utf8',
    ...options,
  });

  return typeof output === 'string' ? output.trim() : '';
}

// GitHub Actions exposes a file path for step outputs through GITHUB_OUTPUT.
function writeOutputs(outputs) {
  const outputPath = process.env.GITHUB_OUTPUT;

  if (!outputPath) {
    return;
  }

  const content = Object.entries(outputs)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.appendFileSync(outputPath, `${content}\n`, 'utf8');
}

function getAheadBehind(leftRef, rightRef) {
  const output = runGit(['rev-list', '--left-right', '--count', `${leftRef}...${rightRef}`]);
  const [leftCount, rightCount] = output.split(/\s+/).map((value) => Number(value));

  if (!Number.isInteger(leftCount) || !Number.isInteger(rightCount)) {
    throw new Error(`Unexpected ahead/behind output: ${output}`);
  }

  return {
    leftCount,
    rightCount,
  };
}

function checkoutTrackingBranch(branch, remoteRef) {
  runGit(['checkout', '-B', branch, remoteRef], { stdio: 'inherit' });
}

function mergeFastForward(ref) {
  runGit(['merge', '--ff-only', ref], { stdio: 'inherit' });
}

function push(refSpec, forceWithLease = false) {
  const args = ['push'];

  if (forceWithLease) {
    args.push('--force-with-lease');
  }

  args.push('origin', refSpec);
  runGit(args, { stdio: 'inherit' });
}

function rebase(ref) {
  runGit(['rebase', ref], { stdio: 'inherit' });
}

function abortRebaseQuietly() {
  try {
    runGit(['rebase', '--abort'], { stdio: 'ignore' });
  } catch (error) {
    // Ignore cleanup failures when no rebase is in progress.
  }
}

// Sync beta from master:
// - no-op if beta already contains master
// - fast-forward if beta has no unique commits
// - otherwise rebase beta onto master and force-push
function syncBetaFromMaster() {
  checkoutTrackingBranch('beta', 'origin/beta');

  const { leftCount: masterOnly, rightCount: betaOnly } = getAheadBehind('origin/master', 'origin/beta');
  const plan = getSyncBetaPlan(masterOnly, betaOnly);

  writeOutputs({
    master_only: masterOnly,
    beta_only: betaOnly,
    mode: plan.mode,
    changed: plan.changed,
  });

  if (!plan.changed) {
    console.log(plan.message);
    return;
  }

  if (plan.mode === 'fast-forward') {
    mergeFastForward('origin/master');
    push('HEAD:beta');
    console.log(plan.message);
    return;
  }

  try {
    rebase('origin/master');
  } catch (error) {
    abortRebaseQuietly();
    throw error;
  }

  push('HEAD:beta', true);
  console.log(plan.message);
}

// Promote a tested beta to master.
// This path only allows a fast-forward to keep master history predictable.
function promoteBetaToMaster() {
  checkoutTrackingBranch('master', 'origin/master');

  const { leftCount: masterOnly, rightCount: betaOnly } = getAheadBehind('origin/master', 'origin/beta');
  const plan = getPromotePlan(masterOnly, betaOnly);

  writeOutputs({
    master_only: masterOnly,
    beta_only: betaOnly,
    mode: plan.mode,
    changed: plan.changed,
  });

  if (!plan.changed) {
    if (plan.mode === 'diverged') {
      throw new Error(plan.message);
    }

    console.log(plan.message);
    return;
  }

  mergeFastForward('origin/beta');
  push('HEAD:master');
  console.log(plan.message);
}

function main() {
  const mode = process.argv[2];

  if (mode === 'sync-beta') {
    syncBetaFromMaster();
    return;
  }

  if (mode === 'promote-master') {
    promoteBetaToMaster();
    return;
  }

  throw new Error(`Unsupported mode "${mode}". Expected "sync-beta" or "promote-master".`);
}

if (require.main === module) {
  main();
}

module.exports = {
  runGit,
  main,
};
