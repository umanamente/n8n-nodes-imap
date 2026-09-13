const n8nPlugin = require('eslint-plugin-n8n-nodes-base');
const tsParser = require('@typescript-eslint/parser');
const globals = require('globals');

const languageOptions = {
	globals: {
		...globals.browser,
		...globals.node,
		...globals.es2021,
	},
	parser: tsParser,
	parserOptions: {
		project: ['./tsconfig.json'],
		sourceType: 'module',
		extraFileExtensions: ['.json'],
	},
};

const plugins = {
	'n8n-nodes-base': n8nPlugin,
};

const packageLanguageOptions = {
	...languageOptions,
	parserOptions: {
		sourceType: 'module',
		extraFileExtensions: ['.json'],
	},
};

module.exports = [
	{
		ignores: ['**/*.js', '**/node_modules/**', '**/dist/**', '**/test/**', '**/coverage/**'],
	},
	{
		name: 'n8n/package-json',
		files: ['package.json'],
		languageOptions: packageLanguageOptions,
		plugins,
		rules: {
			...n8nPlugin.configs.community.rules,
			'n8n-nodes-base/community-package-json-name-still-default': 'off',
		},
	},
	{
		name: 'n8n/credentials',
		files: ['credentials/**/*.ts'],
		languageOptions,
		plugins,
		rules: {
			...n8nPlugin.configs.credentials.rules,
			'n8n-nodes-base/cred-class-field-documentation-url-missing': 'off',
			'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
		},
	},
	{
		name: 'n8n/nodes',
		files: ['nodes/**/*.ts'],
		languageOptions,
		plugins,
		rules: {
			...n8nPlugin.configs.nodes.rules,
			'n8n-nodes-base/node-execute-block-missing-continue-on-fail': 'off',
			'n8n-nodes-base/node-resource-description-filename-against-convention': 'off',
			'n8n-nodes-base/node-param-fixed-collection-type-unsorted-items': 'off',
			'n8n-nodes-base/node-execute-block-wrong-error-thrown': 'off',
			'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
			'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
			'n8n-nodes-base/node-class-description-credentials-name-unsuffixed': 'off',
		},
	},
];
