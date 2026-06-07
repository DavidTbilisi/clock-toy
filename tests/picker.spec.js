// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('mode + difficulty pickers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('mode picker is visible on load; difficulty + play are hidden', async ({ page }) => {
    await expect(page.locator('#mode-sel')).toBeVisible();
    await expect(page.locator('#diff-sel')).toBeHidden();
    await expect(page.locator('#play')).toBeHidden();
    await expect(page.locator('#mode-pill')).toHaveText('Choose Mode');
  });

  test('renders all four modes with names and descriptions', async ({ page }) => {
    const cards = page.locator('#mode-grid .sel-card');
    await expect(cards).toHaveCount(4);
    await expect(cards.nth(0)).toContainText('Free Play');
    await expect(cards.nth(1)).toContainText('Set the Clock');
    await expect(cards.nth(2)).toContainText('Read the Clock');
    await expect(cards.nth(3)).toContainText('Build from Sliders');
  });

  test('renders all three difficulties after mode pick', async ({ page }) => {
    await page.locator('#mode-grid .sel-card').nth(1).click();  // Set the Clock
    await expect(page.locator('#mode-sel')).toBeHidden();
    await expect(page.locator('#diff-sel')).toBeVisible();

    const diffs = page.locator('#diff-grid .sel-card');
    await expect(diffs).toHaveCount(3);
    await expect(diffs.nth(0)).toContainText('Easy');
    await expect(diffs.nth(1)).toContainText('Medium');
    await expect(diffs.nth(2)).toContainText('Hard');
  });

  test('back button returns to mode picker', async ({ page }) => {
    await page.locator('#mode-grid .sel-card').nth(0).click();
    await expect(page.locator('#diff-sel')).toBeVisible();
    await page.getByRole('button', { name: /Back to modes/ }).click();
    await expect(page.locator('#mode-sel')).toBeVisible();
    await expect(page.locator('#diff-sel')).toBeHidden();
  });

  test('picking mode + difficulty opens play screen with the right pill', async ({ page }) => {
    await page.evaluate(() => pickMode('drill1'));
    await page.evaluate(() => pickDifficulty('medium'));
    await expect(page.locator('#play')).toBeVisible();
    await expect(page.locator('#mode-pill')).toHaveText('Set the Clock · Medium');
  });

  test('drill2/drill3 hide the dice + roll button; free/drill1 show them', async ({ page }) => {
    // drill2 hides
    await page.evaluate(() => { pickMode('drill2'); pickDifficulty('medium'); });
    await expect(page.locator('#dice')).toHaveCSS('visibility', 'hidden');
    await expect(page.locator('#roll-btn')).toHaveCSS('visibility', 'hidden');
    await expect(page.locator('#target-display')).toContainText('Read the clock');

    // free shows
    await page.reload();
    await page.evaluate(() => { pickMode('free'); pickDifficulty('easy'); });
    await expect(page.locator('#dice')).toBeVisible();
    await expect(page.locator('#roll-btn')).toBeVisible();
  });

  test('non-timed mode (free) hides progress + timer + stats', async ({ page }) => {
    await page.evaluate(() => { pickMode('free'); pickDifficulty('easy'); });
    await expect(page.locator('#prog-track')).toBeHidden();
    await expect(page.locator('#timer-wrap')).toBeHidden();
    await expect(page.locator('#stats-row')).toBeHidden();
  });

  test('timed mode (drill1) shows progress + timer + stats', async ({ page }) => {
    await page.evaluate(() => { pickMode('drill1'); pickDifficulty('medium'); });
    await expect(page.locator('#prog-track')).toBeVisible();
    await expect(page.locator('#timer-wrap')).toBeVisible();
    await expect(page.locator('#stats-row')).toBeVisible();
    await expect(page.locator('.pd')).toHaveCount(10);
  });
});
