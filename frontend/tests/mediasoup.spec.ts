import { test, expect } from '@playwright/test'

test.describe('Mediasoup end-to-end', () => {
  test('join meeting as guest and initialize mediasoup', async ({ page }) => {
    // Use fake media (Playwright will pass flags via config when launching)
    const roomId = process.env.TEST_ROOM_ID || '4'
    const guestName = 'e2e-guest'

    // Capture console messages
    const logs: string[] = []
    page.on('console', (msg) => {
      try { logs.push(msg.text()) } catch (e) {}
    })

    // Navigate to the meeting as guest
    await page.goto(`/meeting/${roomId}?guest=true&guest_name=${guestName}`)

    // Wait for mediasoup join logs in console
    const joined = await page.waitForEvent('console', { timeout: 30000, predicate: (m) => m.text().includes('Room joined') || m.text().includes('Transport created') })
    expect(joined.text()).toMatch(/Room joined|Transport created/)

    // Also ensure the network status shows a socket transport
    const transportText = await page.locator('.network-transport').innerText().catch(() => '')
    expect(transportText.length).toBeGreaterThan(0)

    // Basic health: check local video element or placeholder is present
    await expect(page.locator('video')).toHaveCountGreaterThan(0)
  })
})
