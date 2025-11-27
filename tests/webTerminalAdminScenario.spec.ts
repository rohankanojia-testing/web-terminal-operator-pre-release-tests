import { test, expect, Page } from '@playwright/test';
import { WebTerminalPage } from './helpers/webTerminalHelper';
import { loginOpenShift } from './helpers/loginHelper';

const CONSOLE_URL = process.env.CONSOLE_URL!;
const ADMIN_PASS = process.env.KUBEADMIN_PASSWORD!;

test.describe('OpenShift Web Terminal E2E - Nested Commands', () => {
  let terminal: WebTerminalPage;

  test.beforeEach(async ({ page }) => {
    // 1️⃣ Login as admin
    await loginOpenShift(page, {
      mode: 'admin',
      consoleUrl: CONSOLE_URL,
      username: 'kubeadmin',
      password: ADMIN_PASS,
    });

    // 2️⃣ Initialize terminal
    terminal = new WebTerminalPage(page);

    // 3️⃣ Open terminal
    await terminal.openWebTerminal('openshift-terminal');
  });

  test('Run command: oc whoami', async ({ page }) => {
    const cmd = 'oc whoami';
    const expected = 'kubeadmin';

    await terminal.typeAndEnterIntoWebTerminal(cmd);
    await terminal.waitForOutputContains(expected);

    const output = await terminal.getTerminalOutput();
    console.log(`[${cmd}] output:\n`, output);
    expect(output).toContain(expected);
  });

  test('Run command: oc get pods', async ({ page }) => {
    const cmd = 'oc get pods';
    const expected = 'NAME';

    await terminal.typeAndEnterIntoWebTerminal(cmd);
    await terminal.waitForOutputContains(expected, 10000);

    const output = await terminal.getTerminalOutput();
    console.log(`[${cmd}] output:\n`, output);
    expect(output).toContain(expected);
  });

  test('Verify help command lists all CLI tools', async () => {
    const cmd = 'help';
    const expectedTools = [
      'kubectl',
      'kustomize',
      'helm',
      'kn',
      'tkn',
      'subctl',
      'virtctl',
      'jq',
      'wtoctl'
    ];

    // Run help command
    await terminal.typeAndEnterIntoWebTerminal(cmd);

    // Wait for terminal to show at least some output
    await terminal.waitForOutputContains('kubectl', 10000);

    // Get full terminal output
    const output = await terminal.getTerminalOutput();
    console.log('--- Help command output ---\n', output, '\n---------------------------');

    // Verify each expected tool is present
    for (const tool of expectedTools) {
      const found = output.includes(tool);
      console.log(`Checking tool "${tool}" -> ${found ? 'OK' : 'MISSING'}`);
      expect(found).toBe(true);
    }
  });

  test('Run command: which wtoctl', async ({ page }) => {
    const cmd = 'which wtoctl';
    const expected = '/usr/local/bin/wtoctl';

    await terminal.typeAndEnterIntoWebTerminal(cmd);
    await terminal.waitForOutputContains(expected, 10000);

    const output = await terminal.getTerminalOutput();
    console.log(`[${cmd}] output:\n`, output);
    expect(output).toContain(expected);
  });

  // test('Change shell to zsh', async ({ page }) => {
  //   console.log('Setting shell to zsh...');
  //   await terminal.typeAndEnterIntoWebTerminal('wtoctl set shell zsh');
  //   await terminal.waitTerminalInactivity();
  //
  //   // console.log('Deleting all DevWorkspaces...');
  //   // await terminal.typeAndEnterIntoWebTerminal('oc delete dw --all');
  //   await terminal.waitTerminalIsStarted();
  //
  //   console.log('Verifying shell is zsh...');
  //   await terminal.typeAndEnterIntoWebTerminal('echo $SHELL');
  //   await terminal.waitForOutputContains('zsh');
  // });

  // test('Change web terminal tooling image', async ({ page }) => {
  //   console.log('Setting tooling container image...');
  //   await terminal.typeAndEnterIntoWebTerminal('wtoctl set image quay.io/aobuchow/wto-tooling:prerelease-test-image');
  //   await terminal.waitTerminalInactivity();
  //
  //   console.log('Deleting all DevWorkspaces...');
  //   await terminal.typeAndEnterIntoWebTerminal('oc delete dw --all');
  //   await terminal.waitTerminalIsStarted();
  //
  //   console.log('Verifying new tooling image (fish shell)...');
  //   await terminal.typeAndEnterIntoWebTerminal('which fish');
  //   await terminal.waitForOutputContains('/usr/bin/fish');
  // });
  //
  // test('Configure persistent storage', async ({ page }) => {
  //   console.log('Setting storage to 100Mi...');
  //   await terminal.typeAndEnterIntoWebTerminal('wtoctl set storage');
  //   await terminal.waitTerminalInactivity();
  //
  //   console.log('Deleting all DevWorkspaces...');
  //   await terminal.typeAndEnterIntoWebTerminal('oc delete dw --all');
  //   await terminal.waitTerminalIsStarted();
  //
  //   console.log('Verifying PVC...');
  //   await terminal.typeAndEnterIntoWebTerminal('oc get pvc');
  //   await terminal.waitForOutputContains('openshift-terminal-storage');
  //   await terminal.waitForOutputContains('1Gi');
  // });
  //
  // test('Configure terminal timeout', async ({ page }) => {
  //   console.log('Setting terminal timeout to 15s...');
  //   await terminal.typeAndEnterIntoWebTerminal('wtoctl set timeout 15s');
  //   await terminal.waitTerminalInactivity();
  //
  //   console.log('Waiting 15 seconds for inactivity...');
  //   await page.waitForTimeout(15000);
  //
  //   console.log('Verifying inactivity message...');
  //   await terminal.waitTerminalInactivity();
  //   await terminal.waitForOutputContains('The terminal connection has closed due to inactivity.');
  // });
});
