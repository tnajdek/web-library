const fs = require('fs');
const nodeEval = require('node-eval');

function getModuleExports(moduleId) {
	const id = require.resolve(moduleId);
	const moduleOut = nodeEval(fs.readFileSync(id).toString(), id);
	let result = [];
	const excludeExports = /^(default|__)/;
	if (moduleOut && typeof moduleOut === 'object') {
		result = Object.keys(moduleOut)
			.filter(name => !excludeExports.test(name))
	}

	console.log(moduleOut);
	console.log(moduleId, ':', result);

	return result;
}

function getNamedExports(moduleIds) {
	const result = {};
	moduleIds.forEach( id => {
		result[id] = getModuleExports(id)
	});
	return result;
}

module.exports = getNamedExports;
