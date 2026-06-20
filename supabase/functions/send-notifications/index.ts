import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

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

serve(async () => {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || Deno.env.get('BOT_TOKEN')
  if (!botToken) {
    return new Response(JSON.stringify({ error: 'Bot token not configured' }), { status: 500 })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SB_URL') ?? '',
    Deno.env.get('SB_SERVICE_ROLE_KEY') ?? ''
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get users with notifications enabled
  const { data: settings, error: settingsError } = await supabaseAdmin
    .from('settings')
    .select(`
      *,
      profiles:user_id (telegram_id, language_code, cycle_length, period_length)
    `)

  if (settingsError) {
    return new Response(JSON.stringify({ error: settingsError.message }), { status: 500 })
  }

  const notifications = []

  for (const setting of settings || []) {
    const profile = setting.profiles as any
    if (!profile?.telegram_id) continue

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

  await Promise.all(notifications)

  return new Response(
    JSON.stringify({ success: true, sent: notifications.length }),
    { status: 200 }
  )
})

async function sendMessage(botToken: string, chatId: number, text: string) {
  return fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  })
}
