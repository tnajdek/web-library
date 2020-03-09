import api from 'zotero-api-client';

import {
    REQUEST_COLLECTIONS_IN_LIBRARY,
    RECEIVE_COLLECTIONS_IN_LIBRARY,
    ERROR_COLLECTIONS_IN_LIBRARY,
    REQUEST_CREATE_COLLECTIONS,
    RECEIVE_CREATE_COLLECTIONS,
    ERROR_CREATE_COLLECTIONS,
    PRE_UPDATE_COLLECTION,
    REQUEST_UPDATE_COLLECTION,
    RECEIVE_UPDATE_COLLECTION,
    ERROR_UPDATE_COLLECTION,
    REQUEST_DELETE_COLLECTION,
    RECEIVE_DELETE_COLLECTION,
    ERROR_DELETE_COLLECTION,
} from '../constants/actions';

import queue from './queue';
import { get } from '../utils';
import { makeApiRequest } from './common';

const CollectionsGet = {
	exec: (apiBase, state, libraryKey, { start = 0, limit = 50, sort = 'dateModified', direction = "desc" } = {}) =>
		apiBase(state.config.apiKey, state.config.apiConfig)
		.library(libraryKey)
		.collections()
		.get({ start, limit, sort, direction }),
	request: (libraryKey, { start = 0, limit = 50, sort = 'dateModified', direction = "desc" } = {}) => ({
		type: REQUEST_COLLECTIONS_IN_LIBRARY, libraryKey, start, limit, sort, direction,
	}),
	response: (response, libraryKey, { start = 0, limit = 50, sort = 'dateModified', direction = "desc" } = {}) => ({
		type: RECEIVE_COLLECTIONS_IN_LIBRARY, libraryKey, collections: response.getData(), response,
		start, limit, sort, direction,
	}),
	error: (error, libraryKey, { start = 0, limit = 50, sort = 'dateModified', direction = "desc" } = {}) => ({
		type: ERROR_COLLECTIONS_IN_LIBRARY, libraryKey, error, start, limit, sort, direction,
	}),
	value: response => ({ collections: response.getData(), response }),
};

const CollectionsCreate = {
	exec: (apiBase, state, localCollections, libraryKey) =>
		apiBase(state.config.apiKey, state.config.apiConfig)
			.library(libraryKey)
			.collections()
			.post(localCollections),
	request: (localCollections, libraryKey) => ({
		type: REQUEST_CREATE_COLLECTIONS,
		libraryKey,
		collections: localCollections
	}),
	response: (response, localCollections, libraryKey) => ({
		type: RECEIVE_CREATE_COLLECTIONS,
		libraryKey,
		collections: response.getData(),
		response
	}),
	error: (error, localCollections, libraryKey) => ({
		type: ERROR_CREATE_COLLECTIONS,
		error,
		libraryKey,
		collections: localCollections,
	}),
	value: response => ({ collections: response.getData(), response })
};

const fetchCollections = makeApiRequest(CollectionsGet);
const createCollections = makeApiRequest(CollectionsCreate);

const fetchAllCollections = (libraryKey, { sort = 'dateModified', direction = "desc", shouldAlwaysFetch = false } = {}) => {
	return async (dispatch, getState) => {
		const state = getState();
		const isKnown = libraryKey in state.collectionCountByLibrary;
		const expectedCount = state.collectionCountByLibrary[libraryKey];
		const collections = get(state, ['libraries', libraryKey, 'collections'], {});
		const actualCount = Object.keys(collections).length;
		const isCountCorrect = expectedCount === actualCount

		if(!shouldAlwaysFetch && isKnown && isCountCorrect) {
			// skip fetching if we already know these libraries
			return;
		}

		var pointer = 0;
		const limit = 100;
		var hasMore = false;

		do {
			const { response } = await dispatch(fetchCollections(libraryKey, { start: pointer, limit, sort, direction }));
			const totalResults = parseInt(response.response.headers.get('Total-Results'), 10);
			hasMore = totalResults > pointer + limit;
			pointer += limit;
		} while(hasMore === true)
	}
}

const createCollection = (properties, libraryKey) => {
	return async dispatch => {
		const collections = await dispatch(
			createCollections([properties], libraryKey)
		);
		return collections[0];
	}
}

const updateCollection = (collectionKey, patch, libraryKey) => {
	return async dispatch => {
		const queueId = ++queue.counter;

		dispatch({
			type: PRE_UPDATE_COLLECTION,
			collectionKey,
			libraryKey,
			patch,
			queueId
		});

		dispatch(
			queueUpdateCollection(collectionKey, patch, libraryKey, queueId)
		);
	};
}

const queueUpdateCollection = (collectionKey, patch, libraryKey, queueId) => {
	return {
		queue: libraryKey,
		callback: async (next, dispatch, getState) => {
			const state = getState();
			const config = state.config;
			const collection = get(state, ['libraries', libraryKey, 'collections', collectionKey]);
			const version = collection.version;

			dispatch({
				type: REQUEST_UPDATE_COLLECTION,
				collectionKey,
				libraryKey,
				patch,
				queueId
			});

			try {
				const response = await api(config.apiKey, config.apiConfig)
					.library(libraryKey)
					.collections(collectionKey)
					.version(version)
					.patch(patch);

				const updatedCollection = {
					...collection,
					...response.getData()
				};

				dispatch({
					type: RECEIVE_UPDATE_COLLECTION,
					collection: updatedCollection,
					collectionKey,
					libraryKey,
					patch,
					queueId,
					response
				});

				return updateCollection;
			} catch(error) {
				dispatch({
					type: ERROR_UPDATE_COLLECTION,
					error,
					collectionKey,
					libraryKey,
					patch,
					queueId
				});
				throw error;
			} finally {
				next();
			}
		}
	};
}

const deleteCollection = (collection, libraryKey) => {
	return async (dispatch, getState) => {
		const config = getState().config;

		dispatch({
			type: REQUEST_DELETE_COLLECTION,
			libraryKey,
			collection
		});

		try {
			let response = await api(config.apiKey, config.apiConfig)
				.library(libraryKey)
				.collections(collection.key)
				.version(collection.version)
				.delete();

			dispatch({
				type: RECEIVE_DELETE_COLLECTION,
				libraryKey,
				collection,
				response
			});
		} catch(error) {
			dispatch({
					type: ERROR_DELETE_COLLECTION,
					error,
					libraryKey,
					collection,
				});
			throw error;
		}
	};
}

export {
	CollectionsGet,
	CollectionsCreate,
	fetchCollections,
	fetchAllCollections,
	createCollection,
	createCollections,
	updateCollection,
	queueUpdateCollection,
	deleteCollection,
};
