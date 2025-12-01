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

test.describe('WTOCTL : Change PVC storage', () => {
    let terminal: WebTerminalPage;

    test.beforeAll(async ({ page }) => {
        const testMode = process.env.TEST_MODE || 'admin';
        test.setTimeout(TEST_SETUP_TIMEOUT);
        await doOpenShiftLoginAsPerMode(page, testMode);
        terminal = new WebTerminalPage(page);
        await terminal.openWebTerminal(LONG_TIMEOUT);
    });

    test('WTOCTL : configure persistent storage', async () => {
        // Step 1: Start storage configuration and set size
        console.log('[STEP 1/7] Starting persistent storage configuration with "wtoctl set storage"...');
        await terminal.provideInputIntoWebTerminal('wtoctl set storage');

        console.log('[INFO] Setting storage size to 200Mi.');
        await terminal.provideInputIntoWebTerminal('200Mi');

        // Step 2: Set mount path
        console.log('[INFO] Setting mount path to /home/user/storage.');
        await terminal.provideInputIntoWebTerminal('/home/user/storage');

        // Step 3: Confirm configuration
        console.log('[INFO] Confirming configuration with "y".');
        await terminal.provideInputIntoWebTerminal('y');

        // Step 5: Handle terminal restart
        console.log('[INFO] Checking if terminal closed for restart...');
        const closed = await terminal.waitForTerminalClosed(LONG_TIMEOUT);
        if (closed) {
            console.log('[OK] Terminal closed. Initiating restart...');
            await terminal.waitUntilTerminalIsRestarted(LONG_TIMEOUT);
            console.log('[OK] Terminal restart initiated.');
        } else {
            console.log('[INFO] Terminal did not close. Continuing test...');
        }

        // Step 6: Verify Persistent Volume Claim (PVC) creation
        console.log('[STEP 6/7] Verifying Persistent Volume Claim (PVC) status using "oc get pvc"...');
        await terminal.typeAndEnterIntoWebTerminal('oc get pvc');
        await terminal.waitForOutputContains('Bound', LONG_TIMEOUT);
        console.log('[OK] PVC verified as "Bound". Persistent storage configured successfully.');

        // Step 7: Final Cleanup
        console.log('[STEP 7/7] Executing final cleanup command: "oc delete dw --all"...');
        await terminal.typeAndEnterIntoWebTerminal('oc delete dw --all');
        console.log('[OK] Cleanup command executed. Test complete.');
    });

    test.afterAll(async () => {
        await terminal.close();
    });
});

