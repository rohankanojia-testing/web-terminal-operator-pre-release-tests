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

test.describe('WTOCTL : Change PVC storage', () => {
    let terminal: WebTerminalPage;

    test.beforeAll(async ({ page }) => {
        await loginOpenShift(page, {
            mode: 'admin',
            consoleUrl: process.env.CONSOLE_URL!,
            username: 'kubeadmin',
            password: process.env.KUBEADMIN_PASSWORD!,
        });
        terminal = new WebTerminalPage(page);
        await terminal.openWebTerminal(SHORT_TIMEOUT);
        await page.locator('.xterm-rows').waitFor({ timeout: LONG_TIMEOUT });
    });

    test('WTOCTL : configure persistent storage', async () => {
        await terminal.ensureTerminalInitialized(LONG_TIMEOUT);
        await terminal.typeAndEnterIntoWebTerminal('wtoctl set storage');
        await terminal.waitForOutputContains("Enter desired storage size (default: '100Mi'):", LONG_TIMEOUT);
        await terminal.typeAndEnterIntoWebTerminal('200Mi');
        await terminal.waitForOutputContains("Enter desired mount path (default: '/home/user/storage'):", LONG_TIMEOUT);
        await terminal.typeAndEnterIntoWebTerminal('/home/user/storage');
        await terminal.waitForOutputContains('Adding persistent volume with size 200Mi to /home/user/storage. Is this okay? (y/N):', LONG_TIMEOUT);
        await terminal.typeAndEnterIntoWebTerminal('y');
        await terminal.waitForOutputContains('Updated Web Terminal storage. Terminal may restart', LONG_TIMEOUT);

        const closed = await terminal.waitForTerminalClosed(LONG_TIMEOUT);
        if (closed) await terminal.restartTerminal(LONG_TIMEOUT);

        await terminal.typeAndEnterIntoWebTerminal('oc get pvc');
        await terminal.waitForOutputContains('Bound', LONG_TIMEOUT);
        await terminal.typeAndEnterIntoWebTerminal('oc delete dw --all');
    });

    test.afterAll(async () => {
        await terminal.close();
    });
});

