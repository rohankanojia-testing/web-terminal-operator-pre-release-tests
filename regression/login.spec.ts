import { test, expect } from '@playwright/test';
import { loginOpenShift } from '../tests/helpers/loginHelper';

for (const flow of ['openshift', 'keycloak', 'provider-keycloak']) {
  test(flow, async ({ page }) => {
    const keycloak = flow !== 'openshift';
    await page.route('https://console.test/**', async route => {
      if (new URL(route.request().url()).pathname === '/home') {
        await route.fulfill({ contentType: 'text/html', body: '<button>Skip tour</button><h1>Console</h1>' });
      } else if (flow === 'provider-keycloak') {
        await route.fulfill({ contentType: 'text/html', body: '<h1>Log in with</h1><a href="https://sso.test/realms/test/protocol/openid-connect/auth">rhbk</a>' });
      } else {
        await route.fulfill({ contentType: 'text/html', body: '<script>location.href="https://sso.test/realms/test/protocol/openid-connect/auth"</script>' });
      }
    });
    await page.route('https://sso.test/**', route => route.fulfill({ contentType: 'text/html', body: `
      <form action="https://console.test/home">
        <input id="${keycloak ? 'username' : 'inputUsername'}" name="username" required>
        <input id="${keycloak ? 'password' : 'inputPassword'}" type="password" required>
        <button ${keycloak ? 'id="kc-login"' : ''}>${keycloak ? 'Sign In' : 'Log in'}</button>
      </form>` }));
    await loginOpenShift(page, { mode: 'admin', consoleUrl: 'https://console.test', username: 'fixture-admin', password: 'fixture-password', provider: 'rhbk' });
    await expect(page.getByRole('heading', { name: 'Console' })).toBeVisible();
  });
}
