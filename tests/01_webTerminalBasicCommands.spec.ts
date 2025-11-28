import { test as base, expect, chromium } from '@playwright/test';
import { WebTerminalPage } from './helpers/webTerminalHelper';
import { loginOpenShift } from './helpers/loginHelper';
import {LONG_TIMEOUT} from "./helpers/constants";

const test = base.extend<{ page: any }>({
    page: async ({}, use) => {
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();
        await use(page);
    },
});
test.setTimeout(LONG_TIMEOUT);
test.describe.configure({ mode: 'serial'});

test.describe('OpenShift Web Terminal E2E - Sequential', () => {
    let terminal: WebTerminalPage;

    test.beforeAll(async ({ page }) => {
        test.setTimeout(LONG_TIMEOUT);
        console.log('Logging into OpenShift...');
        await loginOpenShift(page, {
            mode: 'admin',
            consoleUrl: process.env.CONSOLE_URL!,
            username: process.env.KUBEADMIN_USERNAME!,
            password: process.env.KUBEADMIN_PASSWORD!,
        });

        terminal = new WebTerminalPage(page);

        console.log('Opening web terminal...');
        await terminal.openWebTerminal(LONG_TIMEOUT);
    });

    test('Run command: oc whoami', async () => {
        const cmd = 'oc whoami';
        const expected = process.env.KUBEADMIN_USERNAME!;
        await terminal.typeAndEnterIntoWebTerminal(cmd);
        await terminal.waitForOutputContains(expected, LONG_TIMEOUT);

        const output = await terminal.getTerminalOutput();
        expect(output).toContain(expected);
    });

    test('Run command: oc get pods', async () => {
        await terminal.typeAndEnterIntoWebTerminal('oc get pods');
        await terminal.waitForOutputContains('NAME', LONG_TIMEOUT);
    });

    test('Verify help command lists all CLI tools', async () => {
        const cmd = 'help';
        const expectedTools = ['kubectl','kustomize','helm','kn','tkn','subctl','virtctl','jq','wtoctl'];

        await terminal.typeAndEnterIntoWebTerminal(cmd);
        await terminal.waitForOutputContains('kubectl', LONG_TIMEOUT);

        const output = await terminal.getTerminalOutput();
        for (const tool of expectedTools) {
            expect(output.includes(tool)).toBe(true);
        }
    });

    test('Run command: which wtoctl', async () => {
        await terminal.typeAndEnterIntoWebTerminal('which wtoctl');
        await terminal.waitForOutputContains('/usr/local/bin/wtoctl', LONG_TIMEOUT);
    });

    test.afterAll(async () => {
        await terminal.close();
    });
});
