import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const shot = (name) => path.join(__dirname, `../${name}`)

test('doctor PDF export shows ready card with Share', async ({ page }) => {
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('PAGE_ERROR', msg.text())
  })
  page.on('pageerror', (err) => console.log('PAGE_EXCEPTION', err.message))

  await page.addInitScript(() => {
    const profile = {
      id: 'fallback-user',
      telegram_id: 123456,
      first_name: 'Test',
      username: 'test_user',
      language_code: 'ru',
      cycle_length: 28,
      period_length: 5,
      onboarding_completed: true,
      timezone: 'Europe/Moscow',
      premium_until: new Date(Date.now() + 86400000).toISOString(),
      disclaimer_accepted_at: new Date().toISOString(),
    }
    localStorage.setItem('cicle_fallback_profile', JSON.stringify(profile))
    localStorage.setItem('cicle_profile', JSON.stringify(profile))
    localStorage.setItem('cicle_disclaimer_accepted', '1')
    localStorage.setItem('i18nextLng', 'ru')
    localStorage.setItem('cicle_theme', 'sakura')
    localStorage.setItem(
      'cicle_cycles',
      JSON.stringify([
        { id: 'c1', start_date: '2026-06-01', end_date: '2026-06-05', period_length: 5, cycle_length: 28 },
        { id: 'c2', start_date: '2026-06-29', end_date: '2026-07-03', period_length: 5, cycle_length: 28 },
      ])
    )
    localStorage.setItem(
      'cicle_settings',
      JSON.stringify({
        notify_period: true,
        notify_ovulation: false,
        notify_time: '09:00',
        period_reminder_days: 2,
        ovulation_reminder_days: 1,
      })
    )
  })

  await page.goto('/')
  await page.waitForTimeout(2000)

  // Bottom nav Settings — last button
  await page.locator('nav button').last().click()
  await page.waitForTimeout(1000)

  // Must be Settings heading
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Настройки|Settings/i)

  // Scroll to export section
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(500)

  await page.screenshot({ path: shot('review-pdf-settings.png'), fullPage: true })

  // Prefer exact Russian label from i18n
  const pdfBtn = page.locator('button', { hasText: 'Отчёт для врача' }).first()
  await expect(pdfBtn).toBeVisible({ timeout: 10000 })
  await pdfBtn.scrollIntoViewIfNeeded()
  await pdfBtn.click()

  // Building label may appear
  await page.waitForTimeout(300)

  // Ready card — by id or title text
  const readyTitle = page.getByText('PDF готов', { exact: false })
  await expect(readyTitle.first()).toBeVisible({ timeout: 45000 })

  await page.screenshot({ path: shot('review-pdf-ready.png'), fullPage: true })

  const shareBtn = page.locator('#pdf-ready-card button').filter({ hasText: /Поделиться|Share|Сохранить PDF/i }).first()
  await expect(shareBtn).toBeVisible({ timeout: 5000 })

  const viewBtn = page.locator('#pdf-ready-card button').filter({ hasText: /Показать|View/i }).first()
  await expect(viewBtn).toBeVisible()
  await viewBtn.click()
  await page.waitForTimeout(1000)

  await page.screenshot({ path: shot('review-pdf-preview.png'), fullPage: true })

  // Fullscreen preview actions
  await expect(page.getByRole('button', { name: /Поделиться|Share/i }).first()).toBeVisible()
})
