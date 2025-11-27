import { Page, Locator } from '@playwright/test';

export class WebTerminalHelper {
  readonly page: Page;
  readonly terminalIcon: Locator;
  readonly startButton: Locator;
  readonly projectInput: Locator;
  readonly terminalInput: Locator;
  readonly restartButton: Locator;
  readonly inactivityMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.terminalIcon = page.locator('button[data-quickstart-id="qs-masthead-cloudshell"]');
    this.startButton = page.locator('button[data-test-id="submit-button"]');
    this.projectInput = page.locator('input#form-input-namespace-field');
    this.terminalInput = page.locator('.xterm-helper-textarea');
    this.restartButton = page.locator('button:text("Restart terminal")');
    this.inactivityMessage = page.locator('div:has-text("The terminal connection has closed")');
  }

  async openWebTerminal() {
    await this.terminalIcon.click();
    await this.startButton.waitFor({ state: 'visible', timeout: 20000 });
    await this.startButton.click();
    await this.terminalInput.waitFor({ state: 'visible', timeout: 30000 });
  }

  async setProject(projectName: string) {
    await this.projectInput.fill(projectName);
  }

  async typeCommand(command: string) {
    await this.terminalInput.type(command);
    await this.terminalInput.press('Enter');
  }

  async waitForInactivity() {
    await this.inactivityMessage.waitFor({ state: 'visible', timeout: 60000 });
    await this.restartButton.waitFor({ state: 'visible', timeout: 10000 });
  }
}
