import { execFileSync } from 'child_process';
import { resolve } from 'path';

const repositoryRoot = resolve(__dirname, '../..');

// Run the real ESM plugins outside ts-jest's CommonJS transform. Only analysis and
// in-memory Markdown generation are invoked: no release, git, or publish hooks.
const generateReleaseNotes = `
import { readFileSync } from 'node:fs';
import { analyzeCommits } from '@semantic-release/commit-analyzer';
import { generateNotes } from '@semantic-release/release-notes-generator';

const { message, version } = JSON.parse(readFileSync(0, 'utf8'));
const config = JSON.parse(readFileSync('.releaserc.json', 'utf8'));
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
function pluginOptions(name) {
  const plugin = config.plugins.find((entry) => Array.isArray(entry) && entry[0] === name);
  if (!plugin) throw new Error('Missing configured release plugin: ' + name);
  return plugin[1];
}
const context = {
  cwd: process.cwd(),
  commits: [{ hash: 'a'.repeat(40), message }],
  logger: { log() {} },
  options: { repositoryUrl: packageJson.repository.url },
  lastRelease: { gitTag: 'v2.17.1', gitHead: 'b'.repeat(40) },
  nextRelease: { version, gitTag: 'v' + version, gitHead: 'a'.repeat(40) },
};
const type = await analyzeCommits(pluginOptions('@semantic-release/commit-analyzer'), context);
const notes = await generateNotes(pluginOptions('@semantic-release/release-notes-generator'), context);
process.stdout.write(JSON.stringify({ type, notes }));
`;

describe('configured release tooling compatibility', () => {
	it.each([
		{
			label: 'a fix as a patch release',
			message: 'fix(email): finish attachment streams',
			version: '2.17.2',
			type: 'patch',
			section: 'Bug Fixes',
			subject: 'finish attachment streams',
			breaking: undefined,
		},
		{
			label: 'a feature as a minor release',
			message: 'feat(mailbox): add mailbox filtering',
			version: '2.18.0',
			type: 'minor',
			section: 'Features',
			subject: 'add mailbox filtering',
			breaking: undefined,
		},
		{
			label: 'a breaking footer as a major release',
			message:
				'fix(imap): update runtime requirements\n\nBREAKING CHANGE: Node.js 20 or newer is required.',
			version: '3.0.0',
			type: 'major',
			section: 'Bug Fixes',
			subject: 'update runtime requirements',
			breaking: 'Node.js 20 or newer is required.',
		},
		{
			label: 'a breaking header as a major release',
			message: 'fix(imap)!: remove legacy response fields',
			version: '3.0.0',
			type: 'major',
			section: 'Bug Fixes',
			subject: 'remove legacy response fields',
			breaking: 'remove legacy response fields',
		},
	])('renders $label', ({ message, version, type, section, subject, breaking }) => {
		const output = execFileSync(
			process.execPath,
			['--input-type=module', '--eval', generateReleaseNotes],
			{
				cwd: repositoryRoot,
				input: JSON.stringify({ message, version }),
				encoding: 'utf8',
				timeout: 15000,
			},
		);
		const result = JSON.parse(output) as { type: string; notes: string };

		expect(result.type).toBe(type);
		expect(result.notes).toContain(`[${version}]`);
		expect(result.notes).toContain(`### ${section}`);
		expect(result.notes).toContain(subject);
		expect(result.notes).toContain('/commit/' + 'a'.repeat(40));
		if (breaking) {
			expect(result.notes).toMatch(/^### .*BREAKING CHANGES$/m);
			expect(result.notes).toContain(breaking);
		} else {
			expect(result.notes).not.toMatch(/^### .*BREAKING CHANGES$/m);
		}
	});
});
