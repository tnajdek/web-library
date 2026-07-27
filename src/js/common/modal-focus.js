export const focusOnModalOpen = (contentEl, isTouchOrSmall, focusCb, fallbackMs = 750) => {
	// Initial focus is applied asynchronously, either once the open transition completes or on
	// the next frame. Skip it if focus has meanwhile moved onto a control inside the modal so
	// that an interaction that started before we got here is not interrupted.
	const focusUnlessTaken = () => {
		const activeEl = document.activeElement;
		if (activeEl !== contentEl && contentEl.contains(activeEl)) {
			return;
		}
		focusCb();
	};

	if (isTouchOrSmall) {
		let settled = false;

		const handleTransitionEnd = (ev) => {
			if (ev.propertyName !== 'transform') {
				return;
			}
			if (settled) {
				return;
			}
			settled = true;
			clearTimeout(fallbackTimeout);
			contentEl.removeEventListener('transitionend', handleTransitionEnd);
			focusUnlessTaken();
		};

		const fallbackTimeout = setTimeout(() => {
			if (settled) {
				return;
			}
			settled = true;
			contentEl.removeEventListener('transitionend', handleTransitionEnd);
			focusUnlessTaken();
		}, fallbackMs);

		contentEl.addEventListener('transitionend', handleTransitionEnd);
	} else {
		requestAnimationFrame(focusUnlessTaken);
	}
};
