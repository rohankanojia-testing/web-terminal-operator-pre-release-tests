import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { test as base, expect, chromium } from '@playwright/test';
import { WebTerminalPage } from './helpers/webTerminalHelper';
import {doOpenShiftLoginAsPerMode} from './helpers/loginHelper';
import {LONG_TIMEOUT, TEST_SETUP_TIMEOUT} from "./helpers/constants";
import {OcUtils} from "./helpers/ocUtils";

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

const runOc = promisify(execFile);
const timeoutEnv = 'WEB_TERMINAL_IDLE_TIMEOUT';

test.describe('WTOCTL : Change terminal timeout', () => {
    let terminal: WebTerminalPage;
    let restoreTimeout: (() => Promise<void>) | undefined;

    test.beforeAll(async ({ page }) => {
        test.setTimeout(TEST_SETUP_TIMEOUT);
        await OcUtils.verifyCliUser();
        const testMode = process.env.TEST_MODE || 'admin';
        await doOpenShiftLoginAsPerMode(page, testMode);
        terminal = new WebTerminalPage(page);
        await terminal.openWebTerminal(LONG_TIMEOUT);
    });

    test('WTOCTL : configure terminal timeout', async () => {
        const timeoutValue = '15s';

        const namespace = process.env.WEB_TERMINAL_NAMESPACE;
        if (!namespace) throw new Error('WEB_TERMINAL_NAMESPACE environment variable is not set');

        await terminal.provideInputIntoWebTerminal('printf "\\nTEST_WORKSPACE=%s\\n" "$DEVWORKSPACE_NAME"');
        const workspaceRow = terminal.terminalRows.filter({ hasText: /^TEST_WORKSPACE=[a-z0-9.-]+\s*$/ });
        await expect(workspaceRow).toBeVisible();
        const workspace = (await workspaceRow.innerText()).trim().slice('TEST_WORKSPACE='.length);
        const target = ['devworkspace', workspace, '-n', namespace];
        const readWorkspace = async () => {
            const { stdout } = await runOc('oc', ['get', ...target, '-o', 'json', '--request-timeout=15s']);
            return JSON.parse(stdout);
        };

        const original = await readWorkspace();
        const originalExec = original.spec.template.components.find(
            (component: { name: string }) => component.name === 'web-terminal-exec'
        );
        if (!originalExec?.plugin) throw new Error('Web Terminal exec plugin is missing');
        const previousEnv = originalExec.plugin.components?.[0]?.container?.env;
        const previousTimeout = previousEnv?.find((entry: { name: string }) => entry.name === timeoutEnv);

        restoreTimeout = async () => {
            const current = await readWorkspace();
            expect(current.metadata.uid).toBe(original.metadata.uid);
            const components = current.spec.template.components;
            const index = components.findIndex(
                (component: { name: string }) => component.name === 'web-terminal-exec'
            );
            const overrides = components[index]?.plugin?.components;
            const container = overrides?.[0]?.container;
            const env = container?.env;
            const timeoutIndex = env?.findIndex((entry: { name: string }) => entry.name === timeoutEnv);
            if (timeoutIndex === undefined || timeoutIndex < 0 || env[timeoutIndex].value !== timeoutValue) return;

            const path = `/spec/template/components/${index}/plugin/components`;
            const patch = [
                { op: 'test', path: '/metadata/uid', value: original.metadata.uid },
                { op: 'test', path: '/spec/template/components', value: components },
            ];
            // Build the replacement separately so the patch can still test the original state.
            if (previousTimeout) {
                patch.push({ op: 'replace', path: `${path}/0/container/env/${timeoutIndex}`, value: previousTimeout });
            } else {
                const restoredOverrides = structuredClone(overrides);
                const restoredContainer = restoredOverrides[0].container;
                restoredContainer.env.splice(timeoutIndex, 1);
                if (restoredContainer.env.length === 0 && previousEnv === undefined) delete restoredContainer.env;
                if (Object.keys(restoredContainer).length === 0 && !originalExec.plugin.components?.[0]?.container) {
                    delete restoredOverrides[0].container;
                }
                if (!originalExec.plugin.components?.length && restoredOverrides.length === 1 &&
                    Object.keys(restoredOverrides[0]).length === 1 && overrides[0].name === 'web-terminal-exec') {
                    patch.push(originalExec.plugin.components === undefined
                        ? { op: 'remove', path, value: undefined }
                        : { op: 'replace', path, value: originalExec.plugin.components });
                } else {
                    patch.push({ op: 'replace', path, value: restoredOverrides });
                }
            }
            await runOc('oc', ['patch', ...target, '--type=json', '-p', JSON.stringify(patch), '--request-timeout=15s']);
        };

        console.log(`Setting Web Terminal idle timeout to ${timeoutValue}...`);
        await terminal.typeAndEnterIntoWebTerminal(`wtoctl set timeout ${timeoutValue}`);

        console.log('Waiting for the terminal connection to close...');
        const closed = await terminal.waitForTerminalClosed(LONG_TIMEOUT);

        if (closed) {
            console.log('[OK] Terminal closed successfully, as expected.');
        } else {
            console.log('[FAIL] Terminal did NOT close within the expected timeout.');
        }

        console.log(`[ASSERT] Verifying closure status is "true". Status: ${closed}`);
        expect(closed).toBe(true);
    });

    test.afterAll(async () => {
        try {
            await restoreTimeout?.();
        } finally {
            await terminal?.close();
        }
    });
});
