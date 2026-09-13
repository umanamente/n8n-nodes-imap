import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Script } from 'vm';

const { load } = require('js-yaml');

// Execute the checked-in github-script code with isolated, read-only stubs. A PR cannot
// exercise a new workflow_run handler live until that handler reaches the default branch.
const workflowPath = resolve(__dirname, '../../.github/workflows/coverage-comment.yml');
const workflow = load(readFileSync(workflowPath, 'utf8'));
const steps = workflow.jobs['coverage-comment'].steps;
const testWorkflowPath = resolve(__dirname, '../../.github/workflows/test.yml');
const testWorkflow = load(readFileSync(testWorkflowPath, 'utf8'));
const repo = { owner: 'umanamente', repo: 'n8n-nodes-imap' };
const headSha = 'a'.repeat(40);

function runStep(name: string, bindings: Record<string, unknown>) {
	const step = steps.find((candidate: { name: string }) => candidate.name === name);
	if (!step?.with?.script) throw new Error(`Missing github-script step: ${name}`);
	return new Script(`(async () => {\n${step.with.script}\n})()`, {
		filename: `${workflowPath}:${name}`,
	}).runInNewContext(bindings, { timeout: 1000 });
}

function createHarness() {
	const core = { setOutput: jest.fn(), notice: jest.fn(), setFailed: jest.fn() };
	const run = {
		event: 'pull_request',
		head_branch: 'maintenance',
		head_repository: { full_name: 'contributor/n8n-nodes-imap' },
		head_sha: headSha,
		pull_requests: [{ number: 123 }],
	};
	const pullRequest = {
		head: {
			repo: { full_name: run.head_repository.full_name } as { full_name: string } | null,
			sha: headSha,
		},
	};
	const github = {
		rest: {
			pulls: { get: jest.fn().mockResolvedValue({ data: pullRequest }) },
			issues: { listComments: jest.fn(), createComment: jest.fn(), updateComment: jest.fn() },
		},
		paginate: jest.fn().mockResolvedValue([]),
	};
	const context = { repo, payload: { workflow_run: run } };
	return { core, run, pullRequest, github, context };
}

describe('coverage workflow handoff', () => {
	it('publishes the PR number artifact required by the current default-branch handler', () => {
		const testSteps = testWorkflow.jobs.test.steps;
		const saveStep = testSteps.find(
			(candidate: { name: string }) => candidate.name === 'Save PR number for coverage handoff',
		);
		const uploadStep = testSteps.find(
			(candidate: { name: string }) => candidate.name === 'Upload PR number for coverage handoff',
		);

		expect(saveStep.if).toBe("github.event_name == 'pull_request'");
		expect(saveStep.run).toContain('${{ github.event.pull_request.number }}');
		expect(uploadStep.if).toBe("github.event_name == 'pull_request'");
		expect(uploadStep.uses).toMatch(/^actions\/upload-artifact@[0-9a-f]{40}$/);
		expect(uploadStep.with).toMatchObject({
			name: 'pr-number',
			path: 'pr_number.txt',
			'if-no-files-found': 'error',
		});
	});
});

