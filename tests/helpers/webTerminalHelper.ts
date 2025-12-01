import { Page, Locator } from '@playwright/test';
import { OcUtils } from './ocUtils';

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
    this.startWTButton = page.locator('button[data-test-id="submit-button"]:has-text("Start")');
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
    await this.ensureTerminalInitialized();
    console.debug("⏳ Waiting for xterm textarea...");
    await this.webTerminalPage.waitFor({state: 'visible', timeout: timeout});
    console.debug("Web terminal page visible");
    console.debug("✔ Terminal ready!");
  }

  /**
   * Detects if the "Initialize terminal" page is shown.
   * If present, clicks the Start button to initialize the terminal.
   * If not present within timeout, assumes terminal is already initialized.
   */
  async ensureTerminalInitialized(timeout: number = 5000) {
    try {
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
    await this.webTerminalPage.fill(`${text} >> /tmp/test-stdout.txt 2>&1\n`);
  }

  async provideInputIntoWebTerminal(text: string) {
    await this.webTerminalPage.fill(`${text}\n`);
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
