import { Page, Locator } from '@playwright/test';
import { OcUtils } from './ocUtils';
import {SHORT_TIMEOUT} from "./constants";

export class WebTerminalPage {
  public terminalRows: Locator;
  private page: Page;

  // Locators
  private webTerminalButton: Locator;
  public webTerminalPage: Locator; // exposed for terminal output reading
  private startWTButton: Locator;

  constructor(page: Page) {
    this.page = page;
    console.debug('Initializing WebTerminalPage locators...');
    this.webTerminalButton = page.locator('[data-quickstart-id="qs-masthead-cloudshell"]');
    this.webTerminalPage = page.locator('.xterm-helper-textarea');
    this.startWTButton = page.locator('div:has-text("Initialize terminal") button[data-test-id="submit-button"]');
    this.terminalRows = page.locator('.xterm-rows > div');
  }

  async clickOnWebTerminalIcon() {
    console.debug('Clicking on Web Terminal icon...');
    await this.webTerminalButton.click();
  }

  async clickOnStartWebTerminalButton() {
    console.debug('Clicking Start Web Terminal button...');
    await this.startWTButton.click();
  }

  async openWebTerminal(timeout: number) {
    console.debug("Opening Web Terminal...");
    await this.clickOnWebTerminalIcon();

    const terminalTextArea = this.webTerminalPage; // Your xterm locator
    // Use the new, robust locator
    const initPanel = this.page.locator('section').filter({
      has: this.page.getByRole('heading', { name: 'Initialize terminal' })
    });

    console.debug("⏳ Detecting whether terminal needs initialization...");

    const initNeeded = await Promise.race([
      // Check if the initialization panel is visible
      initPanel.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false),
      // Check if the terminal itself is visible
      terminalTextArea.waitFor({ state: 'visible', timeout }).then(() => false).catch(() => false)
    ]);

    if (initNeeded) {
      console.debug("🛠 Terminal initialization detected — waiting for it to finish...");
      await this.ensureTerminalInitialized(timeout);
      console.debug("⏳ Waiting for terminal to be visible...");
      await terminalTextArea.waitFor({ state: 'visible', timeout });
    } else {
      console.debug("⚡ Terminal already ready — skipping initialization.");
    }

