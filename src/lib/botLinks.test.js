import { describe, it, expect } from 'vitest'
import { parseStartParam } from './botLinks'

describe('parseStartParam', () => {
  it('parses ref_', () => {
    expect(parseStartParam('ref_abc12')).toEqual({ type: 'ref', value: 'abc12' })
  })
  it('parses partner_', () => {
    expect(parseStartParam('partner_xyz')).toEqual({ type: 'partner', value: 'xyz' })
  })
  it('handles empty', () => {
    expect(parseStartParam('')).toEqual({ type: null, value: null })
  })
})
