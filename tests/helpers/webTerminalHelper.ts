import { Page, Locator, expect } from '@playwright/test';

export enum TimeUnits {
  Seconds = 'Seconds',
  Minutes = 'Minutes',
  Hours = 'Hours'
}

export class WebTerminalPage {
  public terminalRows: Locator;
  private page: Page;

  // Locators
  private webTerminalButton: Locator;
  public webTerminalPage: Locator; // exposed for terminal output reading
  private startWTButton: Locator;
  private projectDropdown: Locator;
  private projectCancelButton: Locator;
  private terminalInactivityMessage: Locator;
  private restartButton: Locator;
  private projectNamespaceDropdown: Locator;
  private projectSelectionField: Locator;
  private projectNameField: Locator;
  private timeoutButton: Locator;
  private timeoutInput: Locator;
  private incrementTimeoutBtn: Locator;
  private decrementTimeoutBtn: Locator;
  private timeUnitDropdown: Locator;
  private imageButton: Locator;

  constructor(page: Page) {
    this.page = page;
    console.log('Initializing WebTerminalPage locators...');
    this.webTerminalButton = page.locator('[data-quickstart-id="qs-masthead-cloudshell"]');
    this.webTerminalPage = page.locator('.xterm-helper-textarea');
    this.startWTButton = page.locator('button[data-test-id="submit-button"]:has-text("Start")');
    this.startWTButton = page.locator('div:has-text("Initialize terminal") button[data-test-id="submit-button"]');
    this.projectDropdown = page.locator('input#form-input-namespace-field');
    this.projectCancelButton = page.locator('button[data-test-id="reset-button"]');
    this.terminalInactivityMessage = page.locator('div:has-text("The terminal connection has closed")');
    this.restartButton = page.locator('button:text("Restart terminal")');
    this.projectNamespaceDropdown = page.locator('button#form-ns-dropdown-namespace-field');
    this.projectSelectionField = page.locator('input[data-test-id="dropdown-text-filter"]');
    this.projectNameField = page.locator('input#form-input-newNamespace-field');
    this.timeoutButton = page.locator('button:text("Timeout")');
    this.timeoutInput = page.locator('input[aria-describedby="form-resource-limit-advancedOptions-timeout-limit-field-helper"]');
    this.incrementTimeoutBtn = page.locator('button[data-test-id="Increment"]');
    this.decrementTimeoutBtn = page.locator('button[data-test-id="Decrement"]');
    this.timeUnitDropdown = page.locator('div.request-size-input__unit button');
    this.imageButton = page.locator('button:text("Image")');
    this.terminalRows = page.locator('.xterm-rows > div');
  }

  async clickOnWebTerminalIcon() {
    console.log('Clicking on Web Terminal icon...');
    await this.webTerminalButton.click();
  }

  async waitTerminalIsStarted() {
    console.log('Waiting for terminal to be visible...');
    await this.webTerminalPage.waitFor({ state: 'visible' });
  }

  async clickOnStartWebTerminalButton() {
    console.log('Clicking Start Web Terminal button...');
    await this.startWTButton.click();
  }

  async getAdminProjectName(): Promise<string> {
    const value = await this.projectDropdown.inputValue();
    console.log(`Admin project name retrieved: ${value}`);
    return value;
  }

  async openWebTerminal(timeout: number = 30000) {
    console.log("Opening Web Terminal...");
    await this.clickOnWebTerminalIcon();
    await this.ensureTerminalInitialized()
    console.log("⏳ Waiting for xterm textarea...");
    await this.webTerminalPage.waitFor({ state: 'visible', timeout: timeout });
    console.log("✔ Terminal ready!");
  }

  /**
   * Detects if the "Initialize terminal" page is shown.
   * If present, clicks the Start button to initialize the terminal.
   * If not present within timeout, assumes terminal is already initialized.
   */
  async ensureTerminalInitialized(timeout: number = 5000) {
    try {
      await this.startWTButton.waitFor({ state: 'visible', timeout });
      console.log("⚠ 'Initialize terminal' view detected!");
      await this.clickOnStartWebTerminalButton();
      console.log("✔ Clicked Start to initialize terminal.");
    } catch (error) {
      console.log(`ℹ 'Initialize terminal' view not found within ${timeout}ms, proceeding directly.`);
    }
  }

  async waitDisabledProjectFieldAndGetProjectName(): Promise<string> {
    const value = await this.projectDropdown.inputValue();
    console.log(`Disabled project field value: ${value}`);
    return value;
  }

  async typeIntoWebTerminal(text: string) {
    console.log(`Typing into terminal: ${text}`);
    await this.webTerminalPage.fill(text);
  }

  async typeAndEnterIntoWebTerminal(text: string) {
    console.log(`Typing and sending Enter: ${text}`);
    await this.webTerminalPage.type(text + '\n');
  }

  async clickOnProjectListDropDown() {
    console.log('Clicking project dropdown...');
    await this.projectDropdown.click();
  }

  async waitTimeoutButton() {
    console.log('Waiting for Timeout button to be visible...');
    await this.timeoutButton.waitFor({ state: 'visible' });
  }

