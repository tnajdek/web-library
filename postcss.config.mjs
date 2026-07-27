import autoprefixer from 'autoprefixer';

import expandInset from './scripts/postcss-expand-inset.mjs';

export default {
	plugins: [
		expandInset(),
		autoprefixer(),
	]
};
