const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read JSON: ${filePath} (${error.message})`);
  }
}

function capture(cmd, options = {}) {
  return execSync(cmd, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function run(cmd, options = {}) {
  execSync(cmd, { stdio: 'inherit', ...options });
}

function resolveBranch() {
  if (process.env.PUBLISH_BRANCH) {
    return process.env.PUBLISH_BRANCH;
  }
  if (process.env.GITHUB_REF_NAME) {
    return process.env.GITHUB_REF_NAME;
  }
  if (process.env.GITHUB_REF && process.env.GITHUB_REF.startsWith('refs/heads/')) {
    return process.env.GITHUB_REF.slice('refs/heads/'.length);
  }
  return null;
}

function appendSuffix(name, suffix) {
  if (!suffix) {
    return name;
  }
  const cleanSuffix = suffix.startsWith('-') ? suffix.slice(1) : suffix;
  return `${name}-${cleanSuffix}`;
}

function computeBetaName(stableName, suffix, overrideName) {
  if (overrideName) {
    return overrideName;
  }
  if (stableName.startsWith('@')) {
    const parts = stableName.split('/');
    if (parts.length !== 2 || !parts[1]) {
      throw new Error(`Invalid scoped package name: ${stableName}`);
    }
    return `${parts[0]}/${appendSuffix(parts[1], suffix)}`;
  }
  return appendSuffix(stableName, suffix);
}

function main() {
  const pkg = readJson(pkgPath);
  const stableName = pkg.name;
  const version = pkg.version;
  const branch = resolveBranch();
  const betaSuffix = process.env.NPM_BETA_SUFFIX || 'beta';
  const overrideName = process.env.NPM_PUBLISH_NAME;

  if (!branch) {
    throw new Error('Unable to determine branch name. Set PUBLISH_BRANCH.');
  }
  if (!stableName) {
    throw new Error('package.json is missing "name"');
  }
  if (!version) {
    throw new Error('package.json is missing "version"');
  }

  let publishName = stableName;
  if (branch === 'beta') {
    publishName = computeBetaName(stableName, betaSuffix, overrideName);
  } else if (branch === 'master' || branch === 'main') {
    publishName = stableName;
  } else {
    throw new Error(`Unsupported branch for publishing: ${branch}`);
  }

  if (branch === 'beta' && publishName === stableName) {
    throw new Error('Beta publish name matches stable name. Aborting.');
  }
  if ((branch === 'master' || branch === 'main') && publishName !== stableName) {
    throw new Error('Stable publish name differs from package.json name. Aborting.');
  }
  if (branch === 'master' || branch === 'main') {
    const betaSuffixCheck = betaSuffix || 'beta';
    const betaNameMatch = overrideName && stableName === overrideName;
    if (stableName.endsWith(`-${betaSuffixCheck}`) || betaNameMatch) {
      throw new Error('Stable branch cannot publish a beta package name. Aborting.');
    }
  }

  const registry = capture('npm config get registry', { cwd: rootDir });

  console.log('Publish summary:');
  console.log(`- Branch: ${branch}`);
  console.log(`- Stable name: ${stableName}`);
  console.log(`- Publish name: ${publishName}`);
  console.log(`- Version: ${version}`);
  console.log(`- Registry: ${registry}`);

  if (branch === 'beta' && publishName !== stableName) {
    run(`npm pkg set name=${JSON.stringify(publishName)}`, { cwd: rootDir });
  }

  run('npm run build', { cwd: rootDir });

  const packJsonRaw = capture('npm pack --json', { cwd: rootDir });
  let packInfo;
  try {
    packInfo = JSON.parse(packJsonRaw);
  } catch (error) {
    throw new Error(`Failed to parse npm pack output: ${error.message}`);
  }
  if (!Array.isArray(packInfo) || packInfo.length === 0) {
    throw new Error('npm pack returned no artifacts');
  }
  const tarballName = packInfo[0].filename;
  if (!tarballName) {
    throw new Error('npm pack output missing tarball filename');
  }

  const tarballPath = path.resolve(rootDir, tarballName);
  const packedPkgRaw = capture(
    `tar -xOf ${JSON.stringify(tarballPath)} package/package.json`,
    { cwd: rootDir }
  );
  const packedPkg = JSON.parse(packedPkgRaw);

  console.log(`Packed package.json name: ${packedPkg.name}`);
  console.log(`Packed package.json version: ${packedPkg.version}`);

  if (packedPkg.name !== publishName) {
    throw new Error(
      `Packed package name mismatch (expected ${publishName}, got ${packedPkg.name})`
    );
  }
  if (packedPkg.version !== version) {
    throw new Error(
      `Packed package version mismatch (expected ${version}, got ${packedPkg.version})`
    );
  }

  const publishTag = process.env.NPM_PUBLISH_TAG;
  const publishCmd = publishTag
    ? `npm publish --provenance --tag ${publishTag}`
    : 'npm publish --provenance';

  run(publishCmd, { cwd: rootDir });
}

main();
