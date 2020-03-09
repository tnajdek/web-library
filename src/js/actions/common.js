import apiBase from 'zotero-api-client';
import queue from './queue';

const makeApiRequest = spec => {
	return (...args) => {
		return async (dispatch, getState) => {
			dispatch(spec.request(...args));
			const state = getState();
			try {
				const response = (await spec.exec(apiBase, state, ...args));
				dispatch(spec.response(response, ...args));
				if('value' in spec) {
					return spec.value(response, ...args);
				}
			} catch(error) {
				dispatch(spec.error(error, ...args));
				throw error;
			}
		}
	}
}

const makeApiRequestQueued = spec => {
	const actualRequest = (queueId, ...args) => ({
		queue: queueId,
		callback: async (next, dispatch, getState) => {
			dispatch(spec.request(...args));
			const state = getState();
			try {
				const response = (await spec.exec(apiBase, state, ...args));
				dispatch(spec.response(response, ...args));
				if('value' in spec) {
					return spec.value(response, ...args);
				}
			} catch(error) {
				dispatch(spec.error(error, ...args));
				throw error;
			} finally {
				next();
			}
		}
	});

	return (...args) => {
		return async dispatch => {
			const queueId = ++queue.counter;
			spec.queue(queueId, ...args);
			dispatch(actualRequest(queueId, ...args));
		};
	}
}

export {
	makeApiRequest,
	makeApiRequestQueued
};
