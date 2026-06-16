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

async function expectGameSurfaceHasRoom(
  page: import('@playwright/test').Page,
  label: string,
  minimum = { width: 900, height: 560 },
) {
  const box = await page.getByLabel(label).boundingBox();
  expect(box?.width).toBeGreaterThan(minimum.width);
  expect(box?.height).toBeGreaterThan(minimum.height);
}

async function expectAnswerDeckBelowFlightArea(page: import('@playwright/test').Page) {
  const surface = page.getByLabel('Focus Portal game surface');
  const flightBox = await surface.locator('[data-flight-area="true"]').boundingBox();
  const deckBox = await surface.locator('[data-answer-deck="true"]').boundingBox();

  expect(flightBox).toBeTruthy();
  expect(deckBox).toBeTruthy();
  expect((flightBox?.y ?? 0) + (flightBox?.height ?? 0)).toBeLessThanOrEqual((deckBox?.y ?? 0) + 1);
}

async function expectCanvasHudCopyFits(page: import('@playwright/test').Page, label: string) {
  const surface = page.getByLabel(label);
  const copy = await surface.getAttribute('data-hud-copy');
  const box = await surface.getAttribute('data-hud-box');
  const padding = Number(await surface.getAttribute('data-hud-padding'));

  expect(copy).toBeTruthy();
  expect(box).toBeTruthy();
  expect(Number.isFinite(padding)).toBe(true);

  const [, , width] = box?.split(',').map(Number) ?? [];
  const longestLine = Math.max(...(copy ?? '').split('|').map((line) => line.length));
  const estimatedTextWidth = longestLine * 10;

  expect(width - padding * 2).toBeGreaterThanOrEqual(estimatedTextWidth);
}

async function launchMission(page: import('@playwright/test').Page, missionName: string) {
  await page.getByRole('button', { name: `Launch Mission: ${missionName}` }).click();
  await expect(page.getByRole('button', { name: `Start Mission: ${missionName}` })).toBeVisible();
  await page.getByRole('button', { name: `Start Mission: ${missionName}` }).click();
}

test('star map launches Orbit Tracker', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText("Choose today's mission")).toBeVisible();

  await launchMission(page, 'Orbit Tracker');

  await expect(page.getByText('Keep the beam locked')).toBeVisible();
  const surface = page.getByLabel('Orbit Tracker game surface');
  await expect(surface).toBeVisible();
  await expect(surface).toHaveAttribute('data-hud-copy', 'LOCK + CLICK TO FIRE');
  await expect(surface).toHaveAttribute('data-hud-box', '18,18,250,64');
  await expect(surface).toHaveAttribute('data-hud-padding', '16');
  await expectCanvasHudCopyFits(page, 'Orbit Tracker game surface');
});

test('test lab unlocks and launches Star Jumper', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Unlock Cards' }).click();
  await launchMission(page, 'Star Jumper');

  await expect(page.getByText('Jump to the red gate')).toBeVisible();
  const surface = page.getByLabel('Star Jumper game surface');
  await expect(surface).toBeVisible();
  await expect(surface).toHaveAttribute('data-rule', 'green-origin-red-target');
  await expect(surface).toHaveAttribute('data-decoys', '0');
  await expect(surface).toHaveAttribute('data-hud-copy', 'TAP RED JUMP GATE|START ON GREEN');
  await expect(surface).toHaveAttribute('data-hud-box', '24,22,276,74');
  await expect(surface).toHaveAttribute('data-hud-padding', '20');
  await expectCanvasHudCopyFits(page, 'Star Jumper game surface');
});

