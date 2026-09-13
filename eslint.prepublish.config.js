const config = require('./eslint.config.js');

module.exports = config.map((entry) => {
	if (entry.name !== 'n8n/package-json') {
		return entry;
	}

	return {
		...entry,
		rules: {
			...entry.rules,
			'n8n-nodes-base/community-package-json-name-still-default': 'error',
		},
	};
});
