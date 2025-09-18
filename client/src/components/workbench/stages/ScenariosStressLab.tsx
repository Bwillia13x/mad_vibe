import { useScenarioLab } from "@/hooks/useScenarioLab"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function ScenariosStressLab() {
  const { drivers, presets, state, applyPreset, updateDriver, setIterations, simulation } = useScenarioLab()

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Scenario Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4 text-xs text-slate-400">
          <div>
            <p className="text-[11px] uppercase text-slate-500">Iterations</p>
            <input
              type="number"
              min={100}
              max={2000}
              value={state.iterations}
              onChange={(event) => setIterations(Number(event.target.value))}
              className="mt-1 w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500">Mean value/share</p>
            <p className="text-lg font-semibold text-slate-100">${simulation.meanValue}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500">P10 / P90</p>
            <p className="text-lg font-semibold text-slate-100">
              ${simulation.p10} — ${simulation.p90}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500">Downside probability</p>
            <p className="text-lg font-semibold text-slate-100">{simulation.downsideProbability}%</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Presets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-xs text-slate-400">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className="rounded border border-slate-700 px-3 py-1 text-[11px] uppercase transition hover:bg-slate-900"
            >
              {preset.name}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Drivers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {drivers.map((driver) => {
            const value = state.driverValues[driver.id] ?? driver.base
            const progress = ((value - driver.min) / (driver.max - driver.min)) * 100
            const tone =
              driver.impact === 'revenue'
                ? 'border-sky-600 text-sky-200'
                : driver.impact === 'margin'
                ? 'border-emerald-600 text-emerald-200'
                : 'border-amber-600 text-amber-200'
            return (
              <div key={driver.id} className="rounded border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{driver.label}</p>
                    <p className="text-slate-400">{driver.description}</p>
                  </div>
                  <Badge variant="outline" className={cn('border px-2 py-1 text-[10px] uppercase', tone)}>
                    {driver.impact}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="range"
                    min={driver.min}
                    max={driver.max}
                    step={0.5}
                    value={value}
                    onChange={(event) => updateDriver(driver.id, Number(event.target.value))}
                    className="flex-1"
                  />
                  <span className="w-16 text-right text-sm text-slate-100">
                    {value}
                    {driver.unit}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] uppercase text-slate-500">
                  <span>Range: {driver.min} – {driver.max}{driver.unit}</span>
                  <span>Base: {driver.base}{driver.unit}</span>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded bg-slate-800">
                  <div className="h-full bg-sky-500" style={{ width: `${Math.max(5, Math.min(progress, 100))}%` }} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
