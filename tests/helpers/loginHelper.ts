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
          provider: process.env.USER_PROVIDER!,
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

  // Wait for either /login or /oauth/authorize page to appear
  const isOauthFirst = await Promise.race([
    // OAuth page check
    page.waitForFunction(() => window.location.href.includes('/oauth/authorize'), { timeout: SHORT_TIMEOUT })
        .then(() => true)
        .catch(() => false),

    // Login page check
    page.waitForFunction(() => window.location.href.includes('/login'), { timeout: SHORT_TIMEOUT })
        .then(() => false)
        .catch(() => false)
  ]);

  if (isOauthFirst) {
    console.log('🔐 OAuth redirect detected — handling OAuth flow…');
    await selectIdentityProvider(page, mode, provider);
  }

  // Proceed to login form (works for both OAuth redirect and direct login)
  const usernameInput = page.locator('#inputUsername, #Username');
  const passwordInput = page.locator('#inputPassword, #Password');
  const loginButton = page.getByRole('button', { name: 'Log in' });

  console.log('Waiting for login form...');
  await usernameInput.waitFor({ state: 'visible', timeout: LONG_TIMEOUT });
  await passwordInput.waitFor({ state: 'visible', timeout: LONG_TIMEOUT });
  await loginButton.waitFor({ state: 'visible', timeout: LONG_TIMEOUT });

  console.log(`Logging in as: ${username}`);
  await usernameInput.fill(username);
  await passwordInput.fill(password);
  await loginButton.click();

  await page.waitForLoadState('networkidle');

  console.log(`Login successful as ${username}`);
  await skipTourIfPresent(page);
}

/**
 * Selects the identity provider when the "Log in with" page appears.
 * Safe to call even when the page does not exist.
 */
async function selectIdentityProvider(
  page: Page,
  mode: string,
  provider?: string
) {
  console.log("Checking for 'Log in with' identity provider page...");

  // Wait a little in case of redirect
  await page.waitForTimeout(1000);

  // Look for any heading containing "Log in with"
  const loginWithHeading = page.locator('h1:has-text("Log in with")');
  const isVisible = await loginWithHeading
    .waitFor({ state: "visible", timeout: LONG_TIMEOUT })
    .then(() => true)
    .catch(() => false);

  if (!isVisible) {
    console.log("'Log in with' page NOT shown — skipping provider selection.");
    return;
  }

  console.log("'Log in with' page detected.");

  // Determine which provider to click
  const providerName = mode === "admin" ? "kube:admin" : provider;
  if (!providerName) {
    console.log("No provider specified — skipping provider selection.");
    return;
  }

  console.log(`Looking for provider button with text: "${providerName}"`);

  // Find a button containing the provider text
  const providerButton = page.locator(`a:has-text("${providerName}"), button:has-text("${providerName}")`);
  const buttonVisible = await providerButton
    .waitFor({ state: "visible", timeout: LONG_TIMEOUT })
    .then(() => true)
    .catch(() => false);

  if (!buttonVisible) {
    console.warn(`Provider '${providerName}' not found — continuing...`);
    return;
  }

  console.log(`Clicking provider: ${providerName}`);
  await providerButton.click();

  // Wait until the username/password form appears
  await page.waitForTimeout(SHORT_TIMEOUT); // short delay to allow redirect
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

