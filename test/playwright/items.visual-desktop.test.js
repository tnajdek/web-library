import { getServer, closeServer } from '../utils/fixed-state-server.js';
import { test, expect } from '../utils/playwright-fixtures.js';
import { wait, waitForLoad } from '../utils/common.js';

test.describe('Desktop Snapshots', () => {
	let server;

	test.afterEach(async () => {
		await closeServer(server);
	});

	test(`should render a list of items"`, async ({ page, serverPort }) => {
		server = await getServer('desktop-test-user-item-view', serverPort);
		await page.goto(`http://localhost:${serverPort}/testuser/collections/WTTJ2J56/items/VR82JUX8/item-details`);
		await waitForLoad(page);
		await page.waitForLoadState('networkidle');
		const itemsList = await page.getByRole('grid', { name: 'items' });
		expect(await itemsList.getByRole('row').count()).toBe(8); // 7 items + header row
		await wait(500); // avoid flaky screenshot with missing icons
		await expect(page).toHaveScreenshot(`desktop-items-list.png`);
		await page.close();
	});

	test('should render selected collection with focused More button', async ({ page, serverPort }) => {
		server = await getServer('desktop-test-user-item-view', serverPort);
		await page.goto(`http://localhost:${serverPort}/testuser/collections/WTTJ2J56/items/VR82JUX8/item-details`);
		await waitForLoad(page);
		await page.waitForLoadState('networkidle');
		// Tab to activate keyboard mode and focus the collection tree
		await page.keyboard.press('Tab');
		// Navigate down to the collection "Dogs" (selected)
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('ArrowDown');
		await expect(page.getByRole('treeitem', { name: 'Dogs' })).toBeFocused();
		// Press ArrowRight to open the subtree ("Dogs" collection has subcollections)
		await page.keyboard.press('ArrowRight');
		// Press ArrowRight again to focus on the "More" button
		await page.keyboard.press('ArrowRight');
		await expect(page
			.getByRole('treeitem', { name: 'Dogs' })
			.getByRole('button', { name: 'More' })
		).toBeFocused();
		await wait(500);
		await expect(page).toHaveScreenshot('desktop-collection-tree-more-focused.png');
		await page.close();
	});

	test('should render note with dropdown focused and opened', async ({ page, serverPort }) => {
		server = await getServer('desktop-test-user-note-view', serverPort);
		await page.goto(`http://localhost:${serverPort}/testuser/collections/CSB4KZUU/items/BLVYJQMH/note/GNVWD3U4`);
		await waitForLoad(page);
		await page.waitForLoadState('networkidle');

		const note = page.locator('.note.selected');
		await note.focus();

		// Move focus to the "Note Options" dropdown toggle
		await page.keyboard.press('ArrowRight');
		await expect(note.getByRole('button', { name: 'Note Options' })).toBeFocused();

		// Open the dropdown
		await page.keyboard.press('Enter');
		await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeVisible();

		await wait(500);
		await expect(page).toHaveScreenshot('desktop-note-dropdown-focused.png');
		await page.close();
	});

	test('should render flags, symbols and emoji in the items table', async ({ page, serverPort }) => {
		server = await getServer('item-with-emoji-and-flags', serverPort);
		await page.goto(`http://localhost:${serverPort}/testuser/collections/4VM2BFHN/items/IY45CHYB/collection`);
		await waitForLoad(page);
		await wait(500); // avoid flaky screenshot with missing icons

		const row = await page.getByRole('row', { name: 'Hip Hop in the United States'});
		await expect(row.locator('css=.emoji')).toHaveText('♫🎶🇺🇸');
		await expect(page).toHaveScreenshot(`desktop-item-flags-symbols-emoji.png`);
		await page.close();
	});
});
