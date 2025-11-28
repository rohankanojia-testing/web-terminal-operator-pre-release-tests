import { test as base, expect, chromium } from '@playwright/test';
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
            mode: process.env.TEST_MODE!,
            consoleUrl: process.env.CONSOLE_URL!,
            username: process.env.KUBEADMIN_USERNAME!,
            password: process.env.KUBEADMIN_PASSWORD!,
        });
        terminal = new WebTerminalPage(page);
        await terminal.openWebTerminal(LONG_TIMEOUT);
    });

    test('WTOCTL : configure terminal timeout', async () => {
        await terminal.typeAndEnterIntoWebTerminal('wtoctl set timeout 15s');
        await terminal.waitForOutputContains('Updated Web Terminal idle timeout to 15s. Terminal may restart', LONG_TIMEOUT);

        const closed = await terminal.waitForTerminalClosed(LONG_TIMEOUT);
        expect(closed).toBe(true);
    });

    test.afterAll(async () => {
        await terminal.close();
    });
});