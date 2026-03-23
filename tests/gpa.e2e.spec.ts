import { test, expect } from '@playwright/test'

test.describe('GPA Calculator', () => {
  test('loads GPA page and adds a course', async ({ page }) => {
    await page.goto('http://localhost:5173/gpa')
    await expect(page.locator('text=GPA Calculator')).toBeVisible()

    // Add a new course row
    await page.click('button:has-text("Add Course")')
    const rows = page.locator('.gpa-row')
    await expect(rows).toHaveCount(1)

    // Fill fields
    await rows.locator('input[name="course"]').fill('Calculus')
    await rows.locator('input[name="grade"]').fill('A')
    await rows.locator('input[name="credits"]').fill('3')

    // Calculate/Save
    await page.click('button:has-text("Save")')
    await expect(page.locator('text=Saved')).toBeVisible({ timeout: 3000 })
  })
})
