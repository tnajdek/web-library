import { omit } from 'web-common/utils';

import { preferenceChange } from '.';

const updateItemsSorting = (sortBy, sortDirection) => {
	return (dispatch, getState) => {
		const { columns } = getState().preferences;
		dispatch(preferenceChange('columns', columns.map(column => {
			if(column.field === sortBy) {
				return { ...column, sort: sortDirection }
			} else {
				return omit(column, 'sort');
			}
		})));
	}
};

const toggleItemsSortingDirection = () => {
	return (dispatch, getState) => {
		const { columns } = getState().preferences;
		const sortColumn = columns.find(c => c.sort);
		return dispatch(updateItemsSorting(sortColumn.field, sortColumn.sort === 'desc' ? 'asc' : 'desc'));
	}
}

export {
	toggleItemsSortingDirection,
	updateItemsSorting,
}
