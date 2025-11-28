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

test.setTimeout(LONG_TIMEOUT);
test.describe.configure({ mode: 'serial' }); // sequential

test.describe('WTOCTL : Change shell to zsh', () => {
    let terminal: WebTerminalPage;

    test.beforeAll(async ({ page }) => {
        test.setTimeout(LONG_TIMEOUT);
        await loginOpenShift(page, {
            mode: 'admin',
            consoleUrl: process.env.CONSOLE_URL!,
            username: process.env.KUBEADMIN_USERNAME!,
            password: process.env.KUBEADMIN_PASSWORD!,
        });
        terminal = new WebTerminalPage(page);
        await terminal.openWebTerminal(LONG_TIMEOUT);
    });

    test('Set shell to zsh', async ({ page }) => {
        const cmd = 'wtoctl set shell zsh';
        const expected = 'Updated Web Terminal shell to zsh. Terminal may restart.';

        await terminal.typeAndEnterIntoWebTerminal(cmd);
        await terminal.waitForOutputContains(expected, LONG_TIMEOUT);

        const closed = await terminal.waitForTerminalClosed(LONG_TIMEOUT);
        if (closed) {
            await terminal.restartTerminal(LONG_TIMEOUT);
        }

        await terminal.typeAndEnterIntoWebTerminal('echo $SHELL');
        await terminal.waitForOutputContains('zsh', LONG_TIMEOUT);

        await terminal.typeAndEnterIntoWebTerminal('oc delete dw --all');
    });

    test.afterAll(async () => {
        await terminal.close();
    });
});

