/*
* @jest-environment ./test/utils/zotero-env.js
*/

import '@testing-library/jest-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { findByRole, getByRole, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from './utils/render';
import { JSONtoState, getPatchedState } from './utils/state';
import { MainZotero } from '../src/js/component/main';
import { applyAdditionalJestTweaks, waitForPosition } from './utils/common';
import stateRaw from './fixtures/state/desktop-test-user-item-view.json';
import testuserAddCollection from './fixtures/response/test-user-add-collection.json';

const state = JSONtoState(stateRaw);

describe('Test User: Collections', () => {
	const handlers = [];
	const server = setupServer(...handlers)
	applyAdditionalJestTweaks();

	beforeAll(() => {
		server.listen({
			onUnhandledRequest: (req) => {
				// https://github.com/mswjs/msw/issues/946#issuecomment-1202959063
				test(`${req.method} ${req.url} is not handled`, () => { });
			},
		});
	});

	beforeEach(() => {
		delete window.location;
		window.location = new URL('http://localhost/testuser/collections/WTTJ2J56/items/VR82JUX8/item-details');
	});

	afterEach(() => server.resetHandlers());
	afterAll(() => server.close());

	test('Add a subcollection using "More" menu', async () => {
		const user = userEvent.setup();
		renderWithProviders(<MainZotero />, { preloadedState: state });
		await waitForPosition();

		const dogsTreeItem = screen.getByRole('treeitem', { name: 'Dogs', expanded: false });
		await user.click(getByRole(dogsTreeItem, 'button', { name: 'More' }));
		const newSubCollectionOpt = await screen.findByRole('menuitem', { name: 'New Subcollection' });
		await user.click(newSubCollectionOpt);

		await screen.findByRole('treeitem', { name: 'Dogs', expanded: true });
		const newCollectionTextBox = await screen.findByRole('textbox', { name: 'New Collection' });
		expect(newCollectionTextBox).toHaveFocus();
		expect(newCollectionTextBox).toHaveValue('');

		let hasBeenPosted = false;
		server.use(
			http.post('https://api.zotero.org/users/1/collections', async ({request}) => {
				const collections = await request.json();
				expect(collections[0].name).toBe('Irish Setter');
				expect(collections[0].parentCollection).toBe('WTTJ2J56');
				hasBeenPosted = true;
				return HttpResponse.json(testuserAddCollection);
			}),
		);

		await user.type(newCollectionTextBox, 'Irish Setter{enter}', { skipClick: true });
		expect(await screen.findByRole('treeitem', { name: 'Irish Setter' })).toBeInTheDocument();
		expect(hasBeenPosted).toBe(true);
	});

	test('Rename a collection using "More" menu', async () => {
		const user = userEvent.setup();
		renderWithProviders(<MainZotero />, { preloadedState: state });
		await waitForPosition();

		const dogsTreeItem = screen.getByRole('treeitem', { name: 'Dogs' });
		await userEvent.click(getByRole(dogsTreeItem, 'button', { name: 'More' }));
		const renameOpt = await findByRole(dogsTreeItem, 'menuitem', { name: 'Rename' });

		// there is a 100ms delay between clicking "Rename" and actually opening the rename box
		await user.click(renameOpt, 'Zotero');
		const renameCollectionBox = await findByRole(dogsTreeItem, 'textbox', { name: 'Rename Collection' }, { timeout: 3000 });
		await waitFor(() => expect(renameCollectionBox).toHaveFocus());
		expect(renameCollectionBox).toHaveValue('Dogs');
		expect(renameCollectionBox.selectionStart).toBe(0);
		expect(renameCollectionBox.selectionEnd).toBe(4);

		let hasBeenPatched = false;
		server.use(
			http.patch('https://api.zotero.org/users/1/collections/WTTJ2J56', async ({request}) => {
				const patch = await request.json();
				expect(patch.name).toBe('Cats');
				hasBeenPatched = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		await user.type(renameCollectionBox, 'Cats{enter}', { skipClick: true });
		expect(await screen.findByRole('treeitem', { name: 'Cats' })).toBeInTheDocument();
		expect(hasBeenPatched).toBe(true);
	});

	test('Rename a collection using double click', async () => {
		const user = userEvent.setup();
		renderWithProviders(<MainZotero />, { preloadedState: state });
		await waitForPosition();

		const dogsTreeItem = screen.getByRole('treeitem', { name: 'Dogs' });
		await user.dblClick(dogsTreeItem);
		const renameCollectionBox = await findByRole(dogsTreeItem, 'textbox', { name: 'Rename Collection' });
		await waitFor(() => expect(renameCollectionBox).toHaveFocus());

		let hasBeenPatched = false;
		server.use(
			http.patch('https://api.zotero.org/users/1/collections/WTTJ2J56', async ({request}) => {
				const patch = await request.json();
				expect(patch.name).toBe('Cats');
				hasBeenPatched = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		await user.type(renameCollectionBox, 'Cats{enter}', { skipClick: true });
		expect(await screen.findByRole('treeitem', { name: 'Cats' })).toBeInTheDocument();
		expect(hasBeenPatched).toBe(true);
	});

	test('Delete a collection using "More" menu', async () => {
		const user = userEvent.setup();
		renderWithProviders(<MainZotero />, { preloadedState: state });
		await waitForPosition();

		const collectionTreeItem = screen.getByRole('treeitem', { name: 'Algorithms' });
		await user.click(getByRole(collectionTreeItem, 'button', { name: 'More' }));
		const deleteOpt = await findByRole(collectionTreeItem, 'menuitem', { name: 'Delete' });

		let hasBeenDeleted = false;
		server.use(
			http.delete('https://api.zotero.org/users/1/collections/CSB4KZUU', async () => {
				hasBeenDeleted = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		await user.click(deleteOpt);
		await waitFor(() => expect(screen.queryByRole('treeitem', { name: 'Algorithms' })).not.toBeInTheDocument());
		expect(hasBeenDeleted).toBe(true);
	});

	test('Move a collection using "More" menu', async () => {
		const user = userEvent.setup();
		renderWithProviders(<MainZotero />, { preloadedState: state });
		await waitForPosition();

		const dogsTreeItem = screen.getByRole('treeitem', { name: 'Dogs', expanded: false });
		await user.click(getByRole(dogsTreeItem, 'button', { name: 'More' }));
		const moveColOpt = await screen.findByRole('menuitem', { name: 'Move Collection' });
		await user.click(moveColOpt);

		const dialog = await screen.findByRole('dialog', { name: 'Select Collection' });
		const myLibrary = getByRole(dialog, 'treeitem', { name: 'My Library' });
		await user.click(getByRole(myLibrary, 'button', { name: 'Expand' }));

		// "Dogs" collection is disabled because it's the current collection
		expect(getByRole(dialog, 'treeitem', { name: 'Dogs' } )).toHaveAttribute('aria-disabled', 'true');

		const musicNode = getByRole(dialog, 'treeitem', { name: 'Algorithms' });
		await userEvent.click(musicNode);

		const moveBtn = getByRole(dialog, 'button', { name: 'Move' });
		expect(moveBtn).toBeEnabled();

		let hasBeenPatched = false;

		server.use(
			http.patch('https://api.zotero.org/users/1/collections/WTTJ2J56', async ({request}) => {
				const patch = await request.json();
				expect(patch.parentCollection).toBe('CSB4KZUU');
				hasBeenPatched = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);

		await userEvent.click(moveBtn);
		expect(hasBeenPatched).toBe(true);
	});

	test('Deleted collection does not appear in the tree', async () => {
		const modifiedState = getPatchedState(state, 'libraries.u1.collections.data.SGQRGR2J', { deleted: 1 });
		renderWithProviders(<MainZotero />, { preloadedState: modifiedState });
		await waitForPosition();
		expect(screen.queryByRole('treeitem', { name: 'Board Games' })).not.toBeInTheDocument();
	});

	test("Non-deleted collection appears in the tree", async () => {
		renderWithProviders(<MainZotero />, { preloadedState: state });
		await waitForPosition();
		expect(screen.queryByRole('treeitem', { name: 'Board Games' })).toBeInTheDocument();
	});

});
