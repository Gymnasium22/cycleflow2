// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const ALLOWED_ORIGINS = [
  'https://gymnasium22.github.io',
  'https://gymnasium22.github.io/cycleflow2',
  'https://gymnasium22.github.io/cycleflow2/',
  'http://localhost:5173',
  'http://localhost:4173',
]

function getCorsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-cron-secret',
    'Access-Control-Max-Age': '86400',
  }
}

function jsonResponse(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(origin),
    },
  })
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

function parseDate(input: string | Date): Date {
  const d = new Date(input)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysBetween(a: string | Date, b: string | Date): number {
  return Math.floor((parseDate(b).getTime() - parseDate(a).getTime()) / MS_PER_DAY)
}

function getActualPeriodLength(cycle: any): number {
  if (cycle.end_date) {
    return daysBetween(cycle.start_date, cycle.end_date) + 1
  }
  return cycle.period_length || 5
}

function getAveragePeriodLength(cycles: any[]): number {
  if (cycles.length === 0) return 5
  const lengths = cycles.map((c) => getActualPeriodLength(c)).filter((l) => l > 0)
  if (lengths.length === 0) return 5
  return Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
}

function getAverageCycleLength(cycles: any[]): number {
  if (cycles.length === 0) return 28
  if (cycles.length === 1) return cycles[0].cycle_length || 28

  const sorted = [...cycles].sort((a, b) => parseDate(a.start_date).getTime() - parseDate(b.start_date).getTime())
  const intervals = []
  for (let i = 1; i < sorted.length; i++) {
    const days = daysBetween(sorted[i - 1].start_date, sorted[i].start_date)
    if (days > 0) intervals.push(days)
  }
  if (intervals.length === 0) return 28
  return Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
}

function getLocalTime(timezone: string): { hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(new Date())
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '00', 10)
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '00', 10)
  return { hour, minute }
}

function formatLocalTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function getLocalDateString(timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(new Date())
  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  return `${year}-${month}-${day}`
}

function getLocalDayOfWeek(timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  })
  const shortDay = formatter.format(new Date())
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return map[shortDay] ?? 0
}

