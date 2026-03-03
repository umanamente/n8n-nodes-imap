const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read JSON: ${filePath} (${error.message})`);
  }
}

function ensureFileExists(relativePath, label) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new Error(`Missing ${label} path`);
  }
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing ${label} file: ${relativePath}`);
  }
  const stat = fs.statSync(fullPath);
  if (!stat.isFile()) {
    throw new Error(`${label} is not a file: ${relativePath}`);
  }
}

function collectStringPaths(value, output) {
  if (typeof value === 'string') {
    output.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectStringPaths(entry, output);
    }
    return;
  }
  if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) {
      collectStringPaths(entry, output);
    }
  }
}

function getEntrypointCandidate(pkg, exportPaths) {
  if (typeof pkg.main === 'string') {
    return pkg.main;
  }
  if (exportPaths.length > 0) {
    return exportPaths[0];
  }
  return null;
}

async function loadEntrypoint(pkg, entrypointPath) {
  if (pkg.type === 'module') {
    if (!entrypointPath) {
      throw new Error('No entrypoint available to import (missing main/exports)');
    }
    const entryUrl = pathToFileURL(path.join(rootDir, entrypointPath)).href;
    await import(entryUrl);
    return;
  }

  // CommonJS default
  require(rootDir);
}

async function main() {
  const pkg = readJson(pkgPath);

  // Validate main
  if (pkg.main) {
    ensureFileExists(pkg.main, 'main');
  } else {
    throw new Error('package.json is missing "main"');
  }

  // Validate n8n metadata
  if (!pkg.n8n || typeof pkg.n8n !== 'object') {
    throw new Error('package.json is missing "n8n" metadata');
  }
  if (!Array.isArray(pkg.n8n.nodes) || pkg.n8n.nodes.length === 0) {
    throw new Error('package.json "n8n.nodes" must be a non-empty array');
  }
  if (!Array.isArray(pkg.n8n.credentials) || pkg.n8n.credentials.length === 0) {
    throw new Error('package.json "n8n.credentials" must be a non-empty array');
  }

  for (const nodePath of pkg.n8n.nodes) {
    ensureFileExists(nodePath, 'n8n node');
  }
  for (const credPath of pkg.n8n.credentials) {
    ensureFileExists(credPath, 'n8n credential');
  }

  // Validate exports if present
  const exportPaths = [];
  if (pkg.exports) {
    collectStringPaths(pkg.exports, exportPaths);
    for (const exportPath of exportPaths) {
      ensureFileExists(exportPath, 'export');
    }
  }

  // Load entrypoint
  const entrypointPath = getEntrypointCandidate(pkg, exportPaths);
  await loadEntrypoint(pkg, entrypointPath);
  console.log('Package verification passed.');
}

main().catch((error) => {
  console.error(`Package verification failed: ${error.message}`);
  process.exit(1);
});
