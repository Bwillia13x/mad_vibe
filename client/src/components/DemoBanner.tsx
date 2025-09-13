import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import DemoControls from '@/components/DemoControls'

export default function DemoBanner() {
  const [open, setOpen] = useState(false)
  const { data, refetch, isFetching } = useQuery<any>({ queryKey: ['/api/health'] })
  const demo = !!data?.aiDemoMode
  const scenario = data?.scenario || 'default'
  const seed = typeof data?.seed !== 'undefined' && data?.seed !== null ? String(data.seed) : null
  const frozen = !!data?.freeze?.frozen
  const freezeDate = data?.freeze?.date

  const reseed = async (s: string) => {
    await fetch(`/api/demo/seed?scenario=${encodeURIComponent(s)}`, { method: 'POST' })
    await refetch()
  }

  const freezeNow = async () => {
    await fetch(`/api/demo/time`, { method: 'POST' })
    await refetch()
  }
  const clearFreeze = async () => {
    await fetch(`/api/demo/time?clear=1`, { method: 'POST' })
    await refetch()
  }
  const resetDemo = async () => {
    await fetch(`/api/demo/reset`, { method: 'POST' })
    await refetch()
  }

  if (!demo) return null
  return (
    <div className="w-full bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 text-sm px-3 py-2 flex items-center justify-between">
      <div role="status" aria-live="polite">
        Demo mode: AI live responses disabled. Current scenario: <strong>{scenario}</strong>
        {seed && <span className="ml-2">Seed: <strong>{seed}</strong></span>}
        {frozen && (
          <span className="ml-2">Time frozen at <strong>{new Date(freezeDate).toLocaleString()}</strong></span>
        )}
        <span className="ml-3 opacity-80">Tip: Click Reset to restore the default demo state.</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span>Switch scenario:</span>
        <Button variant="outline" size="sm" onClick={() => reseed('default')} disabled={isFetching}>Default</Button>
        <Button variant="outline" size="sm" onClick={() => reseed('busy_day')} disabled={isFetching}>Busy Day</Button>
        <Button variant="outline" size="sm" onClick={() => reseed('low_inventory')} disabled={isFetching}>Low Inventory</Button>
        <Button variant="outline" size="sm" onClick={() => reseed('appointment_gaps')} disabled={isFetching}>Appointment Gaps</Button>
        <span className="mx-2">|</span>
        {!frozen ? (
          <Button aria-label="Freeze time now" variant="outline" size="sm" onClick={freezeNow} disabled={isFetching}>Freeze Now</Button>
        ) : (
          <Button aria-label="Clear time freeze" variant="outline" size="sm" onClick={clearFreeze} disabled={isFetching}>Clear Freeze</Button>
        )}
        <span className="mx-2">|</span>
        <Button aria-label="Open demo controls" variant="outline" size="sm" onClick={() => setOpen(true)} data-testid="button-demo-controls">
          Controls
        </Button>
        <Button aria-label="Reset demo" variant="outline" size="sm" onClick={resetDemo} data-testid="button-reset-demo">
          Reset
        </Button>

        {/* Quick Seed presets */}
        <span className="mx-2">|</span>
        <span className="text-xs opacity-70">Seed:</span>
        {[123, 999, 2025].map((p) => (
          <Button
            key={p}
            variant="outline"
            size="sm"
            onClick={async () => {
              await fetch(`/api/demo/seed?scenario=${encodeURIComponent(scenario)}&seed=${p}` , { method: 'POST' })
              await refetch()
            }}
            aria-label={`Apply seed ${p}`}
            title={`Use seed ${p}`}
          >
            {p}
          </Button>
        ))}
      </div>
      <DemoControls open={open} onOpenChange={setOpen} />
    </div>
  )
}
