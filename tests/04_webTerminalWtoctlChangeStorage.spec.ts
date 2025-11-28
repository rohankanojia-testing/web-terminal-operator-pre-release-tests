import { test as base, chromium } from '@playwright/test';
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
        await terminal.typeAndEnterIntoWebTerminal('wtoctl set storage');

        console.log('[STEP 2/7] Waiting for prompt to enter desired storage size...');
        await terminal.waitForOutputContains("Enter desired storage size (default: '100Mi'):", LONG_TIMEOUT);
        console.log('[INFO] Setting storage size to 200Mi.');
        await terminal.typeAndEnterIntoWebTerminal('200Mi');

        // Step 2: Set mount path
        console.log('[STEP 3/7] Waiting for prompt to enter desired mount path...');
        await terminal.waitForOutputContains("Enter desired mount path (default: '/home/user/storage'):", LONG_TIMEOUT);
        console.log('[INFO] Setting mount path to /home/user/storage.');
        await terminal.typeAndEnterIntoWebTerminal('/home/user/storage');

        // Step 3: Confirm configuration
        console.log('[STEP 4/7] Waiting for confirmation prompt...');
        await terminal.waitForOutputContains('Adding persistent volume with size 200Mi to /home/user/storage. Is this okay? (y/N):', LONG_TIMEOUT);
        console.log('[INFO] Confirming configuration with "y".');
        await terminal.typeAndEnterIntoWebTerminal('y');

        // Step 4: Wait for update confirmation
        console.log('[STEP 5/7] Waiting for Web Terminal update confirmation...');
        await terminal.waitForOutputContains('Updated Web Terminal storage. Terminal may restart', LONG_TIMEOUT);
        console.log('[OK] Storage update confirmation received.');

        // Step 5: Handle terminal restart
        console.log('[INFO] Checking if terminal closed for restart...');
        const closed = await terminal.waitForTerminalClosed(LONG_TIMEOUT);
        if (closed) {
            console.log('[OK] Terminal closed. Initiating restart...');
            await terminal.restartTerminal(LONG_TIMEOUT);
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