describe('coverage workflow trust boundaries', () => {
	it('accepts a master push only from the target repository', async () => {
		const harness = createHarness();
		Object.assign(harness.run, {
			event: 'push',
			head_branch: 'master',
			head_repository: { full_name: 'umanamente/n8n-nodes-imap' },
		});

		await runStep('Validate workflow run context', harness);

		expect(harness.core.setOutput.mock.calls).toEqual([['kind', 'master']]);
		expect(harness.github.rest.pulls.get).not.toHaveBeenCalled();
	});

	it.each([
		['a fork master push', { event: 'push', head_branch: 'master' }],
		['a non-master push', { event: 'push' }],
		['a manual run', { event: 'workflow_dispatch' }],
		['no associated PR', { pull_requests: [] }],
		['ambiguous PRs', { pull_requests: [{ number: 123 }, { number: 456 }] }],
	])('ignores %s', async (_label, patch) => {
		const harness = createHarness();
		Object.assign(harness.run, patch);

		await runStep('Validate workflow run context', harness);

		expect(harness.core.setOutput).not.toHaveBeenCalled();
		expect(harness.github.rest.pulls.get).not.toHaveBeenCalled();
		expect(harness.core.notice).toHaveBeenCalled();
	});

	it('accepts a fork PR after checking its current head repository and commit through the API', async () => {
		const harness = createHarness();

		await runStep('Validate workflow run context', harness);

		expect(harness.github.rest.pulls.get).toHaveBeenCalledWith({ ...repo, pull_number: 123 });
		expect(harness.core.setOutput.mock.calls).toEqual([
			['kind', 'pull-request'],
			['pull_request_number', '123'],
		]);
	});

	it.each(['stale commit', 'different repository', 'deleted repository'])(
		'ignores a PR with a %s',
		async (mismatch) => {
			const harness = createHarness();
			if (mismatch === 'stale commit') harness.pullRequest.head.sha = 'b'.repeat(40);
			if (mismatch === 'different repository') {
				harness.pullRequest.head.repo = { full_name: 'other/n8n-nodes-imap' };
			}
			if (mismatch === 'deleted repository') harness.pullRequest.head.repo = null;

			await runStep('Validate workflow run context', harness);

			expect(harness.core.setOutput).not.toHaveBeenCalled();
			expect(harness.core.notice).toHaveBeenCalled();
		},
	);
});

describe('coverage artifact validation', () => {
	function createSummary() {
		return {
			total: {
				lines: { total: 1000, covered: 994, pct: 99.35 as unknown },
				statements: { total: 900, covered: 884, pct: 98.123 },
				functions: { total: 88, covered: 88, pct: 100 },
				branches: { total: 12, covered: 0, pct: 0 },
			},
		};
	}

	function artifactHarness(content: string) {
		const { core } = createHarness();
		const fs = { readFileSync: jest.fn().mockReturnValue(content) };
		const requireStub = jest.fn().mockImplementation((name: string) => {
			if (name !== 'fs') throw new Error(`Unexpected module access: ${name}`);
			return fs;
		});
		return { core, fs, require: requireStub };
	}

	it('reads only the coverage summary and formats finite numeric percentages', async () => {
		const harness = artifactHarness(JSON.stringify(createSummary()));

		await runStep('Read coverage summary as data', harness);

		expect(harness.require.mock.calls).toEqual([['fs']]);
		expect(harness.fs.readFileSync.mock.calls).toEqual([
			['coverage-artifact/coverage-summary.json', 'utf8'],
		]);
		expect(harness.core.setOutput.mock.calls).toEqual([
			['lines', '99.35'],
			['lines_detail', '99.35% (994/1000)'],
			['statements', '98.12'],
			['statements_detail', '98.12% (884/900)'],
			['functions', '100.00'],
			['functions_detail', '100.00% (88/88)'],
			['branches', '0.00'],
			['branches_detail', '0.00% (0/12)'],
			['color', 'brightgreen'],
		]);
		expect(harness.core.setFailed).not.toHaveBeenCalled();
	});

	it.each([-1, 101, 'Infinity', 'not a number', null, false, '', undefined])(
		'rejects malformed percentage %p',
		async (value) => {
			const summary = createSummary();
			summary.total.lines.pct = value;
			const harness = artifactHarness(JSON.stringify(summary));

			await runStep('Read coverage summary as data', harness);

			expect(harness.core.setFailed).toHaveBeenCalledWith('Invalid lines coverage value');
			expect(harness.core.setOutput).not.toHaveBeenCalled();
		},
	);

	it.each([
		['non-integer total', { total: 1.5 }],
		['negative total', { total: -1 }],
		['non-integer covered count', { covered: 1.5 }],
		['negative covered count', { covered: -1 }],
		['covered count above total', { total: 10, covered: 11 }],
	])('rejects a %s', async (_label, patch) => {
		const summary = createSummary();
		Object.assign(summary.total.lines, patch);
		const harness = artifactHarness(JSON.stringify(summary));

		await runStep('Read coverage summary as data', harness);

		expect(harness.core.setFailed).toHaveBeenCalledWith('Invalid lines coverage value');
		expect(harness.core.setOutput).not.toHaveBeenCalled();
	});

	it('fails on malformed JSON without evaluating artifact content as code', async () => {
		const harness = artifactHarness('process.env.SECRET;');

		await expect(runStep('Read coverage summary as data', harness)).rejects.toThrow();
		expect(harness.core.setOutput).not.toHaveBeenCalled();
	});
});

