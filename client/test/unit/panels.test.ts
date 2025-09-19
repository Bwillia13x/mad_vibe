import { describe, expect, it } from 'vitest'
import { formatTimestamp, resolveStatusTone } from '@/components/workbench/panels'

describe('resolveStatusTone', () => {
  it('returns amber tone for locked states', () => {
    expect(resolveStatusTone('Locked')).toBe('amber')
    expect(resolveStatusTone('lock pending')).toBe('amber')
  })

  it('returns violet tone for in progress states', () => {
    expect(resolveStatusTone('In Progress')).toBe('violet')
  })

  it('returns emerald tone for completed statuses', () => {
    expect(resolveStatusTone('Complete')).toBe('emerald')
    expect(resolveStatusTone('Syncing')).toBe('emerald')
  })

  it('defaults to slate when status is unknown', () => {
    expect(resolveStatusTone('Awaiting')).toBe('slate')
  })
})

describe('formatTimestamp', () => {
  it('returns "Just now" when value is null or invalid', () => {
    expect(formatTimestamp(null)).toBe('Just now')
    expect(formatTimestamp('not-a-date')).toBe('Just now')
  })

  it('formats ISO timestamps into hh:mm strings', () => {
    const time = formatTimestamp('2024-01-01T15:30:00.000Z')
    expect(time).toMatch(/\d{1,2}:\d{2}/)
  })
})
