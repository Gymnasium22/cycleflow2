import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

serve(async () => {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!botToken) {
    return new Response(JSON.stringify({ error: 'Bot token not configured' }), { status: 500 })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    // Get last cycle
    const { data: cycles } = await supabaseAdmin
      .from('cycles')
      .select('*')
      .eq('user_id', setting.user_id)
      .order('start_date', { ascending: false })
      .limit(1)

    const lastCycle = cycles?.[0]
    if (!lastCycle) continue

    const cycleLength = lastCycle.cycle_length || profile.cycle_length || 28
    const periodReminderDays = setting.period_reminder_days || 2

    const lastStart = new Date(lastCycle.start_date)
    lastStart.setHours(0, 0, 0, 0)

    // Calculate next period
    let nextPeriod = new Date(lastStart)
    while (nextPeriod.getTime() <= today.getTime()) {
      nextPeriod.setDate(nextPeriod.getDate() + cycleLength)
    }

    const daysUntilPeriod = Math.ceil((nextPeriod.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Calculate ovulation (14 days before next period)
    const ovulation = new Date(nextPeriod)
    ovulation.setDate(ovulation.getDate() - 14)
    const daysUntilOvulation = Math.ceil((ovulation.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    const lang = profile.language_code === 'en' ? 'en' : 'ru'

    // Period notification
    if (setting.notify_period && daysUntilPeriod === periodReminderDays) {
      const message = lang === 'en'
        ? `🩸 Your period is expected in ${daysUntilPeriod} days. Take care of yourself!`
        : `🩸 Месячные ожидаются через ${daysUntilPeriod} дня. Берегите себя!`

      notifications.push(sendMessage(botToken, profile.telegram_id, message))
    }

    // Ovulation notification
    if (setting.notify_ovulation && daysUntilOvulation === 0) {
      const message = lang === 'en'
        ? `✨ Ovulation is expected today. This is your most fertile day.`
        : `✨ Овуляция ожидается сегодня. Это ваш самый фертильный день.`

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
