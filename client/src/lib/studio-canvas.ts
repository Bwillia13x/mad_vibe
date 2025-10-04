export type CanvasCardSource = 'macro' | 'formula' | 'tool'

export interface CanvasCardPayload {
  title: string
  body: string
  source: CanvasCardSource
}

const CARD_EVENT = 'studio:canvas-card'
const cardTarget = new EventTarget()

export function pushCanvasCard(payload: CanvasCardPayload) {
  cardTarget.dispatchEvent(new CustomEvent<CanvasCardPayload>(CARD_EVENT, { detail: payload }))
}

export function subscribeToCanvasCards(handler: (payload: CanvasCardPayload) => void) {
  const listener = (event: Event) => {
    const custom = event as CustomEvent<CanvasCardPayload>
    handler(custom.detail)
  }
  cardTarget.addEventListener(CARD_EVENT, listener as EventListener)
  return () => {
    cardTarget.removeEventListener(CARD_EVENT, listener as EventListener)
  }
}
