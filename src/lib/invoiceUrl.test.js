import { describe, it, expect } from 'vitest'
import { normalizeInvoiceUrl, isValidOpenInvoiceUrl } from './invoiceUrl'

describe('normalizeInvoiceUrl', () => {
  it('accepts canonical $ links', () => {
    const r = normalizeInvoiceUrl('https://t.me/$AAw1234abcd')
    expect(r.ok).toBe(true)
    expect(r.url).toBe('https://t.me/$AAw1234abcd')
    expect(isValidOpenInvoiceUrl(r.url)).toBe(true)
  })

  it('rewrites telegram.me to t.me (real Bot API response)', () => {
    const r = normalizeInvoiceUrl('https://telegram.me/$ZMvSYw8wsUpJFwAAgZaVnWQKLjs')
    expect(r.ok).toBe(true)
    expect(r.url).toBe('https://t.me/$ZMvSYw8wsUpJFwAAgZaVnWQKLjs')
    expect(isValidOpenInvoiceUrl(r.url)).toBe(true)
  })

  it('accepts invoice/ path', () => {
    const r = normalizeInvoiceUrl('https://t.me/invoice/ABC_def-12')
    expect(r.ok).toBe(true)
    expect(r.url).toBe('https://t.me/invoice/ABC_def-12')
  })

  it('strips trailing slash and query', () => {
    const r = normalizeInvoiceUrl('https://t.me/$AAw1234abcd/?foo=1')
    expect(r.ok).toBe(true)
    expect(r.url).toBe('https://t.me/$AAw1234abcd')
  })

  it('prefixes bare $slug', () => {
    const r = normalizeInvoiceUrl('$AAw1234abcd')
    expect(r.ok).toBe(true)
    expect(r.url).toBe('https://t.me/$AAw1234abcd')
  })

  it('rejects garbage', () => {
    const r = normalizeInvoiceUrl('https://example.com/pay')
    expect(r.ok).toBe(false)
  })
})
