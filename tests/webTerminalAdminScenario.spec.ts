import { test, expect } from '@playwright/test';
import { WebTerminalHelper } from './helpers/webTerminalHelper';
import { loginOpenShift } from './helpers/loginHelper';

const CONSOLE_URL = process.env.CONSOLE_URL!;
const ADMIN_PASS = process.env.KUBEADMIN_PASSWORD!;
const REGULAR_USER = 'user1';
const REGULAR_PASS = 'test';

test.describe('OpenShift Web Terminal E2E', () => {

  test('Admin user runs multiple commands', async ({ page }) => {
    await loginOpenShift(page, {
      mode: 'admin',
      consoleUrl: CONSOLE_URL,
      username: 'kubeadmin',
      password: ADMIN_PASS,
    });

    const terminal = new WebTerminalHelper(page);
    await terminal.openWebTerminal();
    await terminal.setProject('openshift-terminal');

    const commands = [
      { cmd: 'oc whoami', expectContains: 'kubeadmin' },
      { cmd: 'oc get pods', expectContains: 'NAME' },
      { cmd: 'help', expectContains: 'OpenShift CLI' },
    ];

    for (const { cmd, expectContains } of commands) {
      await test.step(`Run command: ${cmd}`, async () => {
        await terminal.typeCommand(cmd);
        await page.waitForTimeout(2000);

        const output = await terminal.terminalInput.evaluate((el: any) => el.textContent);
        expect(output).toContain(expectContains);
      });
    }
  });

//   test('Regular user runs multiple commands', async ({ page }) => {
//     await loginOpenShift(page, {
//       mode: 'user',
//       consoleUrl: CONSOLE_URL,
//       username: REGULAR_USER,
//       password: REGULAR_PASS,
//     });

//     const terminal = new WebTerminalHelper(page);
//     await terminal.openWebTerminal();
//     await terminal.setProject('openshift-terminal');

//     const commands = [
//       { cmd: 'oc whoami', expectContains: REGULAR_USER },
//       { cmd: 'oc get pods', expectContains: 'NAME' },
//       { cmd: 'help', expectContains: 'OpenShift CLI' },
//     ];

//     for (const { cmd, expectContains } of commands) {
//       await test.step(`Run command: ${cmd}`, async () => {
//         await terminal.typeCommand(cmd);
//         await page.waitForTimeout(2000);

//         const output = await terminal.terminalInput.evaluate((el: any) => el.textContent);
//         expect(output).toContain(expectContains);
//       });
//     }
//   });

});
