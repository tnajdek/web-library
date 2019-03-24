const resolve = require('rollup-plugin-node-resolve');
const babel = require('rollup-plugin-babel');
const commonjs = require('rollup-plugin-commonjs');
const replace = require('rollup-plugin-replace');
const json = require('rollup-plugin-json');
const getNamedExports = require('./scripts/named-exports');
const webworkify = require('rollup-plugin-webworkify');
import { terser } from "rollup-plugin-terser";
const builtins = require('rollup-plugin-node-builtins');
const globals = require('rollup-plugin-node-globals');

module.exports = {
	input: 'src/js/main.js',
	output: {
		file: 'build/static/zotero-web-library.js',
		format: 'umd',
		name: 'ZoteroWebLibrary',
		sourcemap: true,
	},
	external: ['cross-fetch/polyfill'],
	plugins: [
		webworkify({ pattern: '**/*.worker.js' }),
		// builtins(),
		resolve({
			// browser: true,
			jsnext: true,
			main: true,
			extensions: [ '.mjs', '.js', '.jsx', '.json' ],
			preferBuiltins: false,
		}),
		json(),

		babel({
			exclude: 'node_modules/**'
		}),
		commonjs({
			include: 'node_modules/**',
			namedExports: {
				...getNamedExports(['react', 'react-is', 'react-dom', 'prop-types']),
				'node_modules/react-debounce-input/lib/index.js': ['DebounceInput'],
				'node_modules/file-saver/dist/FileSaver.min.js': ['saveAs'],
			}
		}),
		replace({
			'process.env.NODE_ENV': JSON.stringify('production'),
			// 'process.domain': '{}',
		}),
		terser({
			sourcemap: true
		})
	]
};
