import { getPort, getServer } from '../utils/fixed-state-server.js';
import { BrowserStackManager, desktopContexts } from '../utils/browserstack.js';
import { screenshot } from '../utils/screenshot.js';
import { wait, waitForLoad } from '../utils/common.js';

jest.setTimeout(60000);

describe('Desktop Snapshots', () => {
	let browsers, server, port, context;

	beforeAll(() => {
		port = getPort(parseInt(process.env.JEST_WORKER_ID) ?? 1);
		browsers = new BrowserStackManager();
	});

	afterAll(async () => {
		browsers.closeConnections();
	});

	afterEach(async () => {
		if (server) {
			await new Promise(r => server.close(r));
			server = null;
		}
		if (context) {
			await context.close();
			context = null;
		}
	});

	desktopContexts.forEach((browserName) => {
		test(`should render a list of items on "${browserName}"`, async () => {
			server = await getServer('desktop-test-user-item-view', port);
			context = await browsers.getBrowserContext(browserName);
			const page = await context.newPage();
			await page.goto(`http://localhost:${port}/testuser/collections/WTTJ2J56/items/VR82JUX8/item-details`);
			await waitForLoad(page);
			await page.waitForLoadState('networkidle');
			const itemsList = await page.getByRole('grid', { name: 'items' });
			expect(await itemsList.getByRole('row').count()).toBe(8); // 7 items + header row
			await wait(500); // avoid flaky screenshot with missing icons
			expect(await screenshot(page, `desktop-items-list-${browserName}`)).toBeTruthy();
			await page.close();
		});

		test(`should render "Add Related" modal on "${browserName}"`, async () => {
			server = await getServer('desktop-test-user-item-view', port);
			context = await browsers.getBrowserContext(browserName);
			const page = await context.newPage();
			await page.goto(`http://localhost:${port}/testuser/collections/WTTJ2J56/items/VR82JUX8/item-details`);
			await waitForLoad(page);

			const relatedTab = await page.getByRole('tab', { name: 'Related' });
			await relatedTab.click();

			const addRelatedButton = await page.getByRole('button', { name: 'Add Related Item' });
			await addRelatedButton.click();

			await page.getByRole('dialog', { name: 'Add Related Items' });
			await page.waitForFunction(() => document.querySelector('.add-related-modal').classList.contains('ReactModal__Content--after-open'));
			await wait(500); // avoid flaky screenshot with missing icons
			expect(await screenshot(page, `desktop-item-add-related-${browserName}`)).toBeTruthy();
			await page.close();
		});
	});
});