    console.debug("✔ Terminal ready!");
  }

  async handleProjectCreationIfNeeded(namespace: string, timeout: number) {
    const debugPrefix = `[Debug] Project creation for "${namespace}"`;

    const projectDropdown = this.page.locator('button#form-ns-dropdown-namespace-field');
    const projectFilterInput = this.page.locator('input[placeholder="Select Project"]');

    const isDropdownVisible = await projectDropdown.isVisible({ timeout }).catch(() => false);
    if (!isDropdownVisible) {
      console.warn(`${debugPrefix}: ❌ Project dropdown not found within timeout.`);
      return false;
    }

    console.debug(`${debugPrefix}: Project dropdown detected — clicking to open...`);
    await projectDropdown.click();

    const isFilterVisible = await projectFilterInput.isVisible({ timeout }).catch(() => false);
    if (!isFilterVisible) {
      console.warn(`${debugPrefix}: ⚠️ Dropdown filter input not visible.`);
      return false;
    }

    console.debug(`${debugPrefix}: Typing "${namespace}" in dropdown filter`);
    await projectFilterInput.fill(namespace);
    await this.page.waitForTimeout(200); // Allow dropdown to update

    console.log(`${debugPrefix}: Waiting for project entry (handles 4.17 & 4.20)...`);

    // Race between 4.20 button and 4.17 li
    const entry20Promise = this.page
        .locator(`button#${namespace}-link`)
        .waitFor({ state: 'visible', timeout })
        .then(() => 'v4.20')
        .catch(() => false);

    const entry17Promise = this.page
        .locator(`li[role="option"] >> text="${namespace}"`)
        .waitFor({ state: 'visible', timeout })
        .then(() => 'v4.17')
        .catch(() => false);

    const result = await Promise.race([entry20Promise, entry17Promise]);

    let projectEntry;
    if (result === 'v4.20') {
      console.log(`${debugPrefix}: Detected OpenShift 4.20 style project entry`);
      projectEntry = this.page.locator(`button#${namespace}-link`);
    } else if (result === 'v4.17') {
      console.log(`${debugPrefix}: Detected OpenShift 4.17 style project entry`);
      projectEntry = this.page.locator(`li[role="option"] >> text="${namespace}"`);
    } else {
      console.warn(`${debugPrefix}: ⚠️ Project "${namespace}" not found in dropdown list.`);
      return false;
    }

    await projectEntry.scrollIntoViewIfNeeded();
    await projectEntry.click();

    console.debug(`${debugPrefix}: ✅ Project "${namespace}" selected successfully`);
    return true;
  }


  /**
   * Detects if the "Initialize terminal" page is shown.
   * If present, clicks the Start button to initialize the terminal.
   * If not present within timeout, assumes terminal is already initialized.
   */
  async ensureTerminalInitialized(timeout: number = 5000) {
    try {
      await this.handleProjectCreationIfNeeded(process.env.WEB_TERMINAL_NAMESPACE, SHORT_TIMEOUT);
      console.log('Waiting for start button to become visible');
      await this.startWTButton.waitFor({ state: 'visible', timeout });
      console.debug("⚠ 'Initialize terminal' view detected!");
      await this.clickOnStartWebTerminalButton();
      console.debug("✔ Clicked Start to initialize terminal.");
    } catch (error) {
      console.debug(`ℹ 'Initialize terminal' view not found within ${timeout}ms, proceeding directly.`);
    }
  }

  async typeAndEnterIntoWebTerminal(text: string) {
    console.debug(`Typing and sending Enter (stdout + stderr to file): ${text}`);
    // Redirect both stdout and stderr to /tmp/test-stdout.txt
    await this.webTerminalPage.focus();
    await this.page.keyboard.type(`${text} >> /tmp/test-stdout.txt 2>&1`,  { delay: 0 });
    await this.page.keyboard.press('Enter');
  }

  async provideInputIntoWebTerminal(text: string) {
    await this.webTerminalPage.focus();
    await this.page.keyboard.type(`${text}`,  { delay: 0 });
    await this.page.keyboard.press('Enter');
  }

  /*
   * This version only works with OpenShift 4.20
   */
  // async getTerminalOutput(): Promise<string> {
  //   const text = await this.page.locator('.xterm-rows').evaluate((el) => el.textContent);
  //   return text?.replace(/\s+/g, ' ').trim() || '';
  // }

  async waitForOutputContains(expected: string, timeout = 10000) {
    const start = Date.now();
    let output = '';
    while (Date.now() - start < timeout) {
      output = await OcUtils.getTerminalOutput();
      if (output.includes(expected)) return;
      await this.page.waitForTimeout(500);
    }
    console.debug('Terminal output:\n', output);
    throw new Error(`Expected output not found: "${expected}"`);
  }

  async waitForTerminalClosed(timeout: number = 30000) {
    const closedMsg = this.page.locator(
        'div.co-cloudshell-exec__error-msg:has-text("The terminal connection has closed")'
    );
    console.debug("Waiting for terminal to close...");
    try {
      await closedMsg.waitFor({ state: 'visible', timeout }); // actively waits up to `timeout`
      console.debug("⚠ Terminal connection closed detected!");
      return true;
    } catch {
      console.debug("ℹ Terminal did not close within timeout");
      return false;
    }
  }

  async waitUntilTerminalIsRestarted(timeout: number = 30000) {
    const restartBtn = this.page.locator('button:has-text("Restart terminal")');

    console.debug('⚠ Terminal connection closed! Restarting...');
    await restartBtn.click({ force: true });

    // Wait for terminal to appear, with timeout
    const startTime = Date.now();
    while (true) {
      const elapsed = Date.now() - startTime;
      if (elapsed > timeout) {
        throw new Error(`❌ Terminal did not restart within ${timeout / 1000}s`);
      }

      try {
        // Replace with your existing wait for xterm logic
        if (await this.webTerminalPage.isVisible({ timeout: 1000 })) {
          console.debug('✔ Terminal restarted and ready!');
          break;
        }
      } catch {
        // ignore, retry
      }

      await this.page.waitForTimeout(500); // small wait before retry
    }
  }

  async close() {
    await this.page.close();
  }
}
