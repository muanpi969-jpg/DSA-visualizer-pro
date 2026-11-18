import { expect, test } from '@playwright/test';

for (const slug of ['binary-search', 'bfs']) {
  test(`${slug}: C, JavaScript and Python keep live code highlighting`, async ({ page }, testInfo) => {
    await page.goto(`/visualizers/${slug}/`);
    await expect(page.getByRole('button', { name: 'Next step', exact: true })).toBeEnabled();
    for (const language of ['JavaScript', 'Python', 'C']) {
      const tab = page.getByRole('button', { name: language, exact: true });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('pre code [aria-current="true"]').first()).toBeVisible();
      await page.getByRole('button', { name: 'Next step', exact: true }).click();
      await expect(page.locator('pre code [aria-current="true"]').first()).toBeVisible();
    }
    if (slug === 'binary-search' && testInfo.project.name === 'chromium') {
      await page.getByRole('button', { name: 'Test sound', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Mute audio', exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('c-and-sound.png'), fullPage: true });
    }
  });
}

test('optional editor loads entirely from the static site', async ({ page }) => {
  const remoteRequests: string[] = [];
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== '127.0.0.1') remoteRequests.push(request.url());
  });
  await page.goto('/visualizers/bubble-sort/');
  await expect(page.getByRole('button', { name: 'Next step', exact: true })).toBeEnabled();
  await page.getByRole('switch', { name: 'Rich editor', exact: true }).check();
  await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 20_000 });
  expect(remoteRequests).toEqual([]);
});
