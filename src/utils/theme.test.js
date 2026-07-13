import { describe, it, expect } from 'vitest'
import { AVAILABLE_THEMES, resolveStoredTheme } from './theme'

describe('resolveStoredTheme', () => {
  it('prefers saved custom theme even inside Telegram WebApp', () => {
    expect(resolveStoredTheme(true, 'sakura')).toBe('sakura')
    expect(resolveStoredTheme(true, 'lavender')).toBe('lavender')
    expect(resolveStoredTheme(true, 'midnight')).toBe('midnight')
    expect(resolveStoredTheme(true, 'teal')).toBe('teal')
  })

  it('prefers saved telegram theme', () => {
    expect(resolveStoredTheme(true, 'telegram')).toBe('telegram')
  })

  it('falls back to telegram only when nothing saved and in Telegram', () => {
    expect(resolveStoredTheme(true, null)).toBe('telegram')
    expect(resolveStoredTheme(true, '')).toBe('telegram')
    expect(resolveStoredTheme(true, 'unknown')).toBe('telegram')
  })

  it('falls back to sakura outside Telegram when nothing saved', () => {
    expect(resolveStoredTheme(false, null)).toBe('sakura')
    expect(resolveStoredTheme(false, 'bogus')).toBe('sakura')
  })

  it('only accepts known themes', () => {
    for (const t of AVAILABLE_THEMES) {
      expect(resolveStoredTheme(false, t)).toBe(t)
    }
  })
})