test('test lab unlocks and launches Focus Portal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Unlock Cards' }).click();
  await launchMission(page, 'Focus Portal');

  await expect(page.getByText('Stop the crash codes')).toBeVisible();
  const surface = page.getByLabel('Focus Portal game surface');
  await expect(surface).toBeVisible();
  await expect(surface).toHaveAttribute('data-phase', 'incoming');
  await expect(surface).toHaveAttribute('data-options', '3');
  await expect(surface).toHaveAttribute('data-decoys', '3');
  await expect(surface).toHaveAttribute('data-hull', '4');
  await expect(surface).toHaveAttribute('data-stops', '0');
  await expect(surface).toHaveAttribute('data-quick-stops', '0');
  await expectAnswerDeckBelowFlightArea(page);

  const initialScale = Number(await surface.getAttribute('data-target-scale'));
  await expect
    .poll(async () => Number(await surface.getAttribute('data-target-scale')))
    .toBeGreaterThan(initialScale + 1);

  const targetCode = await surface.getAttribute('data-target-code');
  await page.getByRole('button', { name: `Code ${targetCode}` }).click();
  await expect(surface).toHaveAttribute('data-hull', '4');
  await expect(surface).toHaveAttribute('data-stops', '1');
  await expect(surface).toHaveAttribute('data-quick-stops', '1');

  const nextTargetCode = await surface.getAttribute('data-target-code');
  const wrongCode = await surface
    .locator('[data-answer-deck="true"] button')
    .evaluateAll(
      (buttons, target) =>
        buttons.map((button) => button.textContent?.trim() ?? '').find((code) => code !== target),
      nextTargetCode,
    );
  expect(wrongCode).toBeTruthy();
  await page.getByRole('button', { name: `Code ${wrongCode}` }).click();
  await expect(surface).toHaveAttribute('data-hull', '3');
});

test('test lab unlocks and launches Dual-Signal Decoder', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Unlock Cards' }).click();
  await launchMission(page, 'Dual-Signal Decoder');

  await expect(page.getByText('Match both signals')).toBeVisible();
  const surface = page.getByLabel('Dual-Signal Decoder game surface');
  await expect(surface).toBeVisible();
  await expect(surface).toHaveAttribute('data-options', '3');
  await expect(surface).toHaveAttribute('data-shield', '100');
  await expect(surface).toHaveAttribute('data-decoded', '0');

  const targetPair = await surface.getAttribute('data-target-pair');
  await page.getByRole('button', { name: `Signal pair ${targetPair}` }).click();
  await expect(surface).toHaveAttribute('data-decoded', '1');
});

test('dashboard is available for grown-up review', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Dashboard/i }).click();

  await expect(page.getByText('Progress and exports')).toBeVisible();
  await expect(page.getByText('World Progress')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Score Trend' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'CSV' })).toBeVisible();

  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV' }).click();
  await expect((await csvDownload).suggestedFilename()).toContain('nate-o-vision-missions');

  const summaryDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Summary' }).click();
  await expect((await summaryDownload).suggestedFilename()).toContain('nate-o-vision-summary');
});

test('core screens keep clean visual boundaries', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText("Choose today's mission")).toBeVisible();
  await expectCleanViewport(page);

  await launchMission(page, 'Orbit Tracker');
  await expect(page.getByText('Keep the beam locked')).toBeVisible();
  await expectGameSurfaceHasRoom(page, 'Orbit Tracker game surface');
  await expectCanvasHudCopyFits(page, 'Orbit Tracker game surface');
  await expectCleanViewport(page);

  await page.getByRole('button', { name: 'Star Map' }).click();
  await page.getByRole('button', { name: 'Unlock Cards' }).click();
  await launchMission(page, 'Star Jumper');
  await expect(page.getByText('Jump to the red gate')).toBeVisible();
  await expectGameSurfaceHasRoom(page, 'Star Jumper game surface');
  await expectCanvasHudCopyFits(page, 'Star Jumper game surface');
  await expectCleanViewport(page);

  await page.getByRole('button', { name: 'Star Map' }).click();
  await launchMission(page, 'Focus Portal');
  await expect(page.getByText('Stop the crash codes')).toBeVisible();
  await expectGameSurfaceHasRoom(page, 'Focus Portal game surface', { width: 650, height: 560 });
  await expectAnswerDeckBelowFlightArea(page);
  await expectCleanViewport(page);

  await page.getByRole('button', { name: 'Star Map' }).click();
  await launchMission(page, 'Dual-Signal Decoder');
  await expect(page.getByText('Match both signals')).toBeVisible();
  await expectGameSurfaceHasRoom(page, 'Dual-Signal Decoder game surface', {
    width: 650,
    height: 560,
  });
  await expectCleanViewport(page);

  await page.getByRole('button', { name: 'Dashboard' }).click();
  await expect(page.getByText('Progress and exports')).toBeVisible();
  await expectCleanViewport(page);
});
