import { test as setup } from '@playwright/test';
import { createCookieSessionStorage } from '@remix-run/node';

const SESSION_COOKIE_NAME = '__session';

// Create authenticated session for tests
setup('authenticate', async ({ page, context }) => {
  // Create session storage
  const sessionStorage = createCookieSessionStorage({
    cookie: {
      name: SESSION_COOKIE_NAME,
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      sameSite: 'lax',
      secrets: [process.env.SESSION_SECRET || 'test-secret-key-for-playwright'],
      secure: false,
    },
  });

  // Create a session with userId
  const session = await sessionStorage.getSession();
  session.set('userId', 'parent-user-id'); // We'll need to get the actual user ID

  // Get the session cookie value
  const cookieValue = await sessionStorage.commitSession(session);

  // Set the cookie in the browser context
  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: cookieValue.replace(`${SESSION_COOKIE_NAME}=`, ''),
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      secure: false,
    },
  ]);

  // Verify we're logged in
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
});
