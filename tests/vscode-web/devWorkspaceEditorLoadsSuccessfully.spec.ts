import { test as base, expect, chromium } from '@playwright/test';
import {LONG_TIMEOUT, TEST_SETUP_TIMEOUT} from "../helpers/constants"; // helper to get DW URL

const test = base.extend<{ page: any }>({
    page: async ({ }, use) => {
        const browser = await chromium.launch({
            headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
        });
        const context = await browser.newContext({ ignoreHTTPSErrors: true });
        const page = await context.newPage();
        await use(page);
        await context.close();
        await browser.close();
    },
});

async function tryClickButton(page: import('@playwright/test').Page, name: string | RegExp) {
    const button = page.getByRole('button', { name });
    try {
        await button.waitFor({ state: 'visible', timeout: 5000 });
        console.log(`Clicking "${name}"...`);
        await button.click();
        await page.waitForTimeout(1000);
        return true;
    } catch {
        return false;
    }
}

async function hasBlockingStartupDialog(page: import('@playwright/test').Page) {
    if (await page.locator('.onboarding-a-overlay.visible').isVisible().catch(() => false)) {
        return true;
    }

    for (const name of ['Continue without Signing In', 'Skip', 'Yes, I trust the authors']) {
        if (await page.getByRole('button', { name }).isVisible().catch(() => false)) {
            return true;
        }
    }

    return false;
}

async function dismissStartupDialogs(page: import('@playwright/test').Page) {
    const dialogButtons: Array<string | RegExp> = [
        'Continue without Signing In',
        'Skip',
        'Yes, I trust the authors',
    ];
    const deadline = Date.now() + LONG_TIMEOUT;

    while (Date.now() < deadline) {
        let dismissedAny = false;

        for (const name of dialogButtons) {
            if (await tryClickButton(page, name)) {
                dismissedAny = true;
            }
        }

        if (!await hasBlockingStartupDialog(page)) {
            await page.waitForTimeout(2000);
            if (!await hasBlockingStartupDialog(page)) {
                return;
            }
        }

        if (!dismissedAny) {
            await page.waitForTimeout(2000);
        }
    }

    throw new Error('Timed out dismissing VS Code startup dialogs');
}
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
            waitUntil: 'domcontentloaded',
            timeout: LONG_TIMEOUT,
        });

        await page.locator('.monaco-workbench').waitFor({ timeout: LONG_TIMEOUT });
        await dismissStartupDialogs(page);
        await expect(page.locator('.monaco-workbench')).toBeVisible({ timeout: LONG_TIMEOUT });
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
            await dismissStartupDialogs(page);
            const readme = page.getByRole('treeitem', { name: 'README.md' });
            await readme.waitFor({ timeout: LONG_TIMEOUT });
            await readme.click();
            await expect(page.getByRole('tab', { name: /README\.md/ })).toBeVisible({ timeout: LONG_TIMEOUT });
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
