import {
    REQUEST_ITEM_TYPE_CREATOR_TYPES,
    RECEIVE_ITEM_TYPE_CREATOR_TYPES,
    ERROR_ITEM_TYPE_CREATOR_TYPES,
    REQUEST_ITEM_TYPE_FIELDS,
    RECEIVE_ITEM_TYPE_FIELDS,
    ERROR_ITEM_TYPE_FIELDS,
    REQUEST_ITEM_TEMPLATE,
    RECEIVE_ITEM_TEMPLATE,
    ERROR_ITEM_TEMPLATE,
} from '../constants/actions';
import cache from 'zotero-api-client-cache';
import { makeApiRequest } from './common';


const ItemTypeCreatorTypes = {
	exec: (apiBase, state, itemType) =>
		apiBase()
			.use(cache())
			.api(state.config.apiKey, state.config.apiConfig)
			.itemTypeCreatorTypes(itemType)
			.get(),
	request: itemType => ({
		type: REQUEST_ITEM_TYPE_CREATOR_TYPES,
		itemType
	}),
	response: (response, itemType) => ({
		creatorTypes: response.getData(),
		itemType,
		type: RECEIVE_ITEM_TYPE_CREATOR_TYPES,
	}),
	error: (error, itemType) => ({
		type: ERROR_ITEM_TYPE_CREATOR_TYPES,
		error,
		itemType
	}),
	value: (response) => response.getData(),
};

const ItemTypeFields = {
	exec: (apiBase, state, itemType) =>
		apiBase()
			.use(cache())
			.api(state.config.apiKey, state.config.apiConfig)
			.itemTypeFields(itemType)
			.get(),
	request: itemType => ({
		type: REQUEST_ITEM_TYPE_FIELDS,
		itemType
	}),
	response: (response, itemType) => ({
		type: RECEIVE_ITEM_TYPE_FIELDS,
		itemType,
		fields: response.getData()
	}),
	error: (error, itemType) => ({
		type: ERROR_ITEM_TYPE_FIELDS,
		itemType,
		error
	}),
	value: (response) => response.getData(),
};

const ItemTemplate = {
	exec: (apiBase, state, itemType, opts = {}) =>
		apiBase()
			.use(cache())
			.api(state.config.apiKey, state.config.apiConfig)
			.template(itemType)
			.get(opts),
	request: (itemType, opts = {}) => ({
		type: REQUEST_ITEM_TEMPLATE,
		itemType,
		opts
	}),
	response: (response, itemType) => ({
		type: RECEIVE_ITEM_TEMPLATE,
		itemType,
		template: response.getData()
	}),
	error: (error, itemType) => ({
		type: ERROR_ITEM_TEMPLATE,
		itemType,
		error
	}),
	value: (response) => response.getData(),
}

const fetchItemTypeCreatorTypes = makeApiRequest(ItemTypeCreatorTypes);
const fetchItemTypeFields = makeApiRequest(ItemTypeFields);
const fetchItemTemplate = makeApiRequest(ItemTemplate);

export {
	fetchItemTemplate,
	fetchItemTypeCreatorTypes,
	fetchItemTypeFields,
	ItemTemplate,
	ItemTypeCreatorTypes,
	ItemTypeFields,
};
