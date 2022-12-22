import PropTypes from 'prop-types';
import React, { memo, useCallback, useState } from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';

import columnProperties from '../../../constants/column-properties';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle }  from '../../ui/dropdown';
import Icon from '../../ui/icon';
import { applyChangesToVisibleColumns, getPrevSibling, resizeVisibleColumns } from '../../../utils';
import { preferenceChange, restoreColumnsOrder } from '../../../actions';

const ColumnSelector = props => {
	const { tabIndex } = props;
	const { onFocusNext, onFocusPrev } = props;
	const [isOpen, setIsOpen] = useState(false);
	const [isMoreColumnsVisible, setIsMoreColumnsVisible] = useState(false);
	const dispatch = useDispatch();
	const columns = useSelector(state => state.preferences.columns, shallowEqual);
	const isMyLibrary = useSelector(state =>
		(state.config.libraries.find(l => l.key === state.current.libraryKey) || {}).isMyLibrary
	);

	const handleSelect = useCallback(ev => {
		const { field } = ev.currentTarget.dataset;

		const newColumns = columns.map(c => ({ ...c }));
		const columnIndex = newColumns.findIndex(c => c.field === field);
		const shouldBeVisible = !newColumns[columnIndex].isVisible;
		newColumns[columnIndex].isVisible = shouldBeVisible;

		if(columnIndex === -1) {
			return;
		}

		const fractionBias = newColumns[columnIndex].isVisible ?
			newColumns[columnIndex].fraction * -1 :
			newColumns[columnIndex].fraction;

		const visibleColumns = newColumns.filter(c => c.isVisible);
		resizeVisibleColumns(visibleColumns, fractionBias);
		return dispatch(preferenceChange('columns', applyChangesToVisibleColumns(visibleColumns, newColumns)));
	}, [dispatch, columns]);

	const handleToggleDropdown = useCallback(ev => {
		// if(ev.target && ev.target.dataset.noToggle) {
		// 	return;
		// }
		setIsOpen(isOpen => !isOpen);
		setIsMoreColumnsVisible(false);
	}, []);

	const handleKeyDown = useCallback(ev => {
		if(ev.target !== ev.currentTarget) {
			return;
		}

		if(ev.key === 'ArrowRight') {
			onFocusNext(ev);
		} else if(ev.key === 'ArrowLeft') {
			onFocusPrev(ev);
		}
	}, [onFocusNext, onFocusPrev]);

	const handleRestoreClick = useCallback(() => {
		dispatch(restoreColumnsOrder())
	}, [dispatch]);

	const handleToggleMore = useCallback(ev => {
		ev.preventDefault();
		ev.stopPropagation();
		if(ev.type === 'keydown') {
			getPrevSibling(ev.currentTarget, '.dropdown-item').focus();
		}
		setIsMoreColumnsVisible(true);
	}, []);

	return (
		<Dropdown
			isOpen={ isOpen }
			onToggle={ handleToggleDropdown }
			className="column-selector"
			placement="bottom-end"
		>
			<DropdownToggle
				aria-label="Column Selector"
				className="btn-icon dropdown-toggle"
				color={ null }
				onKeyDown={ handleKeyDown }
				tabIndex={ tabIndex }
				title="Column Selector"
			>
				<Icon type={ '16/columns' } width="16" height="16" />
			</DropdownToggle>
			<DropdownMenu>
				{ columns
					.filter(c => c.field !== 'title')
					.filter(c => !isMyLibrary || (isMyLibrary && !(c.field in columnProperties && columnProperties[c.field].excludeInMyLibrary)))
					.filter(c => !(c.field in columnProperties && columnProperties[c.field].isUnderMoreColumns) || c.isVisible)
					.map(column => (
						<DropdownItem
							data-field={ column.field }
							key={ column.field }
							onClick={ handleSelect }
						>
							<span className="tick">{ column.isVisible ? "✓" : "" }</span>
							{ column.field in columnProperties ? columnProperties[column.field].name : column.field }
						</DropdownItem>
					))
				}
				{ !isMoreColumnsVisible && <DropdownItem divider /> }
					{ isMoreColumnsVisible ?
						columns
						.filter(c => (c.field in columnProperties && columnProperties[c.field].isUnderMoreColumns) && !c.isVisible)
						.map(column => (
							<DropdownItem
							data-field={ column.field }
							key={ column.field }
							onClick={ handleSelect }
						>
							<span className="tick">{ column.isVisible ? "✓" : "" }</span>
								{ column.field in columnProperties ? columnProperties[column.field].name : column.field }
							</DropdownItem>
						)) :
						<DropdownItem data-no-toggle onClick={ handleToggleMore }>
							More
						</DropdownItem>
					}
				<DropdownItem divider />
				<DropdownItem onClick={ handleRestoreClick }>
					Restore Column Order
				</DropdownItem>
			</DropdownMenu>
		</Dropdown>
	);
}

ColumnSelector.propTypes = {
	onFocusNext: PropTypes.func,
	onFocusPrev: PropTypes.func,
	tabIndex: PropTypes.number,
}

export default memo(ColumnSelector);
