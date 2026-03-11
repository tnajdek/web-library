#!/usr/bin/env node

import { runBatch, runSingle, BOLD, GREEN, RED, RESET } from './task-runner.mjs';

const NODE_ENV = process.env.NODE_ENV || 'production';

const PREPARE_TASKS = [
	{ label: 'Version', cmd: 'npm', args: ['run', 'build:version'] },
	{ label: 'Locale', cmd: 'npm', args: ['run', 'build:locale'] },
	{ label: 'Modules', cmd: 'npm', args: ['run', 'build:fetch-or-build-modules'] },
	{ label: 'Fonts', cmd: 'npm', args: ['run', 'build:fonts'] },
	{ label: 'Styles JSON', cmd: 'npm', args: ['run', 'build:styles-json'] },
	{ label: 'Check Icons', cmd: 'npm', args: ['run', 'build:check-icons'] },
	{ label: 'Citeproc', cmd: 'npm', args: ['run', 'build:citeproc-js'] },
];

const BUILD_TASKS = [
	{ label: 'JS', cmd: 'npx', args: ['rollup', '-c'], env: { NODE_ENV } },
	{ label: 'SCSS', cmd: 'bash', args: ['-c', "for f in src/scss/*.scss; do sass --no-source-map $f build/static/web-library/`basename $f .scss`.css; done"], env: { NODE_ENV } },
	{ label: 'HTML', cmd: 'bash', args: ['-c', 'mkdir -p build/ && cp -aL src/html/* build/'], env: { NODE_ENV } },
	{ label: 'Static', cmd: 'bash', args: ['-c', 'mkdir -p build/static/web-library/ && cp -aL src/static/* build/static/web-library/'], env: { NODE_ENV } },
];

async function main() {
	const start = Date.now();

	try {
		await runBatch('Preparing...', PREPARE_TASKS);
		await runBatch(`Building (${NODE_ENV})...`, BUILD_TASKS);
		await runSingle('Postprocess (autoprefixer)', 'npx', ['postcss', 'build/static/web-library/zotero-web-library.css', '--use', 'autoprefixer', '--no-map', '-r'], { NODE_ENV });
	} catch (err) {
		process.stdout.write(`${RED}${BOLD}Build failed: ${err.message}${RESET}\n`);
		process.exit(1);
	}

	const elapsed = ((Date.now() - start) / 1000).toFixed(1);
	process.stdout.write(`\n${GREEN}${BOLD}Build complete${RESET} ${elapsed}s\n`);
}

main();
