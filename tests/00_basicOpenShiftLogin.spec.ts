import { test as base, chromium } from '@playwright/test';
import { doOpenShiftLoginAsPerMode } from './helpers/loginHelper';
import { LONG_TIMEOUT } from "./helpers/constants";

const test = base.extend<{ page: any }>({
    page: async ({ }, use) => {
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();
        await use(page);
    },
});
test.setTimeout(LONG_TIMEOUT);
test.describe.configure({ mode: 'serial' });

test.skip('OpenShift Basic Login Tests', () => {
    
    test('Login to OpenShift Console as Cluster Admin', async ({ page }) => {
        test.setTimeout(LONG_TIMEOUT);
        console.log('Testing cluster admin login...');
        await doOpenShiftLoginAsPerMode(page, process.env.TEST_MODE || 'admin');
    });

    test.afterAll(async ({ page }) => {
        await page.close();
    });
});


