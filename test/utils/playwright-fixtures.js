import { test as baseTest } from '@playwright/test';
import { createServer } from 'node:net';

async function findFreePort() {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.listen(0, () => {
			const port = server.address().port;
			server.close(() => resolve(port));
		});
		server.on('error', reject);
	});
}

export const test = baseTest.extend({
	serverPort: [async ({ }, use) => {
		const port = await findFreePort();
		await use(port);
	}, { scope: 'worker' }],
});

export const expect = test.expect;
