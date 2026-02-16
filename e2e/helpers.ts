import type { Page } from '@playwright/test';

export async function dismissAnalyticsBanner(page: Page) {
  const decline = page.getByRole('button', { name: '동의하지 않음' });
  if (await decline.isVisible().catch(() => false)) {
    await decline.click();
  }
}
