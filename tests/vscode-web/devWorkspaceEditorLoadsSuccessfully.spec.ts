import { test as base, expect, chromium } from '@playwright/test';
import {LONG_TIMEOUT, SHORT_TIMEOUT, TEST_SETUP_TIMEOUT} from "../helpers/constants"; // helper to get DW URL

const test = base.extend<{ page: any }>({
    page: async ({ }, use) => {
        const browser = await chromium.launch({
            headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
        });
        const context = await browser.newContext();
        const page = await context.newPage();
        await use(page);
    },
});
test.setTimeout(TEST_SETUP_TIMEOUT);
test.describe.configure({ mode: 'serial' });


test.describe('DevWorkspace VS Code Web', () => {
    let devworkspaceUrl: string;

    test.beforeAll(async () => {
        devworkspaceUrl = process.env.DEVWORKSPACE_URL!;
        expect(devworkspaceUrl).not.toBeUndefined();
        console.log(`🌍 DevWorkspace URL: ${devworkspaceUrl}`);
    });

    test.beforeEach(async ({ page }) => {
        console.log('🌍 Navigating to DevWorkspace...');
        await page.goto(devworkspaceUrl, {
            waitUntil: 'networkidle',
            timeout: LONG_TIMEOUT,
        });

        console.log('Waiting for trust authors button...');
        const trustButton = page.getByRole('button', {
            name: 'Yes, I trust the authors',
        });

        await trustButton.waitFor({ timeout: LONG_TIMEOUT });

        console.log('Clicking trust authors button...');
        await trustButton.click();
    });


    test('open README and terminal menu', async ({ page }) => {
        await test.step('VS Code Web loads successfully', async () => {
            console.log('🔍 Verifying VS Code workbench is visible...');
            await expect(
                page.locator('.monaco-workbench')
            ).toBeVisible({ timeout: LONG_TIMEOUT });
            console.log('✅ VS Code workbench loaded');

            console.log('🔍 Verifying activity bar is visible...');
            await expect(
                page.locator('.activitybar')
            ).toBeVisible({ timeout: LONG_TIMEOUT });
            console.log('✅ Activity bar is visible');

            console.log('🔍 Verifying status bar is visible...');
            await expect(
                page.locator('.statusbar')
            ).toBeVisible({ timeout: LONG_TIMEOUT });
            console.log('✅ Status bar is visible');
        })

        await test.step('Open README.md', async () => {
            console.log('Opening README.md...');
            const readme = page
                .getByLabel('/projects/web-nodejs-sample/README.md')
                .locator('div')
                .filter({ hasText: /^README\.md$/ });

            await readme.waitFor({ timeout: LONG_TIMEOUT });
            await readme.click();
        });
    });

    test.afterEach(async ({ page }, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            console.log('❌ Test failed, capturing screenshot...');
            await page.screenshot({
                path: `playwright_logs/${testInfo.title}-failure.png`,
                fullPage: true,
            });
        }
    });

    test.afterAll(async () => {
        console.log('✅ DevWorkspace VS Code tests finished');
    });
});
