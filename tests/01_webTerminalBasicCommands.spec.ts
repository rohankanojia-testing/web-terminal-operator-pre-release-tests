import { test as base, expect, chromium } from '@playwright/test';
import { WebTerminalPage } from './helpers/webTerminalHelper';
import { doOpenShiftLoginAsPerMode } from './helpers/loginHelper';
import {LONG_TIMEOUT, TEST_SETUP_TIMEOUT} from "./helpers/constants";

const test = base.extend<{ page: any }>({
    page: async ({ }, use) => {
        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext();
        const page = await context.newPage();
        await use(page);
    },
});
test.setTimeout(LONG_TIMEOUT);
test.describe.configure({ mode: 'serial' });

test.describe('OpenShift Web Terminal E2E - Sequential', () => {
    let terminal: WebTerminalPage;

    test.beforeAll(async ({ page }) => {
        test.setTimeout(TEST_SETUP_TIMEOUT);
        const testMode = process.env.TEST_MODE || 'admin';
        await doOpenShiftLoginAsPerMode(page, testMode);

        terminal = new WebTerminalPage(page);

        console.log('Opening web terminal...');
        await terminal.openWebTerminal(LONG_TIMEOUT);
    });

    test('Run command: oc whoami', async () => {
        const cmd = 'oc whoami';
        let expected = process.env.KUBEADMIN_USERNAME!;
        if (expected === 'kubeadmin') {
            expected = 'kube:admin';
        }

        await terminal.typeAndEnterIntoWebTerminal(cmd);
        await terminal.waitForOutputContains(expected, LONG_TIMEOUT);

        const output = await terminal.getTerminalOutput();
        expect(output).toContain(expected);
        console.log(`[OK] oc whoami works`);
    });


    test('Run command: oc get pods', async () => {
        await terminal.typeAndEnterIntoWebTerminal('oc get pods');
        await terminal.waitForOutputContains('NAME', LONG_TIMEOUT);
        console.log(`[OK] oc get pods works`);
    });

    test('Verify help command lists all CLI tools', async () => {
        const cmd = 'help';
        const expectedTools = ['Installed tools:', 'kubectl', 'kustomize',/*'helm',*/'kn',/*'tkn'*/, 'subctl', 'virtctl', 'jq', 'wtoctl'];

        await terminal.typeAndEnterIntoWebTerminal(cmd);
        await terminal.waitForOutputContains('kubectl', LONG_TIMEOUT);

        // Wait until terminal output contains all expected tools
        const output = (await terminal.getTerminalOutput()) || '';
        console.log("=========================================");
        console.log("🚀 Help Command Output Start");
        console.log("=========================================");
        console.log(output);
        console.log("=========================================");
        console.log("🚀 Help Command Output End");
        console.log("=========================================");

        for (const tool of expectedTools) {
            if (!tool) continue; // skip undefined tools
            const found = output.includes(tool);
            if (!found) {
                console.warn(`⚠ Tool "${tool}" not found in terminal output.`);
            } else {
                console.log(`[OK] Tool ${tool} found in terminal output.`);
            }
            expect(found).toBe(true);
        }
    });

    test('Run command: which wtoctl', async () => {
        await terminal.typeAndEnterIntoWebTerminal('which wtoctl');
        await terminal.waitForOutputContains('/usr/local/bin/wtoctl', LONG_TIMEOUT);
        console.log(`[OK] wtoctl present in terminal`);
    });

    test.afterAll(async () => {
        await terminal.close();
    });
});
