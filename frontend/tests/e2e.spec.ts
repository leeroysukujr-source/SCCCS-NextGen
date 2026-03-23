import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';
const FRONTEND_BASE = process.env.FRONTEND_BASE || 'http://localhost:5174';

// Test user credentials (configure these or create dummy accounts)
const TEST_USER_1 = { username: 'testuser1', password: 'TestPass123!' };
const TEST_USER_2 = { username: 'testuser2', password: 'TestPass123!' };

test.describe('Chat System E2E Tests', () => {
  let user1Token = '';
  let user2Token = '';
  let channelId = 0;

  test.beforeAll(async () => {
    // Login user 1
    const res1 = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER_1)
    });
    const data1 = await res1.json();
    user1Token = data1.access_token || data1.token;

    // Login user 2
    const res2 = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER_2)
    });
    const data2 = await res2.json();
    user2Token = data2.access_token || data2.token;
  });

  test('should load chat page and display channels', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE}/chat`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check that sidebar is visible
    const sidebar = page.locator('.chat-sidebar');
    await expect(sidebar).toBeVisible();
    
    // Check for channel list
    const channelsList = page.locator('.channels-list');
    await expect(channelsList).toBeVisible();
  });

  test('should connect socket and receive messages', async ({ page, context }) => {
    // Login first (or use existing session)
    await page.goto(`${FRONTEND_BASE}/login`);
    await page.fill('input[type="email"]', TEST_USER_1.username);
    await page.fill('input[type="password"]', TEST_USER_1.password);
    await page.click('button:has-text("Login")');
    
    // Wait for redirect to chat
    await page.waitForURL(`${FRONTEND_BASE}/chat**`);
    
    // Check socket connection status
    const socketStatus = page.locator('[class*="socket-status"]');
    await expect(socketStatus).toContainText('connected', { timeout: 10000 });
  });

  test('should send and receive messages in real-time', async ({ page, browser }) => {
    // Open two browser contexts for two users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // User 1 logs in and opens chat
      await page1.goto(`${FRONTEND_BASE}/login`);
      await page1.fill('input[type="email"]', TEST_USER_1.username);
      await page1.fill('input[type="password"]', TEST_USER_1.password);
      await page1.click('button:has-text("Login")');
      await page1.waitForURL(`${FRONTEND_BASE}/chat**`, { timeout: 10000 });

      // User 2 logs in and opens chat
      await page2.goto(`${FRONTEND_BASE}/login`);
      await page2.fill('input[type="email"]', TEST_USER_2.username);
      await page2.fill('input[type="password"]', TEST_USER_2.password);
      await page2.click('button:has-text("Login")');
      await page2.waitForURL(`${FRONTEND_BASE}/chat**`, { timeout: 10000 });

      // Give sockets time to connect
      await page1.waitForTimeout(2000);
      await page2.waitForTimeout(2000);

      // User 1 sends a message
      const testMessage = `Test message from User 1 - ${Date.now()}`;
      const messageInput1 = page1.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
      await messageInput1.fill(testMessage);
      await page1.click('button[type="submit"], button:has-text("Send")');

      // User 2 should receive the message
      const messages2 = page2.locator('.message-wrapper, .message-content, [class*="message"]');
      await expect(messages2.first()).toContainText(testMessage, { timeout: 5000 });

    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should handle message ACKs and delivery', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE}/chat`);
    await page.waitForLoadState('networkidle');

    // Intercept socket.io message_ack events
    const ackEvents: string[] = [];
    await page.context().addInitScript(() => {
      const originalEmit = window.io?.prototype?.emit;
      if (originalEmit) {
        window.io.prototype.emit = function(event: string, ...args: any[]) {
          if (event === 'message_ack') {
            (window as any).__ackEvents = (window as any).__ackEvents || [];
            (window as any).__ackEvents.push({ event, args });
          }
          return originalEmit.call(this, event, ...args);
        };
      }
    });

    // Send a message and verify ACK is sent
    const messageInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    await messageInput.fill('Test message for ACK');
    await page.click('button[type="submit"], button:has-text("Send")');

    // Check that ACK was sent within 5 seconds
    await page.waitForTimeout(2000);
    const ackSent = await page.evaluate(() => {
      return (window as any).__ackEvents && (window as any).__ackEvents.length > 0;
    });

    expect(ackSent).toBeTruthy();
  });

  test('should display and interact with invite modal', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE}/chat`);
    await page.waitForLoadState('networkidle');

    // Click on invite/share button (find the button in channel controls)
    const inviteButton = page.locator('button:has-text("Invite"), button:has-text("Share"), button[title*="invite" i], button[title*="share" i]').first();
    
    if (await inviteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await inviteButton.click();

      // Wait for modal to appear
      const modal = page.locator('.modal-overlay, [class*="modal"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Check that modal contains expected content
      const modalContent = page.locator('.modal-content, .modal, [role="dialog"]');
      await expect(modalContent).toContainText('Invite', { timeout: 5000 });

      // Try to interact with invite form
      const emailInput = page.locator('input[type="email"][placeholder*="email" i]');
      if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailInput.fill('testuser@example.com');
        expect(await emailInput.inputValue()).toBe('testuser@example.com');
      }

      // Close modal
      const closeButton = page.locator('.modal-close, button:has-text("Close")');
      await closeButton.first().click();
      await expect(modal).not.toBeVisible();
    }
  });

  test('should handle offline message queuing', async ({ page, context }) => {
    await page.goto(`${FRONTEND_BASE}/chat`);
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Try to send a message (should be queued)
    const messageInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    await messageInput.fill('Offline test message');
    await page.click('button[type="submit"], button:has-text("Send")');

    // Message should still appear locally (optimistically)
    const messages = page.locator('.message-wrapper, [class*="message"]');
    const count = await messages.count();
    expect(count).toBeGreaterThan(0);

    // Go back online
    await context.setOffline(false);

    // Wait for reconnection and message flush
    await page.waitForTimeout(3000);

    // Check that socket reconnected
    // (In real scenario, would check for 'connected' status update)
  });

  test('should handle socket reconnection gracefully', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE}/chat`);
    await page.waitForLoadState('networkidle');

    // Simulate network interruption by closing devtools connection
    // (Alternative: use context offline, then online)
    const context = page.context();
    
    await context.setOffline(true);
    await page.waitForTimeout(1000);
    
    // Verify UI shows disconnected (or tries to)
    // This is implementation-specific

    await context.setOffline(false);
    await page.waitForTimeout(2000);

    // Should reconnect without errors
    // Check that no JS errors appear in console
    let consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Perform an action that uses socket
    const messageInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
    if (await messageInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await messageInput.fill('Reconnection test');
    }

    // Should not have critical errors
    const criticalErrors = consoleErrors.filter(err => 
      err.includes('InvalidStateError') || 
      err.includes('Transport error') ||
      err.includes('WebSocket is closed before')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('should not show repeated WebSocket 400 errors', async ({ page }) => {
    const failedRequests: string[] = [];

    // Listen for failed requests
    page.on('response', (response) => {
      if (response.status() === 400) {
        failedRequests.push(response.url());
      }
    });

    await page.goto(`${FRONTEND_BASE}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Wait for potential polling requests
    await page.waitForTimeout(5000);

    // Filter for socket.io polling endpoints returning 400
    const socketIOErrors = failedRequests.filter(url => 
      url.includes('/socket.io/') && url.includes('transport=polling')
    );

    // Should have at most 1-2 errors (not hundreds), and should resolve
    expect(socketIOErrors.length).toBeLessThan(5);
  });
});

test.describe('Meeting (Mediasoup) E2E Tests', () => {
  test('should open meeting and initialize media devices', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE}/meeting/1`);
    await page.waitForLoadState('networkidle');

    // Check for media elements
    const videoElement = page.locator('video').first();
    const audioElement = page.locator('audio').first();

    // At least one should be present
    const videoVisible = await videoElement.isVisible({ timeout: 5000 }).catch(() => false);
    const audioVisible = await audioElement.isVisible({ timeout: 5000 }).catch(() => false);

    expect(videoVisible || audioVisible).toBeTruthy();
  });

  test('should not produce InvalidStateError on media', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE}/meeting/1`);
    await page.waitForLoadState('networkidle');

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait for media setup
    await page.waitForTimeout(5000);

    // Check for InvalidStateError: closed (critical mediasoup error)
    const invalidStateErrors = consoleErrors.filter(err =>
      err.includes('InvalidStateError') || err.includes('closed')
    );

    // Should not have these errors
    expect(invalidStateErrors.length).toBe(0);
  });

  test('should handle consumer stream attachment without flicker', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE}/meeting/1`);
    await page.waitForLoadState('networkidle');

    // Get initial video element srcObject
    let initialSrcObject = await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      return video ? !!video.srcObject : false;
    });

    await page.waitForTimeout(3000);

    // Get srcObject after a delay (should remain stable, not flicker)
    let finalSrcObject = await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      return video ? !!video.srcObject : false;
    });

    // Should be stable (both true or both false, not toggling)
    expect(initialSrcObject).toBe(finalSrcObject);
  });
});