  async waitImageButton() {
    console.log('Waiting for Image button to be visible...');
    await this.imageButton.waitFor({ state: 'visible' });
  }

  async waitStartButton() {
    console.log('Waiting for Start button to be visible...');
    await this.startWTButton.waitFor({ state: 'visible' });
  }

  async waitCancelButton() {
    console.log('Waiting for Cancel button to be visible...');
    await this.projectCancelButton.waitFor({ state: 'visible' });
  }

  async waitTerminalWidget() {
    console.log('Waiting for terminal widget buttons...');
    await this.waitStartButton();
    await this.waitCancelButton();
    await this.waitTimeoutButton();
    await this.waitImageButton();
  }

  async waitTerminalInactivity() {
    console.log('Waiting for terminal inactivity message...');
    await this.terminalInactivityMessage.waitFor({ state: 'visible' });
    await this.restartButton.waitFor({ state: 'visible' });
    console.log('Terminal inactivity detected, Restart button visible.');
    await this.restartButton.click();
  }

  async waitWebTerminalProjectNameField() {
    console.log('Waiting for project namespace dropdown...');
    await this.projectNamespaceDropdown.waitFor({ state: 'visible' });
  }

  async typeProjectName(projectName: string) {
    console.log(`Typing project name: ${projectName}`);
    await this.projectNameField.fill(projectName);
  }

  async openProjectDropDown() {
    console.log('Opening project dropdown...');
    await this.projectNamespaceDropdown.click();
  }

  async typeProjectNameForSelecting(projectName: string) {
    console.log(`Typing project name for selection: ${projectName}`);
    await this.projectSelectionField.fill(projectName);
  }

  async selectProjectFromDropDownList(projectName: string) {
    console.log(`Selecting project from dropdown: ${projectName}`);
    await this.page.locator(`//span[@class="pf-v5-c-menu__item-text" and text()="${projectName}"]`).click();
  }

  async findAndSelectProject(projectName: string) {
    console.log(`Finding and selecting project: ${projectName}`);
    await this.openProjectDropDown();
    await this.typeProjectNameForSelecting(projectName);
    await this.selectProjectFromDropDownList(projectName);
  }

  async clickOnTimeoutButton() {
    console.log('Clicking Timeout button...');
    await this.timeoutButton.click();
  }

  async setTimeoutByEntering(timeValue: number) {
    console.log(`Setting timeout to: ${timeValue}`);
    await this.timeoutInput.fill(timeValue.toString());
  }

  async clickOnPlusBtn() {
    console.log('Clicking + button to increment timeout...');
    await this.incrementTimeoutBtn.click();
  }

  async clickOnMinutesBtn() {
    console.log('Clicking - button to decrement timeout...');
    await this.decrementTimeoutBtn.click();
  }

  async clickOnTimeUnitDropDown() {
    console.log('Clicking time unit dropdown...');
    await this.timeUnitDropdown.click();
  }

  async selectTimeUnit(timeUnit: TimeUnits) {
    console.log(`Selecting time unit: ${timeUnit}`);
    await this.page.locator(`//button[@data-test-id='dropdown-menu' and text()='${timeUnit}']`).click();
  }

  /** Type a command and press Enter */
  async typeCommand(command: string) {
    const textarea = this.page.locator('.xterm-helper-textarea');
    await textarea.fill(command);
    await textarea.press('Enter');
  }

  /** Wait for last row to contain expected text */
  async waitForLastRowContains(expected: string, timeout = 10000) {
    const lastRow = this.terminalRows.nth(-1);
    await expect(lastRow).toContainText(expected, { timeout });
  }

  async getTerminalOutput(): Promise<string> {
    const text = await this.page.locator('.xterm-rows').evaluate((el) => el.textContent);
    return text?.replace(/\s+/g, ' ').trim() || '';
  }

  async waitForOutputContains(expected: string, timeout = 10000) {
    const start = Date.now();
    let output = '';
    while (Date.now() - start < timeout) {
      output = await this.getTerminalOutput();
      if (output.includes(expected)) return;
      await this.page.waitForTimeout(500);
    }
    console.log('Terminal output:\n', output);
    throw new Error(`Expected output not found: "${expected}"`);
  }

  async waitForTerminalClosed(timeout: number = 30000) {
    const closedMsg = this.page.locator(
        'div.co-cloudshell-exec__error-msg:has-text("The terminal connection has closed")'
    );
    console.log("Waiting for terminal to close...");
    try {
      await closedMsg.waitFor({ state: 'visible', timeout }); // actively waits up to `timeout`
      console.log("⚠ Terminal connection closed detected!");
      return true;
    } catch {
      console.log("ℹ Terminal did not close within timeout");
      return false;
    }
  }

  async restartTerminal(timeout: number = 30000) {
    const restartBtn = this.page.locator('button:has-text("Restart terminal")');

    console.log('⚠ Terminal connection closed! Restarting...');
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
          console.log('✔ Terminal restarted and ready!');
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
