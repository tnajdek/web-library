// Marker written in place of a sparse array hole. JSON has no way to express a hole -- it writes
// `null` -- but item/tag/group key arrays are genuinely sparse while the rest of a page is still
// unfetched, and code under test distinguishes an unfetched slot from a fetched one by checking for
// `undefined`.
const STATE_HOLE = '@@hole@@';

// NOTE: this function and stateToJSON are stringified and eval'd inside the browser by
// scripts/generate-fixtures.mjs, so they cannot reference module scope. That is why the hole marker
// is threaded through as an argument rather than read from STATE_HOLE directly.
function stateProcessSymbols(state, hole) {
	if (Array.isArray(state)) {
		// Array.prototype.map would preserve holes, which JSON.stringify then flattens to `null`,
		// so assign every index and mark the holes explicitly.
		const newState = new Array(state.length);
		for (let i = 0; i < state.length; i++) {
			newState[i] = (i in state) ? stateProcessSymbols(state[i], hole) : hole;
		}
		return newState;
	} else if (typeof state === 'object' && state !== null) {
		const newState = { ...state };
		Object.getOwnPropertySymbols(state).forEach(s => {
			newState['@@' + Symbol.keyFor(s) + '@@'] = state[s];
			delete newState[s];
		});

		Object.keys(newState)
			.forEach(k => newState[k] = stateProcessSymbols(newState[k], hole));
		return newState;
	} else {
		return state;
	}
}

function stateProcessSymbolsReverse(state) {
	if (Array.isArray(state)) {
		// Restore holes so that the array is as sparse as it was when the fixture was captured
		const newState = new Array(state.length);
		for (let i = 0; i < state.length; i++) {
			if (state[i] === STATE_HOLE) {
				continue;
			}
			newState[i] = stateProcessSymbolsReverse(state[i]);
		}
		return newState;
	} else if (typeof state === 'object' && state !== null) {
		const newState = { ...state };

		Object.keys(newState)
			.forEach(k => newState[k] = stateProcessSymbolsReverse(newState[k]));

		Object.keys(newState)
			.filter(k => k.startsWith('@@') && k.endsWith('@@'))
			.forEach(k => {
				const s = Symbol.for(k.slice(2, -2));
				newState[s] = state[k];
				delete newState[k];
			});

		return newState;
	} else {
		return state;
	}
}

function stateToJSON(state, hole) {
	return JSON.stringify(stateProcessSymbols(state, hole));
}

function JSONtoState(json) {
	if (typeof json === 'string') {
		json = JSON.parse(json);
	}
	return stateProcessSymbolsReverse(json);
}

const getKeyOrSymbolKey = key => {
	const symbolMatch = key.match(/@@(.*)@@/);
	if (symbolMatch) {
		return Symbol.for(symbolMatch[1]);
	}
	return key;
}

function getPatchedState(state, path, patch) {
	const pathParts = path.split('.')
	if (pathParts.length === 1) {
		const key = getKeyOrSymbolKey(path);
		return { ...state, [key]: { ...state[key], ...patch } };
	} else {
		const key = getKeyOrSymbolKey(pathParts[0]);
		return { ...state, [key]: getPatchedState(state[key], pathParts.slice(1).join('.'), patch) };
	}
}

function getStateWithout(state, path) {
	const pathParts = path.split('.')
	if (pathParts.length === 1) {
		const newState = { ...state };
		delete newState[path];
		return newState;
	} else {
		return { ...state, [pathParts[0]]: getStateWithout(state[pathParts[0]], pathParts.slice(1).join('.')) };
	}
}

function getPachtedStateMultiple(state, patches) {
	return patches.reduce((state, [path, patch]) => getPatchedState(state, path, patch), state);
}

function getPatchedStateArray(state, path, index, patch) {
	const pathParts = path.split('.')
	let obj = state;
	for (const part of pathParts) {
		obj = obj[part];
	}
	const originalArray = obj;
	const patchedEntry = { ...originalArray[index], ...patch };
	const newArray = originalArray.toSpliced(index, 1, patchedEntry);
	return getPatchedState(state, pathParts.slice(0, -1).join('.'), { [pathParts[pathParts.length - 1]]: newArray });
}


export { STATE_HOLE, stateProcessSymbols, stateToJSON, JSONtoState, getPatchedState, getPachtedStateMultiple, getPatchedStateArray, getStateWithout };
