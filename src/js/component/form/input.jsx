import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import AutoResizer from './auto-resizer';
import Spinner from '../ui/spinner';
import { mod, noop } from '../../utils';
import { omit, pick } from '../../common/immutable';
import { usePrevious } from '../../hooks';
import { useFloating, shift } from '@floating-ui/react-dom';

const NATIVE_INPUT_PROPS = ['autoFocus', 'form', 'id', 'inputMode', 'max', 'maxLength',
'min', 'minLength', 'name', 'placeholder', 'type', 'spellCheck', 'step', 'tabIndex'];

const AutoResizerInput = memo(forwardRef((props, ref) => props.resize ? (
	<AutoResizer
		content={props.value}
		vertical={props.resize === 'vertical'}
	>
		<input ref={ ref } {...omit(props, 'resize')} />
	</AutoResizer>
	) : (
		<input ref={ ref } {...omit(props, 'resize')} />
	)
));

AutoResizerInput.propTypes = {
	resize: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
	value: PropTypes.string
};


const Input = memo(forwardRef((props, ref) => {
	const { className = 'form-control', inputGroupClassName, isBusy, isDisabled, isReadOnly, isRequired, onBlur = noop, onCancel
	= noop, onCommit = noop, onChange = noop, onFocus = noop, onKeyDown = noop, selectOnFocus,
	suggestions, validationError, value: initialValue, resize, ...rest } = props;
	const [hasCancelledSuggestions, setHasCancelledSuggestions] = useState(false);
	const [value, setValue] = useState(initialValue);
	const [highlighted, setHighlighted] = useState(0);
	const inputRef = useRef(null);
	const suggestionsRef = useRef(null);
	const prevInitialValue = usePrevious(initialValue);
	const prevValidationError = usePrevious(validationError);

	const hasBeenCancelled = useRef(false);
	const hasBeenCommitted = useRef(false);

	const { x, y, reference, floating, strategy } = useFloating({
		placement: 'bottom', middleware: [shift()]
	});

	//reset on every render
	hasBeenCancelled.current = false;
	hasBeenCommitted.current = false;

	const groupClassName = cx({
		'input-group': true,
		'input': true,
		'busy': isBusy,
		'dropdown': suggestions,
		'show': suggestions && suggestions.length && !hasCancelledSuggestions,
	}, inputGroupClassName);

	useImperativeHandle(ref, () => ({
		focus: () => {
			inputRef.current.focus();
			if(selectOnFocus) {
				inputRef.current.select();
			}
		}
	}));

	const handleChange = useCallback(ev => {
		setValue(ev.currentTarget.value);
		setHasCancelledSuggestions(false);
		onChange(ev.currentTarget.value);
	}, [onChange]);

	const handleBlur = useCallback(ev => {
		if (ev.relatedTarget && (ev.relatedTarget.dataset.suggestion)) {
			return;
		}
		if (hasBeenCancelled.current || hasBeenCommitted.current) {
			return;
		}

		const shouldCancel = onBlur(ev);

		if(shouldCancel) {
			onCancel(value !== initialValue, ev);
			hasBeenCancelled.current = true;
			if (inputRef.current) {
				inputRef.current.blur();
			}
		} else {
			onCommit(value, value !== initialValue, ev);
		}
	}, [initialValue, onBlur, onCancel, onCommit, value]);

	const handleFocus = useCallback(ev => {
		if(selectOnFocus) {
			ev.currentTarget.select();
		}
		onFocus(ev);
	}, [onFocus, selectOnFocus]);

	const handleKeyDown = useCallback(ev => {
		switch (ev.key) {
			case 'Escape':
				if(suggestions && suggestions.length && !hasCancelledSuggestions) {
					setHasCancelledSuggestions(true);
					ev.stopPropagation();
				} else {
					onCancel(value !== initialValue, ev);
					hasBeenCancelled.current = true;
					inputRef.current.blur();
				}
			break;
			case 'Enter':
				if(suggestions && suggestions.length && !hasCancelledSuggestions) {
					const newValue = suggestions[highlighted] || value;
					setValue(newValue);
					onCommit(newValue, newValue !== initialValue, ev);
				} else {
					onCommit(value, value !== initialValue, ev);
				}
			break;
			case 'ArrowDown':
				if (suggestions && suggestions.length && !hasCancelledSuggestions) {
					setHighlighted(highlighted => mod(highlighted + 1, suggestions.length ));
					ev.preventDefault();
				}
			break;
			case 'ArrowUp':
				if(suggestions && suggestions.length && !hasCancelledSuggestions) {
					setHighlighted(highlighted => mod(highlighted - 1, suggestions.length))
					ev.preventDefault();
				}
			break;
		}
		onKeyDown(ev);
	}, [hasCancelledSuggestions, highlighted, initialValue, onCancel, onCommit, onKeyDown, suggestions, value])

	useEffect(() => {
		if(initialValue !== prevInitialValue) {
			setValue(initialValue);
		}
	}, [initialValue, prevInitialValue]);

	useEffect(() => {
		if (validationError !== prevValidationError && inputRef.current.setCustomValidity) {
			inputRef.current.setCustomValidity(validationError ? validationError : '');
		}
	}, [validationError, prevValidationError]);

	return (
		<div className={ groupClassName }>
			<AutoResizerInput
				className={ className }
				disabled={ isDisabled }
				onBlur={ handleBlur }
				onChange={ handleChange }
				onFocus={ handleFocus }
				onKeyDown={ handleKeyDown }
				readOnly={ isReadOnly }
				resize={ resize }
				ref={(r) => { reference(r); inputRef.current = r; }}
				required={ isRequired }
				value={ value }
				{ ...pick(rest, NATIVE_INPUT_PROPS) }
				{ ...pick(rest, key => key.match(/^(aria-|data-|on[A-Z]).*/)) }
			/>
			{ suggestions && (
				<div
					style={{ position: strategy, transform: `translate3d(${x}px, ${y}px, 0px)` }}
					ref={r => { floating(r); suggestionsRef.current = r; } }
					className={ cx("dropdown-menu suggestions", {
						'show': suggestions.length > 0 && !hasCancelledSuggestions,
				})}>
					{ suggestions.map((s, index) =>
						<div
							className={ cx("dropdown-item", {
								'active': index === highlighted,
							})}
							data-suggestion={s}
							key={s}
						>
							{s}
						</div>
					) }
				</div>
			)}
			{ isBusy ? <Spinner /> : null }
		</div>
	);
}));

Input.displayName = 'Input';

Input.propTypes = {
	className: PropTypes.string,
	inputGroupClassName: PropTypes.string,
	isBusy: PropTypes.bool,
	isDisabled: PropTypes.bool,
	isReadOnly: PropTypes.bool,
	isRequired: PropTypes.bool,
	onBlur: PropTypes.func,
	onCancel: PropTypes.func,
	onChange: PropTypes.func,
	onCommit: PropTypes.func,
	onFocus: PropTypes.func,
	onKeyDown: PropTypes.func,
	resize: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
	selectOnFocus: PropTypes.bool,
	suggestions: PropTypes.array,
	validationError: PropTypes.string,
	value: PropTypes.string,
};

export default Input;
