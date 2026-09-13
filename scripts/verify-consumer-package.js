const fs = require('fs');
const path = require('path');

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

const packageDir = path.resolve(process.argv[2] || 'node_modules/n8n-nodes-imap');
const packageJsonPath = path.join(packageDir, 'package.json');
assert(fs.existsSync(packageJsonPath), `Package metadata was not found at ${packageJsonPath}`);

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
if (process.argv.includes('--expect-current-contract')) {
	assert(pkg.engines?.node === '>=20.0.0', 'Unexpected Node.js runtime contract');
	assert(
		pkg.peerDependencies?.['n8n-workflow'] === '>=1.95.0 <3',
		'Unexpected n8n-workflow peer range',
	);
}

for (const dependency of ['imapflow', 'mailparser', 'nodemailer', 'n8n-workflow']) {
	require.resolve(dependency, { paths: [packageDir] });
}

const nodeModule = require(path.join(packageDir, pkg.n8n.nodes[0]));
const credentialModule = require(path.join(packageDir, pkg.n8n.credentials[0]));
assert(typeof nodeModule.Imap === 'function', 'The IMAP node class did not load');
assert(
	typeof credentialModule.ImapCredentials === 'function',
	'The IMAP credential class did not load',
);

const node = new nodeModule.Imap();
const credentials = new credentialModule.ImapCredentials();
assert(node.description?.name === 'imap', 'Unexpected node metadata');
assert(credentials.name === 'imapApi', 'Unexpected credential metadata');

console.log(`Consumer package verification passed for ${pkg.name}@${pkg.version}.`);