describe('coverage comment publication', () => {
	const marker = '<!-- n8n-nodes-imap-coverage -->';
	const processStub = {
		env: {
			PULL_REQUEST_NUMBER: '123',
			LINES_DETAIL: '99.35% (994/1000)',
			STATEMENTS_DETAIL: '99.23% (991/999)',
			FUNCTIONS_DETAIL: '98.86% (87/88)',
			BRANCHES_DETAIL: '98.25% (281/286)',
			HEAD_SHA: headSha,
		},
	};
	const coverageText =
		'File | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s\nImap.node.ts | 99 | 96.55 | 100 | 98.97 | 303';

	function commentBindings(harness: ReturnType<typeof createHarness>, report = coverageText) {
		return {
			...harness,
			process: processStub,
			require: jest.fn().mockImplementation((name: string) => {
				if (name !== 'fs') throw new Error(`Unexpected module access: ${name}`);
				return { readFileSync: jest.fn().mockReturnValue(report) };
			}),
		};
	}

	it('creates a comment on the validated PR with real Markdown newlines and tested commit', async () => {
		const harness = createHarness();
		harness.github.paginate.mockResolvedValue([
			{
				id: 9,
				user: { login: 'umanamente' },
				body: `${marker}\nA copied marker in a user comment`,
			},
		]);

		await runStep(
			'Create or update pull request coverage comment',
			commentBindings(harness, `${coverageText}\nunsafe<script>alert(1)</script>`),
		);

		expect(harness.github.paginate).toHaveBeenCalledWith(harness.github.rest.issues.listComments, {
			...repo,
			issue_number: 123,
			per_page: 100,
		});
		expect(harness.github.rest.issues.createComment).toHaveBeenCalledWith({
			...repo,
			issue_number: 123,
			body: `${marker}\n## Test coverage\n\n| Lines | Statements | Branches | Functions |\n| ---: | ---: | ---: | ---: |\n| 99.35% (994/1000) | 99.23% (991/999) | 98.25% (281/286) | 98.86% (87/88) |\n\n<details><summary>Coverage by file</summary>\n\n<pre>${coverageText}\nunsafe&lt;script&gt;alert(1)&lt;/script&gt;</pre>\n</details>\n\nTested commit: \`${headSha}\``,
		});
		expect(harness.github.rest.issues.updateComment).not.toHaveBeenCalled();
	});

	it('updates the existing bot coverage comment instead of posting duplicates', async () => {
		const harness = createHarness();
		harness.github.paginate.mockResolvedValue([
			{ id: 7, user: { login: 'dependabot[bot]' }, body: `${marker}\nCopied marker` },
			{ id: 8, user: { login: 'github-actions[bot]' }, body: `${marker}\nPrevious coverage` },
		]);

		await runStep('Create or update pull request coverage comment', commentBindings(harness));

		expect(harness.github.rest.issues.updateComment).toHaveBeenCalledWith({
			...repo,
			comment_id: 8,
			body: expect.stringContaining(`Tested commit: \`${headSha}\``),
		});
		expect(harness.github.rest.issues.createComment).not.toHaveBeenCalled();
	});

	it.each(['', 'x'.repeat(50001), 'valid\u0000invalid'])(
		'rejects an unsafe or unusable detailed report',
		async (report) => {
			const harness = createHarness();

			await expect(
				runStep('Create or update pull request coverage comment', commentBindings(harness, report)),
			).rejects.toThrow('Invalid coverage text report');
			expect(harness.github.rest.issues.createComment).not.toHaveBeenCalled();
			expect(harness.github.rest.issues.updateComment).not.toHaveBeenCalled();
		},
	);
});
