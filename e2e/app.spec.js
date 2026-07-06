import { test, expect } from '@playwright/test'

test('app loads and shows title or onboarding', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()

  const title = page.getByRole('heading', { level: 1 })
  await expect(title).toBeVisible({ timeout: 15000 })

  const text = await title.textContent()
  expect(text?.length).toBeGreaterThan(0)
})

test('bottom navigation is present after load', async ({ page }) => {
  await page.goto('/')
  const nav = page.locator('nav')
  await expect(nav).toBeVisible({ timeout: 15000 })
})