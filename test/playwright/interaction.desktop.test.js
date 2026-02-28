import {test, expect} from "../utils/playwright-fixtures.js";
import {closeServer, loadFixtureState, makeCustomHandler, makeTextHandler} from "../utils/fixed-state-server.js";
import testUserRemoveItemFromCollection from '../fixtures/response/test-user-remove-item-from-collection.json' assert { type: 'json' };
import testUserTrashItem from '../fixtures/response/test-user-trash-item.json' assert { type: 'json' };


test.describe('Desktop Interaction', () => {
	let server;

	test.afterEach(async () => {
		await closeServer(server);
	});

	test('Tabulate through the UI', async ({ page, serverPort }) => {
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page);

		await expect(await page.getByRole('searchbox', { name: 'Title, Creator, Year' })).toBeFocused();

		await page.keyboard.press('Tab');
		await expect(await page.getByRole('treeitem', { name: 'My Library' })).toBeFocused();

		await page.keyboard.press('Tab');
		await expect(await page.getByRole('button', {name: 'Collapse Tag Selector'})).toBeFocused();

		await page.keyboard.press('Tab');
		await expect(await page.getByRole('button', {name: 'cute'})).toBeFocused();

		await page.keyboard.press('Tab');
		await expect(await page.getByRole('searchbox', {name: 'Filter Tags'})).toBeFocused();

		await page.keyboard.press('Tab');
		await expect(await page.getByRole('button', {name: 'New Item'})).toBeFocused();

		await page.keyboard.press('Tab');
		await expect(await page.getByRole('row', {name: 'Effects of diet restriction on life span and age-related changes in dogs'})).toBeFocused();

		await page.keyboard.press('Tab');
		await expect(await page.getByRole('tab', {name: 'Info'})).toBeFocused();

		await page.keyboard.press('Tab');
		await expect(await page.getByRole('combobox', {name: 'Item Type'}).getByRole('textbox')).toBeFocused();

		await page.keyboard.press('Tab');
		await expect(await page.getByRole('textbox', {name: 'Title', exact: true })).toBeFocused();

		await page.keyboard.press('Tab');
		await expect(await page.getByRole('combobox', {name: 'Creator Type'}).first()).toBeFocused();
	});

	test('Tabulate back through the UI', async ({ page, serverPort }) => {
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page);

		await page.getByRole('textbox', {name: 'Title', exact: true}).click();
		await expect(await page.getByRole('textbox', {name: 'Title', exact: true})).toBeFocused();

		await page.keyboard.press('Shift+Tab');
		await expect(await page.getByRole('combobox', {name: 'Item Type'}).getByRole('textbox')).toBeFocused();

		await page.keyboard.press('Shift+Tab');
		await expect(await page.getByRole('tab', {name: 'Info'})).toBeFocused();

		await page.keyboard.press('Shift+Tab');
		await expect(await page.getByRole('row', {name: 'Effects of diet restriction on life span and age-related changes in dogs'})).toBeFocused();

		await page.keyboard.press('Shift+Tab');
		await expect(await page.getByRole('button', {name: 'New Item'})).toBeFocused();

		await page.keyboard.press('Shift+Tab');
		await expect(await page.getByRole('searchbox', {name: 'Filter Tags'})).toBeFocused();

		await page.keyboard.press('Shift+Tab');
		await expect(await page.getByRole('button', {name: 'cute'})).toBeFocused();

		await page.keyboard.press('Shift+Tab');
		await expect(await page.getByRole('button', {name: 'Collapse Tag Selector'})).toBeFocused();

		await page.keyboard.press('Shift+Tab');
		await expect(await page.getByRole('treeitem', {name: 'My Library'})).toBeFocused();

		await page.keyboard.press('Shift+Tab');
		await expect(await page.getByRole('searchbox', {name: 'Title, Creator, Year'})).toBeFocused();
	});

	test('Tabbing back to item details tabs should focus on the last selected tab', async ({ page, serverPort }) => {
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page);

		await page.getByRole('tab', {name: 'Tags'}).click();
		await page.keyboard.press('Tab');
		await expect(page.getByRole('button', {name: 'Add Tag'})).toBeFocused();

		await page.keyboard.press('Shift+Tab');
		await expect(page.getByRole('tab', {name: 'Tags'})).toBeFocused();
	});

	test('Navigate through attachments pane using keyboard', async ({ page, serverPort }) => {
		const handlers = [
			makeTextHandler('/api/users/1/items/37V7V4NT/file/view/url', 'https://files.zotero.net/abcdefgh/18726.html'),
			makeTextHandler('/api/users/1/items/K24TUDDL/file/view/url', 'https://files.zotero.net/abcdefgh/Silver%20-%202005%20-%20Cooperative%20pathfinding.pdf')
		];
		server = await loadFixtureState('desktop-test-user-attachment-in-collection-view', serverPort, page, handlers);

		await page.getByRole('tab', {name: 'Attachments'}).focus();

		await page.keyboard.press('Tab');
		await expect(page.getByLabel('Add File')).toBeFocused();

		await page.keyboard.press('ArrowRight');
		await expect(page.getByRole('button', {name: 'Add Linked URL'})).toBeFocused();

		await page.keyboard.press('Shift+Tab');
		await expect(page.getByRole('tab', {name: 'Attachments'})).toBeFocused();

		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');
		await expect(page.getByRole('listitem', {name: 'Snapshot'})).toBeFocused();

		await page.keyboard.press('ArrowUp');
		await expect(page.getByRole('listitem', {name: 'Full Text'})).toBeFocused();

		await page.keyboard.press('ArrowUp');
		await expect(page.getByLabel('Add File')).toBeFocused();

		await page.keyboard.press('ArrowDown');
		const listItem = page.getByRole('listitem', {name: 'Full Text'});
		await expect(listItem).toBeFocused();

		await page.keyboard.press('ArrowRight');
		await expect(listItem.getByRole('button', {name: 'Open In Reader'})).toBeFocused();

		await page.keyboard.press('ArrowRight');
		await expect(listItem.getByRole('button', {name: 'Export Attachment With Annotations'})).toBeFocused();

		await page.keyboard.press('ArrowRight');
		await expect(listItem.getByRole('button', { name: 'Attachment Options' })).toBeFocused();
	})

	test('Focus management when opening and closing Add Linked URL form', async ({ page, serverPort }) => {
		const handlers = [
			makeTextHandler('/api/users/1/items/37V7V4NT/file/view/url', 'https://files.zotero.net/abcdefgh/18726.html'),
			makeTextHandler('/api/users/1/items/K24TUDDL/file/view/url', 'https://files.zotero.net/abcdefgh/Silver%20-%202005%20-%20Cooperative%20pathfinding.pdf')
		];
		server = await loadFixtureState('desktop-test-user-attachment-in-collection-view', serverPort, page, handlers);

		// Click the "Add Linked URL" button
		const addLinkedUrlButton = page.getByRole('button', { name: 'Add Linked URL' });
		await addLinkedUrlButton.click();

		// Wait for the slide-down animation to complete and the URL input to be visible
		const urlInput = page.locator('#linked-url-form-url');
		await expect(urlInput).toBeVisible();

		// Focus should be on the URL input (autoFocus)
		await expect(urlInput).toBeFocused();

		// Press Escape to close the form
		await page.keyboard.press('Escape');

		// Wait for the exit animation to complete (form unmounts after 500ms transition)
		await expect(urlInput).not.toBeVisible();

		// Focus should return to the "Add Linked URL" button
		await expect(addLinkedUrlButton).toBeFocused();
	});

	test('Navigate through collections tree using keyboard', async ({ page, serverPort }) => {
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page);

		await page.keyboard.press('Tab');
		await expect(page.locator('html')).toHaveClass(/keyboard/);
		await expect(page.getByRole('treeitem', {name: 'My Library'})).toBeFocused();

		await page.keyboard.press('ArrowRight');
		await expect(page.getByRole('button', {name: 'Add Collection'})).toBeFocused();

		await page.keyboard.press('ArrowLeft');
		await page.keyboard.press('ArrowDown');
		await expect(page.getByRole('treeitem', {name: 'AI'})).toBeFocused();
	});

	test('Focus returns to dropdown toggle on Escape in collection tree', async ({ page, serverPort }) => {
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page);

		// Wait for the page to be ready, then tab into the collection tree
		await expect(page.getByRole('searchbox', { name: 'Title, Creator, Year' })).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(page.getByRole('treeitem', { name: 'My Library' })).toBeFocused();
		await page.keyboard.press('ArrowDown');
		await expect(page.getByRole('treeitem', { name: 'AI' })).toBeFocused();

		// ArrowRight to reach the "More" button
		await page.keyboard.press('ArrowRight');
		const moreButton = page.getByTitle('More').first();
		await expect(moreButton).toBeFocused();

		// Open the dropdown with Enter
		await page.keyboard.press('Enter');
		await expect(page.getByRole('menuitem', { name: 'Move Collection' })).toBeVisible();

		// Close the dropdown with Escape
		await page.keyboard.press('Escape');

		// Focus should return to the "More" toggle button
		await expect(moreButton).toBeFocused();
	});

	test('ArrowLeft inside open dropdown closes dropdown and returns focus to tree node', async ({ page, serverPort }) => {
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page);

		// Tab into collection tree, navigate to "AI"
		await expect(page.getByRole('searchbox', { name: 'Title, Creator, Year' })).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(page.getByRole('treeitem', { name: 'My Library' })).toBeFocused();
		await page.keyboard.press('ArrowDown');
		await expect(page.getByRole('treeitem', { name: 'AI' })).toBeFocused();

		// ArrowRight to reach the "More" button
		await page.keyboard.press('ArrowRight');
		await expect(page.getByTitle('More').first()).toBeFocused();

		// Open the dropdown with Enter
		await page.keyboard.press('Enter');
		await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();

		// Press ArrowLeft -- should close dropdown and focus the tree node
		await page.keyboard.press('ArrowLeft');
		await expect(page.getByRole('menuitem', { name: 'Rename' })).not.toBeVisible();
		await expect(page.getByRole('treeitem', { name: 'AI' })).toBeFocused();
	});

	test('ArrowLeft from dropdown toggle moves focus back to tree node', async ({ page, serverPort }) => {
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page);

		// Tab into collection tree, navigate to "AI"
		await expect(page.getByRole('searchbox', { name: 'Title, Creator, Year' })).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(page.getByRole('treeitem', { name: 'My Library' })).toBeFocused();
		await page.keyboard.press('ArrowDown');
		await expect(page.getByRole('treeitem', { name: 'AI' })).toBeFocused();

		// ArrowRight to reach the "More" button (without opening)
		await page.keyboard.press('ArrowRight');
		await expect(page.getByTitle('More').first()).toBeFocused();

		// Press ArrowLeft -- should move focus back to tree node
		await page.keyboard.press('ArrowLeft');
		await expect(page.getByRole('treeitem', { name: 'AI' })).toBeFocused();
	});

	test('Focus returns to collection node after cancelling rename with Escape', async ({ page, serverPort }) => {
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page);

		// Tab into collection tree, navigate to "AI"
		await expect(page.getByRole('searchbox', { name: 'Title, Creator, Year' })).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(page.getByRole('treeitem', { name: 'My Library' })).toBeFocused();
		await page.keyboard.press('ArrowDown');
		await expect(page.getByRole('treeitem', { name: 'AI' })).toBeFocused();

		// ArrowRight to reach the "More" button, open the dropdown
		await page.keyboard.press('ArrowRight');
		await expect(page.getByTitle('More').first()).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();

		// Activate "Rename"
		await page.getByRole('menuitem', { name: 'Rename' }).focus();
		await page.keyboard.press('Enter');

		// The rename input should appear and be focused
		const renameInput = page.getByRole('textbox', { name: 'Rename Collection' });
		await expect(renameInput).toBeVisible();
		await expect(renameInput).toBeFocused();

		// Press Escape to cancel the rename
		await page.keyboard.press('Escape');

		// Focus should return to the collection treeitem
		await expect(page.getByRole('treeitem', { name: 'AI' })).toBeFocused();
	});

	test('Navigate through items table using keyboard', async ({ page, serverPort }) => {
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page);

		await page.getByRole('row', {
			name: 'Effects of diet restriction on life span and age-related changes in dogs'
		}).click();

		await page.keyboard.press('ArrowDown');

		await expect(page.getByRole('row', {
			name: 'Genius of Dogs: Discovering The Unique Intelligence Of Man\'s Best Friend: Amazon.co.uk: Hare, Brian, Woods, Vanessa: 9781780743684: Books'
		})).toBeFocused();

		await page.keyboard.press('ArrowUp');
		await page.keyboard.press('ArrowUp');
		await page.keyboard.press('ArrowUp');

		await expect(page.getByRole('columnheader', {name: 'Title'})).toBeFocused();

		await page.keyboard.press('ArrowRight');

		await expect(page.getByRole('columnheader', {name: 'Creator'})).toBeFocused();
	});

	test('Select multiple items using keyboard', async ({ page, serverPort }) => {
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page);

		await page.getByRole('row', {
			name: 'Effects of diet restriction on life span and age-related changes in dogs'
		}).focus();

		await page.keyboard.down('Shift');
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('ArrowDown');
		await page.keyboard.up('Shift');

		await expect(page.getByRole('row', {selected: true})).toHaveCount(3);
		await expect(page.getByText('3 items selected')).toBeVisible();

		await page.keyboard.down('Shift');
		await page.keyboard.press('ArrowUp');
		await page.keyboard.up('Shift');

		await expect(page.getByRole('row', {selected: true})).toHaveCount(2);
		await expect(page.getByText('2 items selected')).toBeVisible();
	});

	test('Navigate through the toolbar and items table using keyboard', async ({ page, serverPort }) => {
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page);

		await page.getByRole('button', {name: 'New Item'}).focus();

		await page.keyboard.press('ArrowLeft');
		await expect(page.getByRole('button', {name: 'Column Selector'})).toBeFocused();

		await page.keyboard.press('ArrowLeft');
		await expect(page.getByRole('button', {name: 'More'})).toBeFocused();

		await page.keyboard.press('ArrowLeft');
		await expect(page.getByRole('button', {name: 'Create Bibliography'})).toBeFocused();

		await page.keyboard.press('ArrowRight');
		await expect(page.getByRole('button', {name: 'More'})).toBeFocused();
	});

	test('Navigate through navbar using keyboard', async ({ page, serverPort }) => {
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page);

		await page.keyboard.press('ArrowLeft');
		await expect(page.getByRole('button', {name: 'Search Mode'})).toBeFocused();
	});

	test('Navigate through the toolbar in trash view using keyboard', async ({ page, serverPort }) => {
		server = await loadFixtureState('desktop-test-user-trash-view', serverPort, page);

		// Tab through: searchbox -> collection tree -> collapse tag selector -> tag selector -> filter tags -> toolbar
		// In trash view, all toolbar buttons before "More" are disabled (no item selected), so focus lands on "More"
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');
		await expect(page.getByRole('button', {name: 'More'})).toBeFocused();

		await page.keyboard.press('ArrowRight');
		await expect(page.getByRole('button', {name: 'Column Selector'})).toBeFocused();

		await page.keyboard.press('ArrowLeft');
		await expect(page.getByRole('button', {name: 'More'})).toBeFocused();
	});

	test('Navigate through tag selector using keyboard', async ({ page, serverPort }) => {
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page);

		await page.getByRole('button', {name: 'cute'}).focus();
		await page.keyboard.press('ArrowRight');
		await expect(page.getByRole('button', {name: 'to read'})).toBeFocused();
	});

	test('Scrolling collection tree closes open dot menu dropdown', async ({ page, serverPort }) => {
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page);

		// Navigate to "AI" and open its dot menu via keyboard (the "More" button
		// is only visible on hover/:focus-within)
		await page.keyboard.press('Tab');
		await expect(page.getByRole('treeitem', { name: 'My Library' })).toBeFocused();
		await page.keyboard.press('ArrowDown');
		await expect(page.getByRole('treeitem', { name: 'AI' })).toBeFocused();
		await page.keyboard.press('ArrowRight');
		await expect(page.getByTitle('More').first()).toBeFocused();
		await page.keyboard.press('Enter');

		const renameItem = page.getByRole('menuitem', { name: 'Rename' });
		await expect(renameItem).toBeVisible();

		// Scroll the collection tree -- should close the dropdown
		await page.evaluate(() => {
			document.querySelector('nav.collection-tree').dispatchEvent(new Event('scroll'));
		});

		await expect(renameItem).not.toBeVisible();
	});

	test('Dropdown focuses first item on every opening in collection tree', async ({ page, serverPort }) => {
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page);

		// Tab into collection tree, navigate to "AI"
		await expect(page.getByRole('searchbox', { name: 'Title, Creator, Year' })).toBeFocused();
		await page.keyboard.press('Tab');
		await expect(page.getByRole('treeitem', { name: 'My Library' })).toBeFocused();
		await page.keyboard.press('ArrowDown');
		await expect(page.getByRole('treeitem', { name: 'AI' })).toBeFocused();

		// ArrowRight to reach the "More" button
		await page.keyboard.press('ArrowRight');
		const moreButton = page.getByRole('treeitem', { name: 'AI' }).getByTitle('More');
		await expect(moreButton).toBeFocused();

		// First opening: open the dropdown with Enter
		await page.keyboard.press('Enter');
		const renameItem = page.getByRole('menuitem', { name: 'Rename' });
		await expect(renameItem).toBeVisible();
		// The first non-disabled item ("Rename") should be focused
		await expect(renameItem).toBeFocused();

		// Close the dropdown with Escape
		await page.keyboard.press('Escape');
		await expect(renameItem).not.toBeVisible();
		await expect(moreButton).toBeFocused();

		// Second opening: open the dropdown again with Enter
		await page.keyboard.press('Enter');
		await expect(renameItem).toBeVisible();
		// The first non-disabled item ("Rename") should be focused again
		await expect(renameItem).toBeFocused();
	});

	test('Column Selector dropdown focuses first column option', async ({ page, serverPort }) => {
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page);

		// Focus the Column Selector button
		const columnSelector = page.getByRole('button', { name: 'Column Selector' });
		await columnSelector.focus();
		await expect(columnSelector).toBeFocused();

		// Open the dropdown via keyboard
		await page.keyboard.press('Enter');

		// The first menuitemcheckbox (Creator) should be focused
		const creatorOption = page.getByRole('menuitemcheckbox', { name: 'Creator' });
		await expect(creatorOption).toBeVisible();
		await expect(creatorOption).toBeFocused();
	});

	test('Focus remains in toolbar after Remove From Collection', async ({ page, serverPort }) => {
		const handlers = [
			makeCustomHandler('/api/users/1/items', testUserRemoveItemFromCollection),
		];
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page, handlers);

		// Focus the "Remove From Collection" button and activate with Enter
		const removeButton = page.getByRole('button', { name: 'Remove From Collection' });
		await removeButton.focus();
		await expect(removeButton).toBeFocused();
		await page.keyboard.press('Enter');

		// After the item is removed from the collection, the button becomes disabled
		await expect(removeButton).toBeDisabled();

		// Focus should remain within the toolbar, not be lost to the body
		expect(await page.evaluate(() => {
			const toolbar = document.querySelector('[aria-label="items toolbar"]');
			return toolbar?.contains(document.activeElement);
		})).toBe(true);
	});

	test('Focus remains in toolbar after Move To Trash', async ({ page, serverPort }) => {
		const handlers = [
			makeCustomHandler('/api/users/1/items', testUserTrashItem),
		];
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page, handlers);

		// Focus the "Move To Trash" button and activate with Enter
		const trashButton = page.getByRole('button', { name: 'Move To Trash' });
		await trashButton.focus();
		await expect(trashButton).toBeFocused();
		await page.keyboard.press('Enter');

		// After the item is trashed, the button becomes disabled
		await expect(trashButton).toBeDisabled();

		// Focus should remain within the toolbar, not be lost to the body
		expect(await page.evaluate(() => {
			const toolbar = document.querySelector('[aria-label="items toolbar"]');
			return toolbar?.contains(document.activeElement);
		})).toBe(true);
	});

	test('Shift+Tab from note editor iframe should move focus back to notes list', async ({ page, browserName, serverPort }) => {
		// Playwright's Firefox handles iframe focus entry differently than a real
		// browser -- Shift+Tab cycles through internal iframe elements instead of
		// exiting. Verified working manually in Firefox.
		test.skip(browserName === 'firefox', 'Firefox iframe Tab handling differs in Playwright vs real browser');
		server = await loadFixtureState('desktop-test-user-note-view', serverPort, page);

		// Navigate to the Notes tab
		const notesTab = page.getByRole('tab', { name: 'Notes' });
		await notesTab.click();

		// Locate the notes tab panel and its note list
		const notesPanel = page.getByRole('tabpanel', { name: 'Notes' });
		await expect(notesPanel).toBeVisible();
		const notesList = notesPanel.locator('.scroll-container-mouse');
		await expect(notesList).toBeVisible();

		// Select the first note
		const noteItem = notesPanel.locator('.note').first();
		await expect(noteItem).toBeVisible();
		await noteItem.click();

		// Wait for the note editor iframe to appear
		const editorIframe = notesPanel.locator('.rich-editor iframe');
		await expect(editorIframe).toBeVisible();

		// Tab from the notes list into the note editor iframe
		await notesList.focus();
		await expect(notesList).toBeFocused();
		await page.keyboard.press('Tab');

		// The iframe should now be focused
		await expect(editorIframe).toBeFocused();

		// Shift+Tab from the iframe should move focus back to the notes list
		await page.keyboard.press('Shift+Tab');
		await expect(noteItem).toBeFocused();
	});

	test('Shift+Tab from standalone attachment note editor iframe should move focus back to download options', async ({ page, browserName, serverPort }) => {
		test.skip(browserName === 'firefox', 'Firefox iframe Tab handling differs in Playwright vs real browser');
		const handlers = [
			makeTextHandler('/api/users/1/items/UMPPCXU4/file/view/url', 'https://files.zotero.net/abcdefgh/test.pdf')
		];
		server = await loadFixtureState('desktop-test-user-top-level-attachment-view', serverPort, page, handlers);

		// The standalone attachment tab should be active
		const attachmentPanel = page.locator('.tab-pane.standalone-attachment');
		await expect(attachmentPanel).toBeVisible();

		// Wait for the editor iframe to initialize
		const editorIframe = attachmentPanel.locator('.rich-editor iframe');
		await expect(editorIframe).toBeVisible();
		await expect(attachmentPanel.locator('.editor-container.initialized')).toBeVisible();

		// Focus the download options (directly before the iframe), then Tab into it
		const downloadOptions = attachmentPanel.locator('.download-options');
		await downloadOptions.focus();
		await page.keyboard.press('Tab');
		await expect(editorIframe).toBeFocused();

		// Shift+Tab from the iframe should move focus back to the download options
		await page.keyboard.press('Shift+Tab');
		await expect(downloadOptions.getByRole('button', { name: 'Open' })).toBeFocused();
	});
});
