import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Calendar as CalendarIcon, Link2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { useToast } from '@/hooks/use-toast'

type Props = { open: boolean; onOpenChange: (open: boolean) => void }

const scenarios = [
  { value: 'default', label: 'Default' },
  { value: 'busy_day', label: 'Busy Day' },
  { value: 'low_inventory', label: 'Low Inventory' },
  { value: 'appointment_gaps', label: 'Appointment Gaps' }
]

export default function DemoControls({ open, onOpenChange }: Props) {
  const qc = useQueryClient()
  const { data } = useQuery<any>({ queryKey: ['/api/health'] })
  const [scenario, setScenario] = useState('default')
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState<string>('')
  const [seed, setSeed] = useState<string>('')
  const { toast } = useToast()

  useEffect(() => {
    if (data?.scenario) setScenario(data.scenario)
    if (typeof data?.seed !== 'undefined' && data.seed !== null) setSeed(String(data.seed))
    if (data?.freeze?.date) {
      const d = new Date(data.freeze.date)
      setDate(d)
      const pad = (n: number) => String(n).padStart(2, '0')
      setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`)
    } else {
      setDate(undefined)
      setTime('')
    }
  }, [data])

  const reseedScenario = async () => {
    const qs = new URLSearchParams()
    qs.set('scenario', scenario)
    const seedNum = parseInt(seed, 10)
    if (!Number.isNaN(seedNum)) qs.set('seed', String(seedNum))
    await fetch(`/api/demo/seed?${qs.toString()}`, { method: 'POST' })
    await qc.invalidateQueries({ queryKey: ['/api/health'] })
  }

  const freezeToDate = async () => {
    if (!date) return
    const d = new Date(date)
    if (time) {
      const [h, m] = time.split(':').map((x) => parseInt(x, 10))
      d.setHours(h || 0, m || 0, 0, 0)
    }
    const iso = d.toISOString()
    await fetch(`/api/demo/time?date=${encodeURIComponent(iso)}`, { method: 'POST' })
    await qc.invalidateQueries({ queryKey: ['/api/health'] })
  }

  const freezeNow = async () => {
    await fetch('/api/demo/time', { method: 'POST' })
    await qc.invalidateQueries({ queryKey: ['/api/health'] })
  }

  const clearFreeze = async () => {
    await fetch('/api/demo/time?clear=1', { method: 'POST' })
    await qc.invalidateQueries({ queryKey: ['/api/health'] })
  }

  const resetDemo = async () => {
    await fetch('/api/demo/reset', { method: 'POST' })
    await qc.invalidateQueries({ queryKey: ['/api/health'] })
  }

  const copyDemoLink = async () => {
    try {
      const url = new URL(window.location.href)
      const health = await fetch('/api/health').then((r) => r.json())
      url.searchParams.set('scenario', scenario)
      const seedNum = parseInt(seed || String(health?.seed ?? ''), 10)
      if (!Number.isNaN(seedNum)) url.searchParams.set('seed', String(seedNum))
      let freezeIso: string | null = null
      if (date) {
        const d = new Date(date)
        if (time) {
          const [h, m] = time.split(':').map((x) => parseInt(x, 10))
          d.setHours(h || 0, m || 0, 0, 0)
        }
        freezeIso = d.toISOString()
      } else if (health?.freeze?.date) {
        freezeIso = health.freeze.date
      }
      if (freezeIso) url.searchParams.set('freeze', freezeIso)
      await navigator.clipboard.writeText(url.toString())
      toast({ description: 'Demo link copied to clipboard' })
    } catch (e) {
      console.error('Failed to copy demo link', e)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[100vw] sm:w-[540px] max-w-[100vw]">
        <SheetHeader>
          <SheetTitle>Demo Controls</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <div className="text-sm font-medium mb-2">Scenario</div>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="w-full border rounded-md p-2 bg-background"
              data-testid="select-scenario"
            >
              {scenarios.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-1">Seed (deterministic state)</div>
              <input
                type="number"
                inputMode="numeric"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="w-full border rounded-md p-2 bg-background"
                placeholder="e.g. 12345"
                data-testid="input-seed"
              />
            </div>
            <div className="mt-2 flex gap-2 flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={reseedScenario} data-testid="button-apply-scenario">
                    Apply Scenario
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reseed data for selected scenario/seed</TooltipContent>
              </Tooltip>
              <div className="flex items-center gap-1">
                <span className="text-xs opacity-70">Presets:</span>
                {[123, 999, 2025].map((p) => (
                  <Button key={p} variant="outline" size="sm" onClick={() => setSeed(String(p))}>{p}</Button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Freeze Time</div>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? date.toLocaleDateString() : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="border rounded-md p-2 bg-background" />
            </div>
            <div className="mt-2 flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={freezeToDate} disabled={!date} data-testid="button-freeze-date">
                    Freeze to Date
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Lock today to the chosen date/time</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={freezeNow} data-testid="button-freeze-now">
                    Freeze Now
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Lock today to current time</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={clearFreeze} data-testid="button-clear-freeze">
                    Clear Freeze
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Resume real-time clock</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Share</div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={copyDemoLink} data-testid="button-copy-demo-link">
                  <Link2 className="h-4 w-4 mr-2" /> Copy Demo Link
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy URL with scenario/seed/freeze</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-controls">
            Close
          </Button>
          <Button variant="outline" onClick={resetDemo} data-testid="button-reset-demo-drawer">
            Reset Demo
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
