import { loadFixtureState, closeServer, makeCustomHandler } from '../utils/fixed-state-server.js';
import { test, expect } from '../utils/playwright-fixtures.js';
import { isSingleColumn } from '../utils/common.js';
import itemsInCollectionAlgorithms from '../fixtures/response/test-user-get-items-in-collection-algorithms.json' assert { type: 'json' };

test.describe('Mobile Modals', () => {
	let server;

	test.afterEach(async () => {
		await closeServer(server);
	});

	test('should focus input in New Subcollection modal', async ({ page, serverPort }) => {
		server = await loadFixtureState('mobile-test-user-library-view', serverPort, page);

		// Open the "More" dropdown on the "AI" collection.
		// force: true -- on iPad the expanded "Dogs" subcollection list visually
		// overlaps sibling tree items.
		const aiTreeItem = page.getByRole('treeitem', { name: 'AI' });
		await expect(aiTreeItem).toBeVisible();
		const moreButton = aiTreeItem.getByTitle('More');
		await moreButton.tap({ force: true });

		const menuItem = page.getByRole('menuitem', { name: 'New Subcollection' });
		await expect(menuItem).toBeVisible();
		await menuItem.tap();

		// Wait for the modal to appear and settle
		const modal = page.getByRole('dialog', { name: 'Add a New Collection' });
		await expect(modal).toBeVisible();
		await page.waitForFunction(() =>
			document.querySelector('.new-collection')?.classList.contains('ReactModal__Content--after-open')
		);

		// Wait for the slide transition to complete (500ms CSS transition)
		// The focusOnModalOpen utility waits for transitionend, so we just need
		// to wait long enough for the transition + focus to settle
		await page.waitForTimeout(600);

		// Verify that focus is placed on the input
		const input = modal.getByRole('textbox');
		await expect(input).toBeFocused();

		await page.close();
	});

	test('should open Change Parent Item modal without changing view', async ({ page, serverPort }) => {
		const customHandler = makeCustomHandler('/api/users/1/collections/CSB4KZUU/items/top', itemsInCollectionAlgorithms);
		server = await loadFixtureState('mobile-test-user-item-details-view-edit', serverPort, page, customHandler);

		const urlBefore = page.url();

		const fullText = page.getByRole('listitem', { name: 'Full Text' });
		await expect(fullText).toBeVisible();
		const optionsButton = fullText.getByRole('button', { name: 'Attachment Options' });
		await optionsButton.tap();

		const menuItem = page.getByRole('menuitem', { name: 'Change Parent Item' });
		await expect(menuItem).toBeVisible();
		await menuItem.tap();

		// Wait for the modal to appear and settle
		const modal = page.getByRole('dialog', { name: 'Change Parent Item' });
		await expect(modal).toBeVisible();
		await page.waitForFunction(() =>
			document.querySelector('.change-parent-item-modal')?.classList.contains('ReactModal__Content--after-open')
		);

		// Wait for the slide transition to complete
		await page.waitForTimeout(600);

		// The modal should still be visible
		await expect(modal).toBeVisible();

		// The URL should not have changed -- opening the modal should not navigate
		// to the attachment details view
		expect(page.url()).toBe(urlBefore);

		await page.close();
	});

	test('Add item to a collection using modal', async ({ page, serverPort }, testInfo) => {
		const handlers = [
			makeCustomHandler('/api/users/1/settings/tagColors', { value: [] }),
			makeCustomHandler('/api/users/1/items', []),
		];
		server = await loadFixtureState('mobile-test-user-item-list-view', serverPort, page, handlers);

		// Enter select mode
		if (isSingleColumn(testInfo)) {
			const dropdownToggle = page.locator('.item-actions-touch').first();
			await expect(dropdownToggle).toBeVisible();
			await dropdownToggle.tap();

			const selectItems = page.getByRole('menuitem', { name: 'Select Items' });
			await expect(selectItems).toBeVisible();
			await selectItems.tap();
		} else {
			const selectButton = page.getByRole('button', { name: 'Select', exact: true });
			await expect(selectButton).toBeVisible();
			await selectButton.tap();
		}

		// Select the first item in the list
		const firstItem = page.getByRole('option').first();
		await expect(firstItem).toBeVisible();
		await firstItem.tap();

		// Tap the "Add to Collection" button in the touch footer
		const addToCollectionButton = page.locator('.touch-footer button:has(.icon-add-to-collection)');
		await expect(addToCollectionButton).toBeVisible();
		await addToCollectionButton.tap();

		// Wait for the modal to appear and settle
		const modal = page.getByRole('dialog', { name: 'Select Collection' });
		await expect(modal).toBeVisible();
		await page.waitForFunction(() =>
			document.querySelector('.collection-select-modal')?.classList.contains('ReactModal__Content--after-open')
		);

		// Wait for the slide transition to complete
		await page.waitForTimeout(600);

		// Navigate into "My Library"
		const myLibrary = modal.getByRole('treeitem', { name: 'My Library' });
		await expect(myLibrary).toBeVisible();
		await myLibrary.tap();

		// Navigate into the "Dogs" collection
		// force: true -- Dogs is disabled (items already belong to it) but tapping
		// still navigates into its subcollections in drill-down mode
		const dogs = modal.getByRole('treeitem', { name: 'Dogs' });
		await expect(dogs).toBeVisible();
		await dogs.tap({ force: true });

		// Assert that subcollections are visible
		const borderCollie = modal.getByRole('treeitem', { name: 'Border Collie' });
		await expect(borderCollie).toBeVisible();

		// Pick "Border Collie" as the target collection
		const borderCollieCheckbox = borderCollie.getByRole('checkbox');
		await borderCollieCheckbox.tap();

		// The "Add" button should now be enabled
		const addButton = modal.getByRole('button', { name: 'Add' });
		await expect(addButton).toBeEnabled();

		// Intercept the POST request to verify the item is added to the correct collection
		const requestPromise = page.waitForRequest(
			req => req.url().includes('/api/users/1/items') && req.method() === 'POST'
		);
		await page.route('**/api/users/1/items', route => {
			if (route.request().method() === 'POST') {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						successful: { '0': {} },
						unchanged: {},
						failed: {}
					}),
				});
			} else {
				route.continue();
			}
		});

		await addButton.tap();
		const request = await requestPromise;
		const body = request.postDataJSON();

		// First selected item (HHVQTHFT) should be added to Border Collie (HNLXYCXS)
		// while retaining its existing Dogs (WTTJ2J56) collection
		expect(body[0].key).toBe('HHVQTHFT');
		expect(body[0].collections).toContain('WTTJ2J56');
		expect(body[0].collections).toContain('HNLXYCXS');
		expect(body[0].collections).toHaveLength(2);

		await page.close();
	});
});
