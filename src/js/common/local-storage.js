const getLSItem = (key, fallback = null) => {
	try {
		return window.localStorage.getItem(key) ?? fallback;
	} catch (e) {
		console.warn(`Failed to read "${key}" from localStorage:`, e);
		return fallback;
	}
};

const setLSItem = (key, value) => {
	try {
		window.localStorage.setItem(key, value);
	} catch (e) {
		console.warn(`Failed to write "${key}" to localStorage:`, e);
	}
};

const removeLSItem = key => {
	try {
		window.localStorage.removeItem(key);
	} catch (e) {
		console.warn(`Failed to remove "${key}" from localStorage:`, e);
	}
};

export { getLSItem, removeLSItem, setLSItem };
