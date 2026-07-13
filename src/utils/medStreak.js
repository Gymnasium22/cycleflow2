/**
 * Medication adherence streak from logs.
 * status: taken | skipped | pending
 */
export function computeMedicationStreak(logs, { today } = {}) {
  if (!logs?.length) return { streak: 0, takenTotal: 0, skippedTotal: 0, adherence: null }

  const todayStr =
    today ||
    new Date().toISOString().slice(0, 10)

  const byDate = {}
  let takenTotal = 0
  let skippedTotal = 0

  for (const log of logs) {
    const d = log.date || log.log_date
    if (!d) continue
    if (!byDate[d]) byDate[d] = { taken: 0, skipped: 0, total: 0 }
    byDate[d].total += 1
    if (log.status === 'taken') {
      byDate[d].taken += 1
      takenTotal += 1
    } else if (log.status === 'skipped') {
      byDate[d].skipped += 1
      skippedTotal += 1
    }
  }

  // Streak: consecutive days ending today (or yesterday) where all scheduled doses were taken
  const dates = Object.keys(byDate).sort()
  let streak = 0
  let cursor = new Date(todayStr + 'T12:00:00')

  for (let i = 0; i < 60; i++) {
    const key = cursor.toISOString().slice(0, 10)
    const day = byDate[key]
    if (!day || day.total === 0) {
      // no logs that day — break unless looking at future
      if (key > todayStr) {
        cursor.setDate(cursor.getDate() - 1)
        continue
      }
      break
    }
    if (day.taken > 0 && day.skipped === 0 && day.taken === day.total) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    } else if (day.taken > 0 && day.skipped === 0) {
      // partial day with only taken (some pending) — count if no skips
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  const decided = takenTotal + skippedTotal
  const adherence = decided > 0 ? Math.round((takenTotal / decided) * 100) : null

  return { streak, takenTotal, skippedTotal, adherence, daysLogged: dates.length }
}
