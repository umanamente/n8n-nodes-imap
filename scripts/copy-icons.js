const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function copyIcons(sourceDir, destinationDir) {
	for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
		const sourcePath = path.join(sourceDir, entry.name);
		const relativePath = path.relative(sourceDir, sourcePath);
		const destinationPath = path.join(destinationDir, relativePath);

		if (entry.isDirectory()) {
			copyIcons(sourcePath, destinationPath);
			continue;
		}

		if (!entry.isFile() || !['.png', '.svg'].includes(path.extname(entry.name))) {
			continue;
		}

		fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
		fs.copyFileSync(sourcePath, destinationPath);
	}
}

copyIcons(path.join(rootDir, 'nodes'), path.join(rootDir, 'dist', 'nodes'));
copyIcons(path.join(rootDir, 'credentials'), path.join(rootDir, 'dist', 'credentials'));
