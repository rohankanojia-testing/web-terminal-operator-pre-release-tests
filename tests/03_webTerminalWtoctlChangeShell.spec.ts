import { test as base, chromium } from '@playwright/test';
import { WebTerminalPage } from './helpers/webTerminalHelper';
import {doOpenShiftLoginAsPerMode} from './helpers/loginHelper';
import {LONG_TIMEOUT, TEST_SETUP_TIMEOUT} from "./helpers/constants";

const test = base.extend<{ page: any }>({
    page: async ({}, use) => {
        const browser = await chromium.launch({ 
            headless: process.env.PLAYWRIGHT_HEADLESS !== 'false' 
        });
        const context = await browser.newContext();
        const page = await context.newPage();
        await use(page);
    },
});

test.describe.configure({ mode: 'serial' }); // sequential
test.setTimeout(TEST_SETUP_TIMEOUT);

test.describe('WTOCTL : Change shell to zsh', () => {
    let terminal: WebTerminalPage;

    test.beforeAll(async ({ page }) => {
        test.setTimeout(TEST_SETUP_TIMEOUT);
        const testMode = process.env.TEST_MODE || 'admin';
        await doOpenShiftLoginAsPerMode(page, testMode);
        terminal = new WebTerminalPage(page);
        await terminal.openWebTerminal(LONG_TIMEOUT);
    });

    test('Set shell to zsh', async ({ page }) => {
        const cmd = 'wtoctl set shell zsh';

        console.log('[STEP 1/4] Command to set shell:', cmd);
        await terminal.typeAndEnterIntoWebTerminal(cmd);

        console.log('[INFO] Checking if terminal closed...');
        const closed = await terminal.waitForTerminalClosed(LONG_TIMEOUT);

        if (closed) {
            console.log('[OK] Terminal closed. Initiating restart...');
            await terminal.waitUntilTerminalIsRestarted(LONG_TIMEOUT);
            console.log('[OK] Terminal restart initiated.');
        } else {
            console.log('[INFO] Terminal did not close. Continuing test...');
        }

        console.log('[STEP 3/4] Verifying new shell by running "echo $SHELL"...');
        await terminal.typeAndEnterIntoWebTerminal('echo $SHELL');

        await terminal.waitForOutputContains('zsh', LONG_TIMEOUT);
        console.log('[OK] Shell verification successful. Current shell is "zsh".');

        console.log('[STEP 4/4] Executing final cleanup command: "oc delete dw --all"...');
        await terminal.typeAndEnterIntoWebTerminal('oc delete dw --all');
        console.log('[OK] Cleanup command executed. Test complete.');
    });

    test.afterAll(async () => {
        await terminal.close();
    });
});

