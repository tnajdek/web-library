/*
* @jest-environment ./test/utils/zotero-css-env.js
*/
import '@testing-library/jest-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from './utils/render';
import { JSONtoState } from './utils/state';
import { MainZotero } from '../src/js/component/main';
import { applyAdditionalJestTweaks, waitForPosition } from './utils/common';
import stateRaw from './fixtures/state/desktop-test-user-item-view.json';

const state = JSONtoState(stateRaw);

// these tests include styles which makes them very slow
applyAdditionalJestTweaks({ timeout: 240000 });

test('Navigate through collections tree using keyboard', async () => {
	delete window.location;
	window.jsdom.reconfigure({ url: 'http://localhost/testuser/collections/WTTJ2J56/items/VR82JUX8/item-details' });;
	const user = userEvent.setup()
	renderWithProviders(<MainZotero />, { preloadedState: state });
	await waitForPosition();

	await user.keyboard('{tab}');
	await waitFor(() => expect(document.querySelector('html')).toHaveClass('keyboard'));
	await waitFor(() => expect(screen.getByRole('treeitem', { name: 'My Library' })).toHaveFocus());

	// @NOTE: JSDOM/NWSAPI doesn't seem to support :focus-within?
	// 		  https://github.com/dperini/nwsapi/issues/47
	//		  https://github.com/jsdom/jsdom/issues/3055
	// await user.keyboard('{arrowright}');
	// await waitFor(() => expect(screen.getByRole('button', { name: 'Add Collection' })).toHaveFocus());
	// await user.keyboard('{arrowleft}{arrowdown}');

	await user.keyboard('{arrowdown}');
	expect(screen.getByRole('treeitem', { name: 'AI' })).toHaveFocus();
});
