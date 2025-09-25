/*
* @jest-environment ./test/utils/zotero-css-env.js
*/
import '@testing-library/jest-dom';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from './utils/render';
import { JSONtoState } from './utils/state';
import { MainZotero } from '../src/js/component/main';
import { applyAdditionalJestTweaks, waitForPosition } from './utils/common';
import stateRaw from './fixtures/state/desktop-test-user-item-view.json';

const state = JSONtoState(stateRaw);

// these tests include styles which makes them very slow
applyAdditionalJestTweaks({ timeout: 240000 });

test('Navigate through items table using keyboard', async () => {
	delete window.location;
	window.jsdom.reconfigure({ url: 'http://localhost/testuser/collections/WTTJ2J56/items/VR82JUX8/item-details' });;
	const user = userEvent.setup()
	renderWithProviders(<MainZotero />, { preloadedState: state });
	await waitForPosition();

	act(() => screen.getByRole('row',
		{ name: 'Effects of diet restriction on life span and age-related changes in dogs' }
		).focus()
	);

	await user.keyboard('{arrowdown}');

	expect(
		screen.getByRole('row', { name: 'Genius of Dogs: Discovering The Unique Intelligence Of Man\'s Best Friend: Amazon.co.uk: Hare, Brian, Woods, Vanessa: 9781780743684: Books' })
	).toHaveFocus();

	await user.keyboard('{arrowup}{arrowup}{arrowup}');

	expect(
		screen.getByRole('columnheader', { name: 'Title' })
	).toHaveFocus();

	await user.keyboard('{arrowright}');

	expect(
		screen.getByRole('columnheader', { name: 'Creator' })
	).toHaveFocus();
});
