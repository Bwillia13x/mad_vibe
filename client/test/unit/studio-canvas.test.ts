import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { pushCanvasCard, subscribeToCanvasCards } from '@/lib/studio-canvas'

vi.useFakeTimers()

describe('studio-canvas event bus', () => {
  let handler: ReturnType<typeof subscribeToCanvasCards> | null = null
  let callback: ReturnType<typeof vi.fn>

  beforeEach(() => {
    callback = vi.fn()
    handler = subscribeToCanvasCards(callback)
  })

  afterEach(() => {
    handler?.()
    handler = null
    vi.clearAllMocks()
  })

  it('delivers pushed payloads to subscribers', () => {
    const payload = {
      title: 'Test card',
      body: 'Body text',
      source: 'macro' as const
    }

    pushCanvasCard(payload)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(payload)
  })

  it('supports multiple pushes', () => {
    const payloads = [
      { title: 'One', body: 'First', source: 'formula' as const },
      { title: 'Two', body: 'Second', source: 'macro' as const }
    ]

    payloads.forEach(pushCanvasCard)

    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenNthCalledWith(1, payloads[0])
    expect(callback).toHaveBeenNthCalledWith(2, payloads[1])
  })

  it('stops receiving events after unsubscribe', () => {
    handler?.()
    pushCanvasCard({ title: 'Ignored', body: 'nope', source: 'tool' })
    expect(callback).not.toHaveBeenCalled()
  })
})
