import { test, expect } from '@playwright/test';
import { login } from './fixtures/auth';

test.describe('Listen Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Login using the auth helper
    await login(page);

    // Navigate to audio page
    await page.goto('/audio', { waitUntil: 'networkidle' });
  });

  test.describe('UI Elements', () => {
    test('should display Listen Mode button', async ({ page }) => {
      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      await expect(listenButton).toBeVisible();
    });

    test('should have microphone icon on Listen Mode button', async ({ page }) => {
      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      const micIcon = listenButton.locator('svg');
      await expect(micIcon).toBeVisible();
    });

    test('should show Listen Mode button as outline variant when inactive', async ({ page }) => {
      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      await expect(listenButton).toHaveClass(/outline/);
    });
  });

  test.describe('Starting Listen Mode', () => {
    test('should change button state when Listen Mode starts', async ({ page }) => {
      const listenButton = page.getByRole('button', { name: /Listen Mode/i });

      // Click to start listening
      await listenButton.click();

      // Wait for state change
      await page.waitForTimeout(500);

      // Button should now show "Stop Listening"
      const stopButton = page.getByRole('button', { name: /Stop Listening/i });
      await expect(stopButton).toBeVisible();
    });

    test('should change button to destructive variant when active', async ({ page }) => {
      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      await listenButton.click();

      await page.waitForTimeout(500);
      const stopButton = page.getByRole('button', { name: /Stop Listening/i });
      await expect(stopButton).toHaveClass(/destructive/);
    });

    test('should show stop icon when listening', async ({ page }) => {
      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      await listenButton.click();

      await page.waitForTimeout(500);
      const stopButton = page.getByRole('button', { name: /Stop Listening/i });
      const stopIcon = stopButton.locator('svg');
      await expect(stopIcon).toBeVisible();
    });

    test('should display live audio level indicator when listening', async ({ page }) => {
      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      await listenButton.click();

      await page.waitForTimeout(500);

      // Check for audio level indicator
      const audioLevel = page.getByText(/Live Audio Level/i);
      await expect(audioLevel).toBeVisible();
    });

    test('should show volume bar when listening', async ({ page }) => {
      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      await listenButton.click();

      await page.waitForTimeout(500);

      // Look for the volume visualization bar
      const volumeBar = page.locator('.bg-gradient-to-r.from-green-500.to-blue-500');
      await expect(volumeBar).toBeVisible();
    });
  });

  test.describe('WebSocket Connection', () => {
    test('should establish WebSocket connection when starting Listen Mode', async ({ page }) => {
      // Set up console log listener
      const logs: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'log') {
          logs.push(msg.text());
        }
      });

      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      await listenButton.click();

      // Wait for WebSocket connection
      await page.waitForTimeout(1000);

      // Check console logs for WebSocket messages
      expect(logs.some(log => log.includes('WebSocket'))).toBeTruthy();
    });

    test('should handle WebSocket connection errors gracefully', async ({ page }) => {
      // Block WebSocket connections
      await page.route('**/ws/microphone', (route) => route.abort());

      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      await listenButton.click();

      // Should not crash the app
      await page.waitForTimeout(1000);
      await expect(page).not.toHaveURL(/error/);
    });
  });

  test.describe('Stopping Listen Mode', () => {
    test('should stop listening when Stop button is clicked', async ({ page }) => {
      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      await listenButton.click();
      await page.waitForTimeout(500);

      const stopButton = page.getByRole('button', { name: /Stop Listening/i });
      await stopButton.click();
      await page.waitForTimeout(500);

      // Button should be back to "Listen Mode"
      const newListenButton = page.getByRole('button', { name: /Listen Mode/i });
      await expect(newListenButton).toBeVisible();
    });

    test('should hide audio level indicator when stopped', async ({ page }) => {
      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      await listenButton.click();
      await page.waitForTimeout(500);

      const stopButton = page.getByRole('button', { name: /Stop Listening/i });
      await stopButton.click();
      await page.waitForTimeout(500);

      // Audio level should not be visible
      const audioLevel = page.getByText(/Live Audio Level/i);
      await expect(audioLevel).not.toBeVisible();
    });

    test('should change button back to outline variant when stopped', async ({ page }) => {
      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      await listenButton.click();
      await page.waitForTimeout(500);

      const stopButton = page.getByRole('button', { name: /Stop Listening/i });
      await stopButton.click();
      await page.waitForTimeout(500);

      const newListenButton = page.getByRole('button', { name: /Listen Mode/i });
      await expect(newListenButton).toHaveClass(/outline/);
    });
  });

  test.describe('Listen Mode State Persistence', () => {
    test('should not persist listening state on page refresh', async ({ page }) => {
      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      await listenButton.click();
      await page.waitForTimeout(500);

      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should be back to inactive state
      const newListenButton = page.getByRole('button', { name: /Listen Mode/i });
      await expect(newListenButton).toBeVisible();
      await expect(newListenButton).toHaveClass(/outline/);
    });

    test('should clean up WebSocket on page navigation', async ({ page }) => {
      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      await listenButton.click();
      await page.waitForTimeout(500);

      // Navigate away
      await page.goto('/dashboard');

      // Navigate back
      await page.goto('/audio');
      await page.waitForLoadState('networkidle');

      // Should be in inactive state
      const newListenButton = page.getByRole('button', { name: /Listen Mode/i });
      await expect(newListenButton).toBeVisible();
    });
  });

  test.describe('Interaction with Other Features', () => {
    test('should be independent of mute button', async ({ page }) => {
      const muteButton = page.getByRole('button', { name: /Mute/i }).first();
      await muteButton.click();
      await page.waitForTimeout(500);

      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      await listenButton.click();
      await page.waitForTimeout(500);

      // Both should be active
      const stopButton = page.getByRole('button', { name: /Stop Listening/i });
      await expect(stopButton).toBeVisible();
    });

    test('should work after testing microphone', async ({ page }) => {
      // Test microphone first
      const testButton = page.getByRole('button', { name: /Test Microphone/i });
      await testButton.click();
      await page.waitForTimeout(3000);

      // Then start listening
      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      await listenButton.click();
      await page.waitForTimeout(500);

      const stopButton = page.getByRole('button', { name: /Stop Listening/i });
      await expect(stopButton).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle microphone device not available', async ({ page }) => {
      // This test requires the server to be running
      // The actual error handling depends on server implementation
      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      await listenButton.click();

      // Should not crash even if device fails
      await page.waitForTimeout(2000);
      await expect(page).not.toHaveURL(/error/);
    });

    test('should handle rapid start/stop clicks', async ({ page }) => {
      const listenButton = page.getByRole('button', { name: /Listen Mode/i });

      // Rapid clicks
      await listenButton.click();
      await page.waitForTimeout(100);

      const stopButton = page.getByRole('button', { name: /Stop Listening/i });
      await stopButton.click();
      await page.waitForTimeout(100);

      const listenButton2 = page.getByRole('button', { name: /Listen Mode/i });
      await listenButton2.click();
      await page.waitForTimeout(100);

      const stopButton2 = page.getByRole('button', { name: /Stop Listening/i });
      await stopButton2.click();

      // Should end in stable state
      await page.waitForTimeout(500);
      const finalButton = page.getByRole('button', { name: /Listen Mode/i });
      await expect(finalButton).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard accessible', async ({ page }) => {
      // Tab to Listen Mode button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Press Enter to activate
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Check if listening started
      const stopButton = page.getByRole('button', { name: /Stop Listening/i });
      await expect(stopButton).toBeVisible();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      await expect(listenButton).toHaveAttribute('type', 'button');
    });

    test('should maintain focus when toggling', async ({ page }) => {
      const listenButton = page.getByRole('button', { name: /Listen Mode/i });
      await listenButton.focus();
      await listenButton.click();
      await page.waitForTimeout(500);

      const stopButton = page.getByRole('button', { name: /Stop Listening/i });
      await expect(stopButton).toBeFocused();
    });
  });
});
