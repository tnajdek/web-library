import { loadFixtureState, closeServer } from '../utils/fixed-state-server.js';
import { test, expect } from '../utils/playwright-fixtures.js';

test.describe('Mobile Interaction', () => {
	let server;

	test.afterEach(async () => {
		await closeServer(server);
	});

	test('Tapping "Libraries" in touch header navigates to root libraries view', async ({ page, serverPort }) => {
		server = await loadFixtureState('mobile-test-user-library-view', serverPort, page);

		// Target the collections touch-nav (on iPad there are two: "Collections" and "Items")
		const collectionsNav = page.getByRole('navigation', { name: 'Collections' }).or(
			page.getByRole('navigation', { name: 'Main' })
		);
		await expect(collectionsNav).toBeVisible();

		// The "Libraries" label should be visible as the back/previous button
		const librariesButton = collectionsNav.locator('.previous .truncate', { hasText: 'Libraries' });
		await expect(librariesButton).toBeVisible();

		// Tap the "Libraries" back button
		await librariesButton.tap();

		// URL should now be the root path
		await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);

		// Both libraries should be visible as tappable tree items in the root view
		await expect(page.getByRole('treeitem', { name: 'My Library' })).toBeVisible();
		await expect(page.getByRole('treeitem', { name: 'Animals' })).toBeVisible();
	});

	test('Scrolling collection tree closes open dot menu dropdown', async ({ page, serverPort }) => {
		server = await loadFixtureState('mobile-test-user-library-view', serverPort, page);

		const aiTreeItem = page.getByRole('treeitem', { name: 'AI' });
		await expect(aiTreeItem).toBeVisible();
		const moreButton = aiTreeItem.getByTitle('More');
		await moreButton.tap({ force: true });

		const menuItem = page.getByRole('menuitem', { name: 'New Subcollection' });
		await expect(menuItem).toBeVisible();

		// Scroll the collection tree -- find and dispatch scroll on the nearest scrollable
		// ancestor of a collection node (mirrors the production code's scroll parent detection)
		await page.evaluate(() => {
			const node = document.querySelector('[data-collection-key]');
			let el = node.parentElement;
			while (el && el !== document.body) {
				const { overflow, overflowY } = getComputedStyle(el);
				if (['auto', 'scroll'].includes(overflow) || ['auto', 'scroll'].includes(overflowY)) {
					break;
				}
				el = el.parentElement;
			}
			if (el && el !== document.body) {
				el.dispatchEvent(new Event('scroll'));
			}
		});

		await expect(menuItem).not.toBeVisible();
	});
});
