import { expect, test } from '@playwright/test';

test('star map launches Orbit Tracker', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText("Choose today's mission")).toBeVisible();

  await page.getByRole('button', { name: 'Launch Mission: Orbit Tracker' }).click();

  await expect(page.getByText('Keep the beam locked')).toBeVisible();
  await expect(page.getByLabel('Orbit Tracker game surface')).toBeVisible();
});

test('test lab unlocks and launches Star Jumper', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Unlock Cards' }).click();
  await page.getByRole('button', { name: 'Launch Mission: Star Jumper' }).click();

  await expect(page.getByText('Jump to the red gate')).toBeVisible();
  await expect(page.getByLabel('Star Jumper game surface')).toBeVisible();
});

test('dashboard is available for grown-up review', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Dashboard/i }).click();

  await expect(page.getByText('Progress and exports')).toBeVisible();
  await expect(page.getByText('World Progress')).toBeVisible();
});
