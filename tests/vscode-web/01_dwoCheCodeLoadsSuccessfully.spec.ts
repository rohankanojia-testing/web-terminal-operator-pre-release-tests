import { test as base, expect, chromium } from '@playwright/test';
import {LONG_TIMEOUT, SHORT_TIMEOUT, TEST_SETUP_TIMEOUT} from "../helpers/constants"; // helper to get DW URL

const test = base.extend<{ page: any }>({
    page: async ({ }, use) => {
        const browser = await chromium.launch({
            headless: false,
        });
        const context = await browser.newContext();
        const page = await context.newPage();
        await use(page);
    },
});
test.setTimeout(TEST_SETUP_TIMEOUT);
test.describe.configure({ mode: 'serial' });


test('DevWorkspace VS Code UI loads', async ({ page }) => {
    const browser = await chromium.launch({ headless: false });
    const devworkspaceUrl = process.env.DEVWORKSPACE_URL!;
    expect(devworkspaceUrl).not.toBeUndefined();
    console.log(`🌍 Navigating to DevWorkspace URL: ${devworkspaceUrl}`);
    await page.goto(devworkspaceUrl, { waitUntil: 'networkidle' });
    // wait for page to load
    await page.getByRole('button', { name: 'Yes, I trust the authors' }).click();
    // const trustButton = page.getByRole('button', { name: 'Yes, I trust the authors' });
    // if (await trustButton.waitFor({ state: 'visible', timeout: LONG_TIMEOUT }).catch(() => null)) {
    //     console.log('🔐 Trust authors popup detected, clicking...');
    //     await trustButton.click();
    // } else {
    //     console.log('ℹ️ Trust authors popup not present');
    // }

    await page.locator('.menubar-menu-title').click();
    // await page.getByRole('menuitem', { name: 'New Terminal (Select a' }).click();
    // await page.locator('.terminal-widget-container').click();
    // await page.getByRole('textbox', { name: 'Terminal 1, dev container Run' }).fill(' ');

    await browser.close();
});
