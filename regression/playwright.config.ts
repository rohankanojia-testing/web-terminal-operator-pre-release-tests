import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: '.', testMatch: 'login.spec.ts', timeout: 15000, use: { headless: true }, reporter: 'list' });
