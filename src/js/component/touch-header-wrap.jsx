import PropTypes from 'prop-types';
import { memo, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import TouchHeader from '../component/touch-header';
import { getCollectionsPath } from '../common/state';
import { itemsSourceLabel } from '../common/format';
import { makeChildMap } from '../common/collection';
import { triggerSelectMode, navigate } from '../actions';
import { get } from '../utils';
import { useEditMode } from '../hooks';

const ROOT_NODE = {
	key: 'root',
	type: 'root',
	path: { view: 'libraries' },
	label: 'Libraries'
};

const TouchHeaderWrap = memo(({ className, variant }) => {
	const dispatch = useDispatch();
	const libraryKey = useSelector(state => state.current.libraryKey);
	const collectionKeys = useSelector(state => state.libraries[libraryKey]?.collections.keys);
	const dataObjects = useSelector(state => state.libraries[libraryKey]?.dataObjects);
	const collections = Object.fromEntries((collectionKeys ?? []).map(key => [key, dataObjects[key]]));
	const item = useSelector(state => get(
		state, ['libraries', libraryKey, 'items', state.current.itemKey]
	));
	const attachmentKey = useSelector(state => state.current.attachmentKey);
	const collectionKey = useSelector(state => state.current.collectionKey);
	const isMyPublications = useSelector(state => state.current.isMyPublications);
	const isTrash = useSelector(state => state.current.isTrash);
	const itemsSource = useSelector(state => state.current.itemsSource);

	const noteKey = useSelector(state => state.current.noteKey);
	const qmode = useSelector(state => state.current.qmode);
	const search = useSelector(state => state.current.search);
	const view = useSelector(state => state.current.view);
	const tags = useSelector(state => state.current.tags);
	const isSelectMode = useSelector(state => state.current.isSelectMode);
	const libraryConfig = useSelector(state => state.config.libraries.find(l => l.key === libraryKey) || {});
	const itemKeys = useSelector(state => state.current.itemKeys);
	// collections are prefetched so if item is null, it's not a collection
	const isCollection = item?.[Symbol.for('type')] === 'collection';
	const { isReadOnly } = libraryConfig;
	const childMap = useMemo(() => makeChildMap(Object.values(collections || {})), [collections]);
	const [isEditing, ] = useEditMode();

	const collectionsPath = useMemo(() => getCollectionsPath(libraryKey, collectionKey, collections).map(
		key => {
			const { name } = collections[key];
			return {
				key,
				type: 'collection',
				label: name,
				path: { library: libraryKey, collection: key },
			};
		}
	), [collectionKey, collections, libraryKey]);
	const path = [...collectionsPath];

	if(libraryKey && view !== 'libraries') {
		path.unshift({
			key: libraryKey,
			type: 'library',
			path: { library: libraryKey, view: 'library' },
			label: libraryConfig.name
		})
	}

	const itemsSourceNode = useMemo(() => ({
		key: itemsSource,
		type: 'itemsSource',
		path: {
			collection: collectionKey,
			library: libraryKey,
			publications: isMyPublications,
			qmode,
			search,
			tags,
			trash: isTrash,
			view: 'item-list',
		},
		label: itemsSourceLabel(itemsSource)
	}), [collectionKey, isMyPublications, isTrash, itemsSource, libraryKey, qmode, search, tags]);

	const itemNode = useMemo(() => {
		if(!item || isSelectMode) {
			return null;
		}

		if(attachmentKey) {
			return {
				key: item.key,
				label: 'Back',
				path: {
					...itemsSourceNode.path,
					view: 'item-details',
					items: [item.key]
				} }
		}

		if(noteKey) {
			return {
				key: item.key,
				label: 'Back',
				path: {
					...itemsSourceNode.path,
					view: 'item-details',
					items: [item.key]
				} }
		}

		return { key: item.key, label: '' };
	}, [attachmentKey, item, itemsSourceNode, isSelectMode, noteKey]);

	const drilldownNode = useMemo(() => {
		const isDrillDown = attachmentKey || noteKey;
		if(!isDrillDown || !item || isSelectMode) {
			return null;
		}

		if(attachmentKey) {
			return { key: attachmentKey, label: 'Attachment' }
		}

		if(noteKey) {
			return { key: noteKey, label: 'Note' };
		}

		return null;
	}, [attachmentKey, item, isSelectMode, noteKey]);

	const isSelectedOpened = collectionKey in childMap;

	const isItemsView = view === 'item-list' || view === 'item-details';

	const isLastNodeCurrentlySelectedCollection = collectionKey !== null && !isSelectedOpened;

	const selectedNode = isLastNodeCurrentlySelectedCollection ? path[path.length - 1] : itemsSourceNode;

	var touchHeaderPath, shouldIncludeEditButton, shouldIncludeItemListOptions,
			shouldIncludeCollectionOptions, shouldHandleSelectMode, shouldIncludeCollectionTrashOptions = false;
	let navigationName = '';

	switch(variant) {
		case TouchHeaderWrap.variants.MOBILE:
			touchHeaderPath = [
				ROOT_NODE,
				...path,
				isItemsView ? itemsSourceNode : null,
				itemNode,
				drilldownNode
			];
			shouldIncludeEditButton = !isCollection && !isReadOnly && view === 'item-details';
			shouldIncludeItemListOptions = view === 'item-list' && !isSelectMode;
			shouldHandleSelectMode = view === 'item-list';
			shouldIncludeCollectionOptions = view !== 'libraries' &&
				!isReadOnly && !shouldIncludeEditButton &&
				!shouldIncludeItemListOptions && !shouldHandleSelectMode &&
				!isCollection; // collection options (e.g. "New Collection") are displayed at library and collection level. `isCollection` is true when current view is data object details and data object is a collection
			shouldIncludeCollectionTrashOptions = isCollection && !isReadOnly && !isSelectMode && isTrash;
			navigationName = 'Main';
		break;
		case TouchHeaderWrap.variants.NAVIGATION:
			touchHeaderPath = [ROOT_NODE, ...path];
			if(isLastNodeCurrentlySelectedCollection) {
				touchHeaderPath.pop();
			}
			shouldIncludeCollectionOptions = !isReadOnly;
			navigationName = 'Collections';
		break;
		case TouchHeaderWrap.variants.SOURCE:
			touchHeaderPath = [ selectedNode ];
			shouldIncludeItemListOptions = !isSelectMode;
			shouldHandleSelectMode = true;
			navigationName = 'Items';
		break;
		case TouchHeaderWrap.variants.SOURCE_AND_ITEM:
			touchHeaderPath = [ selectedNode, itemNode, drilldownNode ];
			shouldIncludeItemListOptions = !item && !isSelectMode;
			shouldHandleSelectMode = true;
			shouldIncludeEditButton = !isCollection && !isReadOnly && !isSelectMode && !!item;
			shouldIncludeCollectionTrashOptions = isCollection && !isReadOnly && !isSelectMode && isTrash;
			navigationName = 'Items';
		break;
		case TouchHeaderWrap.variants.ITEM:
			touchHeaderPath = [ itemNode, drilldownNode ];
			shouldIncludeEditButton = !isCollection && !isReadOnly && !isSelectMode && !!item;
			shouldIncludeCollectionTrashOptions = isCollection && !isReadOnly && !isSelectMode && isTrash;
			navigationName = 'Item Details';
		break;
	}

	const shouldHideNav = (shouldIncludeEditButton && isEditing) ||
		(shouldHandleSelectMode && isSelectMode) ||
		(shouldIncludeCollectionTrashOptions && variant === TouchHeaderWrap.variants.ITEM);

	touchHeaderPath = touchHeaderPath.filter(Boolean);

	const selectedItemsCount = itemKeys.length;
	const collectionHasChildren = collectionKey in childMap;


	const onNavigate = useCallback((...args) => {
		dispatch(navigate(...args));
	}, [dispatch]);

	const onSelectModeToggle = useCallback(shouldCancel => {
		dispatch(navigate({ items: [] }));
		dispatch(triggerSelectMode(shouldCancel));
	}, [dispatch]);

	return (
		<TouchHeader
			className={ className }
			collectionKey={ collectionKey }
			collectionHasChildren={ collectionHasChildren }
			isEditing={ isEditing }
			isModal={ false }
			isSelectMode={ isSelectMode }
			navigationName={ navigationName }
			onNavigate={ onNavigate }
			onSelectModeToggle={ onSelectModeToggle }
			shouldIncludeEditButton={ shouldIncludeEditButton }
			shouldIncludeItemListOptions={ shouldIncludeItemListOptions }
			shouldIncludeCollectionOptions={ shouldIncludeCollectionOptions }
			shouldHandleSelectMode={ shouldHandleSelectMode }
			shouldIncludeCollectionTrashOptions={ shouldIncludeCollectionTrashOptions }
			shouldHideNav={ shouldHideNav }
			selectedItemsCount={ selectedItemsCount }
			path={ touchHeaderPath }
		/>
	);
});

TouchHeaderWrap.displayName = 'TouchHeaderWrap';

TouchHeaderWrap.variants = {
	MOBILE: 'MOBILE',
	NAVIGATION: 'NAVIGATION',
	SOURCE: 'SOURCE',
	SOURCE_AND_ITEM: 'SOURCE_AND_ITEM',
	ITEM: 'ITEM'
};

TouchHeaderWrap.propTypes = {
	className: PropTypes.string,
	variant: PropTypes.oneOf(Object.values(TouchHeaderWrap.variants)),
};

export default TouchHeaderWrap;
