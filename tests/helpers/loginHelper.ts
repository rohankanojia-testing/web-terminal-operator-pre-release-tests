import { Page } from '@playwright/test';
import {LONG_TIMEOUT} from "./constants";

export type LoginMode = 'admin' | 'user';

interface LoginOptions {
  mode: LoginMode;
  consoleUrl: string;
  username: string;         // required for both admin and regular user
  password: string;
  provider?: string;        // identity provider name (default auto)
}

export async function loginOpenShift(page: Page, options: LoginOptions) {
  const {
    mode,
    consoleUrl,
    username,
    password,
    provider,
  } = options;

  console.log(`Opening console: ${consoleUrl}`);
  await page.goto(consoleUrl);

  // 1️⃣ Select identity provider (if exists)
  // Admin mode uses provider for checking identity provider only
  const providerName = provider || (mode === 'admin' ? 'kube:admin' : undefined);

  if (providerName) {
    const providerButton = page.getByRole('button', { name: providerName });
    if (await providerButton.isVisible({ timeout: 8000 }).catch(() => false)) {
      console.log(`Selecting identity provider: ${providerName}`);
      await providerButton.click();
    } else {
      console.log(`Provider button '${providerName}' not shown, continuing...`);
    }
  } else {
    console.log("No provider specified — skipping provider selection.");
  }

  // 2️⃣ Detect username & password fields
  // Different OpenShift versions use different IDs, so try both
  const usernameInput = page.locator('#inputUsername, #Username');
  const passwordInput = page.locator('#inputPassword, #Password');
  const loginButton = page.getByRole('button', { name: 'Log in' });

  console.log("Waiting for login form...");

  await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
  await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
  await loginButton.waitFor({ state: 'visible', timeout: 15000 });

  console.log("Login form detected.");

  // 3️⃣ Fill credentials using provided username
  console.log(`Logging in as: ${username}`);
  await usernameInput.fill(username);
  await passwordInput.fill(password);

  // 4️⃣ Submit and wait for console to load
  await Promise.all([
    page.waitForURL(/overview|dashboards/, { timeout: LONG_TIMEOUT }),
    loginButton.click(),
  ]);

  console.log(`Login successful as ${username}`);
}

