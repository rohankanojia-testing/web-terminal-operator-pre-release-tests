import { test as base, chromium } from '@playwright/test';
import { WebTerminalPage } from './helpers/webTerminalHelper';
import {doOpenShiftLoginAsPerMode} from './helpers/loginHelper';
import {LONG_TIMEOUT, TEST_SETUP_TIMEOUT} from "./helpers/constants";

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

test.describe('WTOCTL : Change ', () => {
    let terminal: WebTerminalPage;

    test.beforeAll(async ({ page }) => {
        test.setTimeout(TEST_SETUP_TIMEOUT);
        await doOpenShiftLoginAsPerMode(page, process.env.TEST_MODE || 'admin');
        terminal = new WebTerminalPage(page);
        await terminal.openWebTerminal(LONG_TIMEOUT);
    });

    test('Set tooling image', async () => {
        // 1. Initial Action and Verification
        console.log('[STEP 1/5] Typing and entering command to set tooling image...');
        await terminal.typeAndEnterIntoWebTerminal('wtoctl set image quay.io/aobuchow/wto-tooling:prerelease-test-image');

        // 2. Terminal Close and Restart Logic
        console.log('[STEP 3/5] Waiting for terminal to close...');
        const closed = await terminal.waitForTerminalClosed(LONG_TIMEOUT);

        if (closed) {
            console.log('[OK] Terminal closed successfully.');
            console.log('[INFO] Waiting for terminal to restart...');
            await terminal.waitUntilTerminalIsRestarted(LONG_TIMEOUT);
            console.log('[OK] Terminal restart initiated.');
        } else {
            console.log('[WARN] Terminal did not close within the specified timeout.');
            // Consider throwing an error here if closing is mandatory: throw new Error('Terminal failed to close after image update.');
        }

        // 3. Post-Restart Verification
        console.log('[STEP 4/5] Verifying the shell environment after restart by running "echo $SHELL"...');
        await terminal.typeAndEnterIntoWebTerminal('echo $SHELL');

        await terminal.waitForOutputContains('fish', LONG_TIMEOUT);
        console.log('[OK] Shell environment successfully verified as "fish".');

        // 4. Final Cleanup
        console.log('[STEP 5/5] Executing final cleanup command: "oc delete dw --all"...');
        await terminal.typeAndEnterIntoWebTerminal('oc delete dw --all');
        console.log('[OK] Cleanup command executed.');
    });


    test.afterAll(async () => {
        await terminal.close();
    });
});
