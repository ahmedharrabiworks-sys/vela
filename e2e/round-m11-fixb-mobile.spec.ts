import { test, expect } from '@playwright/test';
test.use({ storageState: 'e2e/.auth/user.json' });
test('FIX B mobile 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.addInitScript(() => localStorage.setItem('vela_last_app_route', '/app'));
  await page.goto('/app');
  await page.getByText('Recent Messages').waitFor({ timeout: 20000 });
  await expect(page.getByText('Loading…')).toHaveCount(0, { timeout: 20000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-output-round-m11/fixb-mobile-375.png', fullPage: true });
});
