const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

if (path.dirname(distDir) !== rootDir || path.basename(distDir) !== 'dist') {
	throw new Error(`Refusing to clean unexpected build directory: ${distDir}`);
}

fs.rmSync(distDir, { recursive: true, force: true });
