import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  mergeSettingsDraft,
  settingsDraftChanged,
  normalizeNotifyTime,
  createDebouncedSaver,
  DEFAULT_SETTINGS_DRAFT,
} from './settingsDraft'

describe('mergeSettingsDraft', () => {
  it('merges updates over defaults', () => {
    expect(mergeSettingsDraft(null, { ovulation_reminder_days: 4 })).toEqual({
      ...DEFAULT_SETTINGS_DRAFT,
      ovulation_reminder_days: 4,
    })
  })

  it('preserves existing fields', () => {
    const base = { ...DEFAULT_SETTINGS_DRAFT, notify_ovulation: true, period_reminder_days: 5 }
    expect(mergeSettingsDraft(base, { ovulation_reminder_days: 3 }).period_reminder_days).toBe(5)
    expect(mergeSettingsDraft(base, { ovulation_reminder_days: 3 }).notify_ovulation).toBe(true)
  })
})

describe('settingsDraftChanged', () => {
  it('detects ovulation days change', () => {
    const a = { ...DEFAULT_SETTINGS_DRAFT, ovulation_reminder_days: 1 }
    const b = { ...DEFAULT_SETTINGS_DRAFT, ovulation_reminder_days: 4 }
    expect(settingsDraftChanged(a, b)).toBe(true)
  })

  it('ignores identical drafts', () => {
    const a = { ...DEFAULT_SETTINGS_DRAFT }
    const b = { ...DEFAULT_SETTINGS_DRAFT }
    expect(settingsDraftChanged(a, b)).toBe(false)
  })
})

describe('normalizeNotifyTime', () => {
  it('trims seconds from postgres time', () => {
    expect(normalizeNotifyTime('09:00:00')).toBe('09:00')
    expect(normalizeNotifyTime('18:30:00')).toBe('18:30')
  })

  it('keeps HH:MM', () => {
    expect(normalizeNotifyTime('07:15')).toBe('07:15')
  })
})

describe('createDebouncedSaver', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces rapid changes and saves last value', async () => {
    const saveFn = vi.fn(async (v) => v)
    const saver = createDebouncedSaver(saveFn, 400)

    saver.schedule({ ovulation_reminder_days: 2 })
    saver.schedule({ ovulation_reminder_days: 3 })
    saver.schedule({ ovulation_reminder_days: 5 })

    expect(saveFn).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(400)
    expect(saveFn).toHaveBeenCalledTimes(1)
    expect(saveFn).toHaveBeenCalledWith({ ovulation_reminder_days: 5 })
  })

  it('flush saves immediately without waiting for debounce (tab leave)', async () => {
    const saveFn = vi.fn(async (v) => v)
    const saver = createDebouncedSaver(saveFn, 500)

    saver.schedule({ ovulation_reminder_days: 4 })
    expect(saveFn).not.toHaveBeenCalled()

    const result = await saver.flush()
    expect(saveFn).toHaveBeenCalledTimes(1)
    expect(saveFn).toHaveBeenCalledWith({ ovulation_reminder_days: 4 })
    expect(result).toEqual({ ovulation_reminder_days: 4 })
    expect(saver.getPending()).toBeNull()
  })

  it('flush after debounce already fired is a no-op save', async () => {
    const saveFn = vi.fn(async (v) => v)
    const saver = createDebouncedSaver(saveFn, 200)
    saver.schedule({ notify_ovulation: true })
    await vi.advanceTimersByTimeAsync(200)
    expect(saveFn).toHaveBeenCalledTimes(1)
    await saver.flush()
    expect(saveFn).toHaveBeenCalledTimes(1)
  })
})
