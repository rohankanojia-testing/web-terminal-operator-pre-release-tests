import { test as base, chromium } from '@playwright/test';
import { WebTerminalPage } from './helpers/webTerminalHelper';
import { loginOpenShift } from './helpers/loginHelper';
import {LONG_TIMEOUT, SHORT_TIMEOUT} from "./helpers/constants";

const test = base.extend<{ page: any }>({
    page: async ({}, use) => {
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();
        await use(page);
    },
});

test.describe.configure({ mode: 'serial' }); // sequential

test.describe('WTOCTL : Change ', () => {
    let terminal: WebTerminalPage;

    test.beforeAll(async ({ page }) => {
        await loginOpenShift(page, {
            mode: 'admin',
            consoleUrl: process.env.CONSOLE_URL!,
            username: process.env.KUBEADMIN_USERNAME!,
            password: process.env.KUBEADMIN_PASSWORD!,
        });
        terminal = new WebTerminalPage(page);
        await terminal.openWebTerminal(SHORT_TIMEOUT);
        await page.locator('.xterm-rows').waitFor({ timeout: 60000 });
    });


    test('Set tooling image', async () => {
        await terminal.typeAndEnterIntoWebTerminal('wtoctl set image quay.io/aobuchow/wto-tooling:prerelease-test-image');
        await terminal.waitForOutputContains(
            'Updated Web Terminal image to quay.io/aobuchow/wto-tooling:prerelease-test-image. Terminal may restart.',
            LONG_TIMEOUT
        );

        console.log('waiting for terminal to close');
        const closed = await terminal.waitForTerminalClosed(LONG_TIMEOUT);
        if (closed) {
            console.log('Terminal closed');
            console.log('waiting for terminal to restart');
            await terminal.restartTerminal(LONG_TIMEOUT);
        }

        await terminal.typeAndEnterIntoWebTerminal('echo $SHELL');
        await terminal.waitForOutputContains('fish', LONG_TIMEOUT);
        await terminal.typeAndEnterIntoWebTerminal('oc delete dw --all');
    });


    test.afterAll(async () => {
        await terminal.close();
    });
});
