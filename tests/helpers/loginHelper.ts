import { Page } from '@playwright/test';
import {LONG_TIMEOUT, SHORT_TIMEOUT} from "./constants";

interface LoginOptions {
  mode: string;
  consoleUrl: string;
  username: string;         // required for both admin and regular user
  password: string;
  provider?: string;        // identity provider name (default auto)
}

export async function doOpenShiftLoginAsPerMode(page: Page, testMode: string) {
  console.log(`Logging into OpenShift as ${testMode}...`);
  if (testMode === 'admin') {
      // Admin login
      await loginOpenShift(page, {
          mode: 'admin',
          consoleUrl: process.env.CONSOLE_URL!,
          username: process.env.KUBEADMIN_USERNAME!,
          password: process.env.KUBEADMIN_PASSWORD!,
          provider: process.env.ADMIN_PROVIDER || process.env.USER_PROVIDER,
      });
  } else if (testMode === 'user') {
      // Regular user login
      await loginOpenShift(page, {
          mode: 'user',
          consoleUrl: process.env.CONSOLE_URL!,
          username: process.env.TEST_USER!,
          password: process.env.USER_PASSWORD!,
          provider: process.env.USER_PROVIDER,
      });
  } else {
      throw new Error(`Unknown TEST_MODE: ${testMode}`);
  }
}

export async function loginOpenShift(page: Page, options: LoginOptions) {
  const { mode, consoleUrl, username, password, provider } = options;

  console.log(`Opening console: ${consoleUrl}`);
  await page.goto(consoleUrl, { waitUntil: 'domcontentloaded' });

  // OpenShift and Keycloak can show the form directly or after provider selection.
  // Inspect visible controls instead of assuming a particular OAuth URL path.
  const usernameInput = page.locator('#inputUsername, #Username, #username').first();
  const passwordInput = page.locator('#inputPassword, #Password, #password').first();
  const loginButton = page.locator('#kc-login').or(
    page.getByRole('button', { name: /^(log in|sign in)$/i })
  ).first();
  const providerName = provider || (mode === 'admin' ? 'kube:admin' : undefined);
  if (providerName) {
    const providerButton = page.getByRole('link', { name: providerName, exact: true }).or(
      page.getByRole('button', { name: providerName, exact: true })
    ).first();
    await usernameInput.or(providerButton).first().waitFor({ state: 'visible', timeout: LONG_TIMEOUT });
    if (!(await usernameInput.isVisible())) {
      await providerButton.click();
    }
  }

  console.log('Waiting for login form...');
  await usernameInput.waitFor({ state: 'visible', timeout: LONG_TIMEOUT });
  await passwordInput.waitFor({ state: 'visible', timeout: LONG_TIMEOUT });
  await loginButton.waitFor({ state: 'visible', timeout: LONG_TIMEOUT });

  console.log(`Logging in as: ${username}`);
  await usernameInput.fill(username);
  await passwordInput.fill(password);
  await loginButton.click();

  // A Keycloak authentication URL does not necessarily contain /login.
  // Require navigation back to the console before declaring login successful.
  const consoleOrigin = new URL(consoleUrl).origin;
  await page.waitForURL(url => url.origin === consoleOrigin &&
    !/^\/(auth|login|oauth)(\/|$)/.test(url.pathname), { timeout: LONG_TIMEOUT });

  console.log(`✅ Login successful as ${username}`);
  await skipTourIfPresent(page);
}

async function skipTourIfPresent(page: Page) {
  try {
    const skipButton = await page.waitForSelector('button:has-text("Skip tour")', { timeout: SHORT_TIMEOUT });
    if (skipButton) {
      console.log(`Skip tour: ${skipButton}`);
      await skipButton.click();
    }
  } catch {}
}

