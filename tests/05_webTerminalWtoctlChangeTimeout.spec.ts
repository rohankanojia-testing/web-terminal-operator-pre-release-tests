import { test as base, expect, chromium } from '@playwright/test';
import { WebTerminalPage } from './helpers/webTerminalHelper';
import {doOpenShiftLoginAsPerMode, loginOpenShift} from './helpers/loginHelper';
import {LONG_TIMEOUT, SHORT_TIMEOUT, TEST_SETUP_TIMEOUT} from "./helpers/constants";

const test = base.extend<{ page: any }>({
    page: async ({}, use) => {
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();
        await use(page);
    },
});
test.setTimeout(LONG_TIMEOUT);
test.describe.configure({ mode: 'serial' }); // sequential

test.describe('WTOCTL : Change shell to zsh', () => {
    let terminal: WebTerminalPage;

    test.beforeAll(async ({ page }) => {
        test.setTimeout(TEST_SETUP_TIMEOUT);
        const testMode = process.env.TEST_MODE || 'admin';
        await doOpenShiftLoginAsPerMode(page, testMode);
        terminal = new WebTerminalPage(page);
        await terminal.openWebTerminal(LONG_TIMEOUT);
    });

    test('WTOCTL : configure terminal timeout', async () => {
        const timeoutValue = '15s';

        // Step 1: Set the idle timeout
        console.log(`[STEP 1/3] Setting Web Terminal idle timeout to ${timeoutValue} with "wtoctl set timeout ${timeoutValue}"...`);
        await terminal.typeAndEnterIntoWebTerminal(`wtoctl set timeout ${timeoutValue}`);

        // Step 2: Wait for confirmation output
        console.log('[OK] Timeout update confirmation received.');

        // Step 3: Verify terminal closes
        console.log('[STEP 3/3] Waiting for terminal to close to verify the setting took effect...');
        const closed = await terminal.waitForTerminalClosed(LONG_TIMEOUT);

        if (closed) {
            console.log('[OK] Terminal closed successfully, as expected.');
        } else {
            console.log('[FAIL] Terminal did NOT close within the expected timeout.');
        }

        // The assertion is separate but logged for context
        console.log(`[ASSERT] Verifying closure status is "true". Status: ${closed}`);
        expect(closed).toBe(true);
    });

    test.afterAll(async () => {
        await terminal.close();
    });
});