# E2E Test Authentication Issue

## Problem

The Playwright E2E tests for Listen Mode are failing at the login step. After submitting the login form with valid credentials (`parent`/`password123`), the browser is redirected to `/?index` instead of `/dashboard`.

## Error Output

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation to "/dashboard" until "load"
  navigated to "http://localhost:3000/?index"
============================================================
```

## What We Know

1. **User exists**: Database seed confirms parent user exists
2. **Login works manually**: Manual testing shows login works correctly
3. **Form submission issue**: Playwright form submission seems to not trigger the Remix action properly
4. **Redirect behavior**: The `/?index` URL suggests Remix is treating this as a failed action

## Possible Causes

1. **JavaScript not loaded**: Remix requires JavaScript for progressive enhancement, Playwright may be submitting before JS loads
2. **Cookie handling**: Session cookie may not be set/read correctly in test environment
3. **Remix routing**: The `?index` parameter suggests Remix's routing is involved
4. **CSP/CORS**: Security headers might be blocking the form submission

## Attempted Solutions

### 1. Wait for DOM load
```typescript
await page.waitForLoadState('domcontentloaded');
```
- **Result**: Still redirects to `/?index`

### 2. Handle first-run setup
```typescript
if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
  // Accept license and set password
}
```
- **Result**: First run setup works, but subsequent logins fail

### 3. Increase timeouts
```typescript
await page.waitForURL('/dashboard', { timeout: 15000 });
```
- **Result**: Times out waiting for redirect

## Recommended Solutions

### Option 1: API-based Authentication (Recommended)
Create an authentication helper that sets cookies programmatically instead of using the UI:

```typescript
// tests/helpers/auth.ts
export async function authenticateUser(context: BrowserContext) {
  // Create session cookie programmatically
  const sessionData = await createTestSession('parent-user-id');
  await context.addCookies([{
    name: '__session',
    value: sessionData,
    domain: 'localhost',
    path: '/',
   }]);
}
```

### Option 2: Wait for Network Idle
Ensure all JavaScript has loaded before submitting:

```typescript
await page.goto('/');
await page.waitForLoadState('networkidle');  // Wait for ALL network activity
await page.fill('input[name="username"]', 'parent');
await page.fill('input[name="password"]', 'password123');
await page.click('button[type="submit"]');
await page.waitForURL('/dashboard');
```

### Option 3: Use Remix's Testing Utilities
Leverage Remix's built-in testing tools instead of full E2E:

```typescript
import { createRemixStub } from "@remix-run/testing";
// ... use stub for testing
```

## Current Status

- **Unit Tests**: ✅ 170 passing (including basic Listen Mode structure tests)
- **E2E Tests**: ❌ 22 failing (all due to authentication issue)
- **Manual Testing**: ✅ Works correctly

## Next Steps

1. Investigate Remix form submission in Playwright environment
2. Try Option 2 (network idle) first as it's simplest
3. If that fails, implement Option 1 (programmatic authentication)
4. Consider adding integration tests that don't require full E2E setup

## Files Involved

- `tests/listen-mode.spec.ts` - E2E test file
- `app/routes/_index.tsx` - Login page with action
- `app/lib/session.server.ts` - Session management
- `playwright.config.ts` - Playwright configuration

## Debugging Commands

```bash
# Run single test in headed mode to watch what happens
npm run test:e2e -- listen-mode.spec.ts --headed --workers=1

# Run with debug mode
npm run test:e2e -- listen-mode.spec.ts --debug

# Check database for user
npx prisma studio

# Test login manually
npm run dev
# Then visit http://localhost:3000 and log in
```

## Related Documentation

- [Remix Testing](https://remix.run/docs/en/main/guides/testing)
- [Playwright Authentication](https://playwright.dev/docs/auth)
- [Remix Forms](https://remix.run/docs/en/main/guides/data-writes)
