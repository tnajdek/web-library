'use strict';

import { useCallback, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';

import { triggerUserTypeChange } from '../actions';

const keysToTriggerKeyboardMode = ['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp'];

const UserTypeDetector = () => {
	const dispatch = useDispatch();
	const lastTouchStartEvent = useRef(0);

	const handleKeyboard = useCallback(ev => {
		if(keysToTriggerKeyboardMode.includes(ev.key)) {
			dispatch(triggerUserTypeChange({ 'isKeyboardUser': true, }));
		}
	}, [dispatch]);

	const handleMouse = useCallback(ev => {
		// prevent simulated mouse events triggering mouse user
		if(!lastTouchStartEvent.current || ev.timeStamp - lastTouchStartEvent.current > 500) {
			dispatch(triggerUserTypeChange({
				'isKeyboardUser': false,
				'isMouseUser': true,
				'isTouchUser': false,
				'userType': 'mouse'
			}));
		}
	}, [dispatch]);

	const handleTouch = useCallback(ev => {
		lastTouchStartEvent.current = ev.timeStamp;
		dispatch(triggerUserTypeChange({
			'isKeyboardUser': false,
			'isMouseUser': false,
			'isTouchUser': true,
			'userType': 'touch'
		}));
	}, [dispatch]);

	useEffect(() => {
		document.addEventListener('keyup', handleKeyboard, { capture: true, passive: true });
		document.addEventListener('mousedown', handleMouse, { capture: true, passive: true });
		document.addEventListener('touchstart', handleTouch, { capture: true, passive: true });

		return () => {
			document.removeEventListener('keyup', handleKeyboard, { capture: true });
			document.removeEventListener('mousedown', handleMouse, { capture: true });
			document.removeEventListener('touchstart', handleTouch, { capture: true });
		}
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return null;
}

export default UserTypeDetector;