function getUserIdFromToken(authHeader: string): string | null {
  try {
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) return null
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) return null
    const payload = JSON.parse(atob(payloadBase64))
    return payload?.sub || null
  } catch (err) {
    console.error('[send-notifications] Failed to decode token:', err.message)
    return null
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin')

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    })
  }

  const cronSecret = Deno.env.get('CRON_SECRET')
  const requestSecret = req.headers.get('x-cron-secret')
  const url = new URL(req.url)
  const querySecret = url.searchParams.get('secret')
  const authHeader = req.headers.get('Authorization') || ''
  // Supabase gateway already validates the Authorization header.
  // Any request reaching this function with a valid bearer token is treated as user-initiated.
  const isUserAuthorized = authHeader.startsWith('Bearer ')
  // Cron jobs must additionally provide the cron secret.
  const isCronAuthorized = cronSecret && (requestSecret === cronSecret || querySecret === cronSecret)

  console.log('[send-notifications] Received request', {
    method: req.method,
    hasCronSecret: !!cronSecret,
    hasRequestSecret: !!requestSecret,
    hasQuerySecret: !!querySecret,
    isUserAuthorized,
    isCronAuthorized,
  })

  if (!isUserAuthorized && !isCronAuthorized) {
    console.warn('[send-notifications] Unauthorized request')
    return jsonResponse({ error: 'Unauthorized' }, 401, origin)
  }

  // Parse request body to detect test mode
  let requestBody: any = {}
  try {
    if (req.method !== 'GET') {
      requestBody = await req.json()
    }
  } catch {
    requestBody = {}
  }

  const isTestMode = requestBody?.test === true
  const testUserId = isTestMode && isUserAuthorized ? getUserIdFromToken(authHeader) : null

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || Deno.env.get('BOT_TOKEN')
  if (!botToken) {
    console.error('[send-notifications] Bot token not configured')
    return jsonResponse({ error: 'Bot token not configured' }, 500, origin)
  }

  const supabaseUrl = Deno.env.get('SB_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SB_SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[send-notifications] Supabase credentials not configured')
    return jsonResponse({ error: 'Supabase credentials not configured' }, 500, origin)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get users with notifications enabled
  const { data: settings, error: settingsError } = await supabaseAdmin
    .from('settings')
    .select(`
      *,
      profiles:user_id (telegram_id, language_code, cycle_length, period_length, timezone)
    `)

  if (settingsError) {
    console.error('[send-notifications] Settings fetch error:', settingsError)
    return jsonResponse({ error: settingsError.message }, 500, origin)
  }

  console.log('[send-notifications] Fetched settings:', { count: settings?.length || 0 })

  const notifications = []

  // Test mode: send a test message to the current user regardless of time/settings
  if (isTestMode && testUserId) {
    const testSetting = settings?.find((s: any) => s.user_id === testUserId)
    const testProfile = testSetting?.profiles as any
    if (testProfile?.telegram_id) {
      const lang = testProfile.language_code === 'en' ? 'en' : 'ru'
      const message = lang === 'en'
        ? '🔔 Test notification from CycleFlow. Everything is working!'
        : '🔔 Тестовое уведомление от CycleFlow. Всё работает!'
      notifications.push(sendMessage(botToken, testProfile.telegram_id, message))
      console.log('[send-notifications] Test notification queued for user:', testUserId)
    } else {
      console.warn('[send-notifications] Test mode: no telegram_id for user:', testUserId)
      return jsonResponse({ error: 'No telegram_id linked to this account' }, 400, origin)
    }
  }

  for (const setting of settings || []) {
    const profile = setting.profiles as any
    if (!profile?.telegram_id) continue

    const timezone = profile.timezone || 'UTC'
    const localTime = getLocalTime(timezone)
    const notifyTime = setting.notify_time || '09:00'
    const [notifyHour, notifyMinute] = notifyTime.split(':').map(Number)

    // Only send notifications within 15-minute window of configured time
    const isTimeMatch = localTime.hour === notifyHour && localTime.minute >= notifyMinute && localTime.minute < notifyMinute + 15
    if (!isTimeMatch) continue

    // Get all cycles for user to calculate averages
    const { data: cycles } = await supabaseAdmin
      .from('cycles')
      .select('*')
      .eq('user_id', setting.user_id)
      .order('start_date', { ascending: false })

    const lastCycle = cycles?.[0]
    if (!lastCycle) continue

    const avgCycleLength = getAverageCycleLength(cycles || [])
    const avgPeriodLength = getAveragePeriodLength(cycles || [])
    const fallbackCycleLength = lastCycle.cycle_length || profile.cycle_length || 28
    const cycleLength = avgCycleLength || fallbackCycleLength

    const periodReminderDays = setting.period_reminder_days || 2
    const ovulationReminderDays = setting.ovulation_reminder_days || 1

    const lastStart = parseDate(lastCycle.start_date)

    // Calculate next period based on average cycle length
    let nextPeriod = new Date(lastStart)
    while (nextPeriod.getTime() <= today.getTime()) {
      nextPeriod.setDate(nextPeriod.getDate() + cycleLength)
    }

    const daysUntilPeriod = Math.ceil((nextPeriod.getTime() - today.getTime()) / MS_PER_DAY)

    // Calculate ovulation (14 days before next period)
    const ovulation = new Date(nextPeriod)
    ovulation.setDate(ovulation.getDate() - 14)
    const daysUntilOvulation = Math.ceil((ovulation.getTime() - today.getTime()) / MS_PER_DAY)

    const lang = profile.language_code === 'en' ? 'en' : 'ru'

    // Period notification
    if (setting.notify_period && daysUntilPeriod === periodReminderDays) {
      const message = lang === 'en'
        ? `🩸 Your period is expected in ${daysUntilPeriod} days. Take care of yourself!`
        : `🩸 Месячные ожидаются через ${daysUntilPeriod} дня. Берегите себя!`

      notifications.push(sendMessage(botToken, profile.telegram_id, message))
    }

    // Ovulation notification
    if (setting.notify_ovulation && daysUntilOvulation === ovulationReminderDays) {
      const message = lang === 'en'
        ? `✨ Ovulation is expected in ${daysUntilOvulation} day${daysUntilOvulation === 1 ? '' : 's'}. This is your most fertile time.`
        : `✨ Овуляция ожидается через ${daysUntilOvulation} ${daysUntilOvulation === 1 ? 'день' : 'дня'}. Это ваше самое фертильное время.`

      notifications.push(sendMessage(botToken, profile.telegram_id, message))
    }
  }

  // --- Medication reminders ---
  try {
    const { data: reminders, error: remindersError } = await supabaseAdmin
      .from('medication_reminders')
      .select(`
        *,
        medications:medication_id (name, dosage, color),
        profiles:user_id (telegram_id, language_code, timezone)
      `)
      .eq('enabled', true)

    if (remindersError) {
      console.error('[send-notifications] Medication reminders fetch error:', remindersError)
    } else if (reminders && reminders.length > 0) {
      for (const reminder of reminders) {
        const profile = reminder.profiles as any
        const medication = reminder.medications as any
        if (!profile?.telegram_id || !medication) continue

        const timezone = profile.timezone || 'UTC'
        const localDay = getLocalDayOfWeek(timezone)
        if (!reminder.days_of_week.includes(localDay)) continue

        const localTime = getLocalTime(timezone)
        const [reminderHour, reminderMinute] = reminder.time.split(':').map(Number)
        const isTimeMatch = localTime.hour === reminderHour && localTime.minute >= reminderMinute && localTime.minute < reminderMinute + 15
        if (!isTimeMatch) continue

        const localDate = getLocalDateString(timezone)

        // Check if already sent today for this reminder
        const { data: existingLogs } = await supabaseAdmin
          .from('medication_logs')
          .select('id')
          .eq('reminder_id', reminder.id)
          .eq('scheduled_date', localDate)
          .limit(1)

        if (existingLogs && existingLogs.length > 0) continue

        const lang = profile.language_code === 'en' ? 'en' : 'ru'
        const dosage = medication.dosage ? ` (${medication.dosage})` : ''
        const message = lang === 'en'
          ? `💊 Reminder: ${medication.name}${dosage}. Don't forget to take it!`
          : `💊 Напоминание: ${medication.name}${dosage}. Не забудь принять!`

        notifications.push(
          sendMessage(botToken, profile.telegram_id, message).then(async (result: any) => {
            if (result.ok) {
              const { error: logError } = await supabaseAdmin
                .from('medication_logs')
                .insert({
                  reminder_id: reminder.id,
                  medication_id: reminder.medication_id,
                  user_id: reminder.user_id,
                  scheduled_date: localDate,
                  status: 'pending',
                })
              if (logError) {
                console.error('[send-notifications] Failed to insert medication log:', logError)
              }
            }
            return result
          })
        )
      }
    }
  } catch (err) {
    console.error('[send-notifications] Medication reminders error:', err.message)
  }

  const results = await Promise.all(notifications)
  console.log('[send-notifications] Sent notifications:', { count: notifications.length, results })

  return jsonResponse({ success: true, sent: notifications.length }, 200, origin)
})

async function sendMessage(botToken: string, chatId: number, text: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    })
    const data = await response.json()
    if (!response.ok || !data.ok) {
      console.error('[send-notifications] Telegram send error:', { chatId, error: data })
    } else {
      console.log('[send-notifications] Telegram message sent:', { chatId })
    }
    return { chatId, ok: data.ok, error: data.description }
  } catch (err) {
    console.error('[send-notifications] Telegram send exception:', { chatId, error: err.message })
    return { chatId, ok: false, error: err.message }
  }
}
