import { expect, test } from '@playwright/test';

async function expectCleanViewport(page: import('@playwright/test').Page) {
  const layout = await page.evaluate(() => {
    const root = document.documentElement;
    const viewportWidth = root.clientWidth;
    const viewportHeight = root.clientHeight;
    const overflowing = [...document.querySelectorAll('body *')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          tag: element.tagName.toLowerCase(),
          text: (element.textContent ?? '').trim().slice(0, 60),
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          display: style.display,
          visibility: style.visibility,
          position: style.position,
        };
      })
      .filter(
        (item) =>
          item.text.length > 0 &&
          item.display !== 'none' &&
          item.visibility !== 'hidden' &&
          item.position !== 'fixed' &&
          item.right > viewportWidth + 1,
      )
      .slice(0, 5);

    return {
      documentOverflow: root.scrollWidth - viewportWidth,
      viewportHeight,
      viewportWidth,
      overflowing,
    };
  });

  expect(layout.documentOverflow).toBeLessThanOrEqual(1);
  expect(layout.overflowing).toEqual([]);
}

async function expectGameSurfaceHasRoom(page: import('@playwright/test').Page, label: string) {
  const box = await page.getByLabel(label).boundingBox();
  expect(box?.width).toBeGreaterThan(900);
  expect(box?.height).toBeGreaterThan(560);
}

test('star map launches Orbit Tracker', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText("Choose today's mission")).toBeVisible();

  await page.getByRole('button', { name: 'Launch Mission: Orbit Tracker' }).click();

  await expect(page.getByText('Keep the beam locked')).toBeVisible();
  const surface = page.getByLabel('Orbit Tracker game surface');
  await expect(surface).toBeVisible();
  await expect(surface).toHaveAttribute('data-hud-copy', 'LOCK + CLICK TO FIRE');
});

test('test lab unlocks and launches Star Jumper', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Unlock Cards' }).click();
  await page.getByRole('button', { name: 'Launch Mission: Star Jumper' }).click();

  await expect(page.getByText('Jump to the red gate')).toBeVisible();
  const surface = page.getByLabel('Star Jumper game surface');
  await expect(surface).toBeVisible();
  await expect(surface).toHaveAttribute('data-rule', 'green-origin-red-target');
  await expect(surface).toHaveAttribute('data-decoys', '0');
});

test('dashboard is available for grown-up review', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Dashboard/i }).click();

  await expect(page.getByText('Progress and exports')).toBeVisible();
  await expect(page.getByText('World Progress')).toBeVisible();
});

test('core screens keep clean visual boundaries', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText("Choose today's mission")).toBeVisible();
  await expectCleanViewport(page);

  await page.getByRole('button', { name: 'Launch Mission: Orbit Tracker' }).click();
  await expect(page.getByText('Keep the beam locked')).toBeVisible();
  await expectGameSurfaceHasRoom(page, 'Orbit Tracker game surface');
  await expectCleanViewport(page);

  await page.getByRole('button', { name: 'Star Map' }).click();
  await page.getByRole('button', { name: 'Unlock Cards' }).click();
  await page.getByRole('button', { name: 'Launch Mission: Star Jumper' }).click();
  await expect(page.getByText('Jump to the red gate')).toBeVisible();
  await expectGameSurfaceHasRoom(page, 'Star Jumper game surface');
  await expectCleanViewport(page);

  await page.getByRole('button', { name: 'Dashboard' }).click();
  await expect(page.getByText('Progress and exports')).toBeVisible();
  await expectCleanViewport(page);
});
