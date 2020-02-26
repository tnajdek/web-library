import AutoSizer from 'react-virtualized-auto-sizer';
import cx from 'classnames';
import InfiniteLoader from "react-window-infinite-loader";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { useDrop } from 'react-dnd';

import columnProperties from '../../../constants/column-properties';
import HeaderRow from './table-header-row';
import Spinner from '../../ui/spinner';
import TableBody from './table-body';
import TableRow from './table-row';
import { applyChangesToVisibleColumns, resizeVisibleColumns } from '../../../utils';
import { ATTACHMENT } from '../../../constants/dnd';
import { createAttachmentsFromDropped, fetchSource, preferenceChange, triggerFocus } from '../../../actions';
import { useFocusManager, useSourceData } from '../../../hooks';

const ROWHEIGHT = 26;

const getColumnCssVars = (columns, width, scrollbarWidth) =>
	Object.fromEntries(columns.map((c, i) => [
		`--col-${i}-width`,
		i === columns.length - 1 ? `${c.fraction * width - scrollbarWidth}px` : `${c.fraction * width}px`
	]));

const Table = memo(() => {
	const containerDom = useRef(null);
	const headerRef = useRef(null);
	const tableRef = useRef(null);
	const listRef = useRef(null);
	const innerRef = useRef(null);
	const outerRef = useRef(null);
	const loader = useRef(null);
	const resizing = useRef(null);
	const reordering = useRef(null);
	const mouseUpTimeout = useRef(null);
	const [isResizing, setIsResizing] = useState(false);
	const [isReordering, setIsReordering] = useState(false);
	const [reorderTargetIndex, setReorderTargetIndex] = useState(null);
	const [isHoveringBetweenRows, setIsHoveringBetweenRows] = useState(false);
	const { hasChecked, isFetching, keys, requests, totalResults } = useSourceData();
	const collectionKey = useSelector(state => state.current.collectionKey);
	const libraryKey = useSelector(state => state.current.libraryKey);
	const isFileUploadAllowed = useSelector(
		state => (state.config.libraries.find(
			l => l.key === state.current.libraryKey
		) || {}).isFileUploadAllowed
	);
	const columnsData = useSelector(state => state.preferences.columns, shallowEqual);
	const selectedItemKeys = useSelector(state => state.current.itemKeys, shallowEqual);
	const isMyLibrary = useSelector(state =>
		(state.config.libraries.find(l => l.key === state.current.libraryKey) || {}).isMyLibrary
	);
	const scrollbarWidth = useSelector(state => state.device.scrollbarWidth);
	const columns = useMemo(() => columnsData
		.filter(c => c.isVisible)
		.filter(c => !isMyLibrary || (isMyLibrary && !(c.field in columnProperties && columnProperties[c.field].excludeInMyLibrary)))
	, [columnsData, isMyLibrary]);
	const { field: sortBy, sort: sortDirection } = useMemo(() =>
		columnsData.find(column => 'sort' in column) || { field: 'title', sort: 'asc' },
		[columnsData]
	);
	const { handleNext, handlePrevious, handleDrillDownNext, handleDrillDownPrev, handleFocus,
		handleBlur } = useFocusManager(
			tableRef,
			{ isCarousel: false, initialFocusPicker: candidate => candidate.classList.contains('active') }
		);

	const dispatch = useDispatch();

	const [{ isOver, canDrop }, drop] = useDrop({
		accept: [ATTACHMENT, NativeTypes.FILE],
		canDrop: () => isFileUploadAllowed,
		collect: monitor => ({
			isOver: monitor.isOver({ shallow: true }),
			canDrop: monitor.canDrop(),
		}),
		drop: (props, monitor) => {
			if(monitor.isOver({ shallow: true })) { //ignore if dropped on a row (which is handled there)
				const itemType = monitor.getItemType();
				const item = monitor.getItem();

				if(itemType === ATTACHMENT) {
					return { collection: collectionKey, library: libraryKey };
				}

				if(itemType === NativeTypes.FILE) {
					dispatch(createAttachmentsFromDropped(item.files, { collection: collectionKey }));
					return;
				}
			}
		}
	});

	const handleIsItemLoaded = useCallback(index => {
		if(keys && !!keys[index]) {
			return true; // loaded
		}
		return requests.some(r => index >= r[0] && index < r[1]); // loading
	});

	const handleLoadMore = useCallback((startIndex, stopIndex) => {
		dispatch(fetchSource(startIndex, stopIndex))
	});

	const handleResize = useCallback(ev => {
		const columnDom = ev.target.closest(['[data-colindex]']);
		const index = columnDom.dataset.colindex - 1;
		const { width } = containerDom.current.getBoundingClientRect();
		setIsResizing(true);
		resizing.current = { origin: ev.clientX, index, width };
	});

	const handleReorder = useCallback(ev => {
		const columnDom = ev.target.closest(['[data-colindex]']);
		const index = columnDom.dataset.colindex;
		const { left, width } = containerDom.current.getBoundingClientRect();
		setIsReordering(true);
		reordering.current = { index, left, width };
	});

	const handleMouseMove = useCallback(ev => {
		if(resizing.current !== null) {
			const { origin, index, width } = resizing.current;
			const offsetPixels = ev.clientX - origin;
			const offset = offsetPixels / width;
			const newColumns = columns.map(c => ({ ...c }));
			newColumns[index].fraction = Math.max(
				columns[index].fraction + offset,
				columns[index].minFraction
			);
			resizeVisibleColumns(newColumns, -offset, true);

			resizing.current.newColumns = newColumns;
			const style = getColumnCssVars(newColumns, width, scrollbarWidth);
			Object.entries(style).forEach(([name, value]) =>
				tableRef.current.style.setProperty(name, value)
			);
		} else if(reordering.current !== null) {
			const { index, left, width } = reordering.current;
			var targetIndex;
			if(ev.clientX < left) {
				targetIndex = 0;
			} else {
				let columnLeft = left;
				for (let i = 0; i < columns.length; i++) {
					const columnWidth = columns[i].fraction * width;
					columnLeft += columnWidth;
					const testOffest = columnLeft - 0.5 * columnWidth;
					if(ev.clientX < testOffest) {
						targetIndex = i;
						break;
					}
				}
			}
			if(targetIndex !== index) {
				setReorderTargetIndex(targetIndex);
			}
		}
	});
	const handleMouseUp = useCallback(ev => {
		if(isResizing) {
			ev.preventDefault();
			const newColumns = columnsData.map(c => ({ ...c }));
			dispatch(preferenceChange('columns', applyChangesToVisibleColumns(resizing.current.newColumns, newColumns)));
		} else if(isReordering) {
			const fieldFrom = columns[reordering.current.index].field;
			const fieldTo = columns[reorderTargetIndex].field;
			const indexFrom = columnsData.findIndex(c => c.field === fieldFrom);
			const indexTo = columnsData.findIndex(c => c.field === fieldTo);

			if(indexFrom > -1 && indexTo > -1) {
				const newColumns = columnsData.map(c => ({ ...c }));
				newColumns.splice(indexTo, 0, newColumns.splice(indexFrom, 1)[0]);
				dispatch(preferenceChange('columns', newColumns));
			}
		}

		resizing.current = null;
		reordering.current = null;

		mouseUpTimeout.current = setTimeout(() => { setIsResizing(false); setIsReordering(false); setReorderTargetIndex(null) });
	});

	const handleMouseLeave = useCallback(() => {
		setIsReordering(false);
		setIsResizing(false);
		setReorderTargetIndex(null);
		resizing.current = null;
		reordering.current = null;
	});

	const handleFileHoverOnRow = useCallback((isOverRow, dropZone) => {
		setIsHoveringBetweenRows(isOverRow && dropZone !== null);
	});

	const handleKeyDown = useCallback(ev => {
		if(ev.key === 'ArrowUp') {
			handlePrevious(ev, { useCurrentTarget: false });
		} else if(ev.key === 'ArrowDown') {
			handleNext(ev, { useCurrentTarget: false });
		}
	});

	const handleTableFocus = useCallback(ev => {
		dispatch(triggerFocus('items-table', true));
		handleFocus(ev);
	});

	const handleTableBlur = useCallback(ev => {
		dispatch(triggerFocus('items-table', false));
		handleBlur(ev);
	});

	useEffect(() => {
		if(!hasChecked && !isFetching) {
			dispatch(fetchSource(0, 50));
		}
	}, [hasChecked]);

	useEffect(() => {
		return () => {
			if(mouseUpTimeout.current) {
				clearTimeout(mouseUpTimeout.current);
			}
			dispatch(triggerFocus('items-table', false));
		}
	}, []);

	useEffect(() => {
		if(loader.current) {
			loader.current.resetloadMoreItemsCache(true);
		}
	}, [sortBy, sortDirection, totalResults]);

	useEffect(() => {
		// register global mouse events so that dragging outside of table doesn't break resizing/reordering
		document.addEventListener('mouseup', handleMouseUp);
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseleave', handleMouseLeave);
		return () => {
			document.removeEventListener('mouseup', handleMouseUp)
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseleave', handleMouseLeave);
		}
		// new event handlers need to be installed every time any of these changes
		// otherwise it will have access to old values
	}, [isResizing, isReordering, columns, reorderTargetIndex]);

	useEffect(() => {
		if(listRef.current && selectedItemKeys.length && keys) {
			const itemKey = selectedItemKeys[selectedItemKeys.length - 1];
			const itemKeyIndex = keys.findIndex(k => k === itemKey);
			listRef.current.scrollToItem(itemKeyIndex);
		}
	}, [selectedItemKeys]);

	return drop(
		<div
			ref={ containerDom }
			className={cx('items-table-wrap', {
				resizing: isResizing,
				reordering: isReordering,
				'dnd-target': (isOver && canDrop) || isHoveringBetweenRows
			}) }
		>
			<AutoSizer>
			{({ height, width }) => (
				<InfiniteLoader
					isItemLoaded={ handleIsItemLoaded }
					itemCount={ hasChecked ? totalResults : 0 }
					loadMoreItems={ handleLoadMore }
					ref={ loader }
				>
					{({ onItemsRendered, ref }) => (
						<div
							tabIndex={ 0 }
							onFocus={ handleTableFocus }
							onBlur={ handleTableBlur }
							onKeyDown={ handleKeyDown }
							ref={ tableRef }
							className="items-table"
							style={ getColumnCssVars(columns, width, scrollbarWidth) }
							role="grid"
							aria-multiselectable="true"
							aria-readonly="true"
							aria-label="items table"
						>
							<HeaderRow
								ref={ headerRef }
								columns={ columns }
								sortBy={ sortBy }
								sortDirection={ sortDirection }
								width={ width }
								onResize={ handleResize }
								onReorder={ handleReorder }
								isResizing={ isResizing }
								isReordering={ isReordering }
								reorderTargetIndex= { reorderTargetIndex }
							/>
							<List
								outerElementType={ TableBody }
								className="items-table-body"
								height={ height - ROWHEIGHT } // add margin for HeaderRow
								itemCount={ hasChecked ? totalResults : 0 }
								itemData={ { onFileHoverOnRow: handleFileHoverOnRow, columns, keys } }
								itemSize={ ROWHEIGHT }
								onItemsRendered={ onItemsRendered }
								ref={ r => { ref(r); listRef.current = r } }
								outerRef={ outerRef }
								innerRef={ innerRef }
								width={ width }
							>
								{ TableRow }
							</List>
						</div>
					)}
				</InfiniteLoader>
			)}
			</AutoSizer>
			{ !hasChecked && <Spinner className="large" /> }
		</div>
	);
});

export default Table;
