import {test, expect} from "../utils/playwright-fixtures.js";
import {closeServer, loadFixtureState} from "../utils/fixed-state-server.js";

test.describe('Desktop Layout', () => {
	let server;

	test.afterEach(async () => {
		await closeServer(server);
	});

	test('Items container shrinks when viewport narrows within lg breakpoint', async ({ page, serverPort }) => {
		await page.setViewportSize({ width: 1300, height: 800 });
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page);

		const itemsContainer = page.locator('.items-container');
		const itemDetails = page.locator('.item-details');

		// At 1300px (lg), both items-container and item-details should be visible
		await expect(itemsContainer).toBeVisible();
		await expect(itemDetails).toBeVisible();

		const initialWidth = await itemsContainer.evaluate(el => el.offsetWidth);

		// Shrink to 1200px (still lg)
		await page.setViewportSize({ width: 1200, height: 800 });

		// Items-container should shrink
		const shrunkWidth = await itemsContainer.evaluate(el => el.offsetWidth);
		expect(shrunkWidth).toBeLessThan(initialWidth);

		// Item details should still be fully within the viewport
		const detailsBox = await itemDetails.boundingBox();
		expect(detailsBox.x + detailsBox.width).toBeLessThanOrEqual(1200);
	});

	test('Layout switches from 3-column to 2-column when crossing lg/md breakpoint', async ({ page, serverPort }) => {
		await page.setViewportSize({ width: 1300, height: 800 });
		server = await loadFixtureState('desktop-test-user-item-view', serverPort, page);

		const items = page.locator('section.items');
		const itemsContainer = page.locator('.items-container');
		const itemDetails = page.locator('.item-details');

		// At 1300px (lg): row layout -- items-container and item-details side by side
		let itemsDirection = await items.evaluate(el => getComputedStyle(el).flexDirection);
		expect(itemsDirection).toBe('row');

		// Shrink to 1024px (md): column layout -- items-container and item-details stacked
		await page.setViewportSize({ width: 1024, height: 800 });

		itemsDirection = await items.evaluate(el => getComputedStyle(el).flexDirection);
		expect(itemsDirection).toBe('column');

		// Both should be visible within viewport
		await expect(itemsContainer).toBeVisible();
		await expect(itemDetails).toBeVisible();

		const containerBox = await itemsContainer.boundingBox();
		const detailsBox = await itemDetails.boundingBox();

		// Item details should be below items-container (stacked layout)
		expect(detailsBox.y).toBeGreaterThanOrEqual(containerBox.y + containerBox.height - 1);

		// Item details should be within the viewport
		expect(detailsBox.y + detailsBox.height).toBeLessThanOrEqual(800);
	});
});
