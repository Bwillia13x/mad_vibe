import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useState } from "react"
import { useValuation } from "@/hooks/useValuation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ScenarioBand } from "@/lib/workflow-data"

const bandOptions: { label: string; value: ScenarioBand }[] = [
  { label: 'Bear', value: 'bear' },
  { label: 'Base', value: 'base' },
  { label: 'Bull', value: 'bull' }
]

export function ValuationWorkbench() {
  const { assumptions, state, setScenario, updateAssumption, epv, dcf, currentScenario } = useValuation()
  const [activeTab, setActiveTab] = useState('epv')

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Valuation Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <div>
            <p className="text-[11px] uppercase text-slate-500">Scenario band</p>
            <div className="mt-2 flex gap-2">
              {bandOptions.map((band) => (
                <button
                  key={band.value}
                  type="button"
                  onClick={() => setScenario(band.value)}
                  className={cn(
                    'rounded border px-3 py-1 text-[11px] uppercase transition',
                    state.selectedScenario === band.value
                      ? 'border-emerald-500 text-emerald-200 bg-emerald-900/30'
                      : 'border-slate-600 text-slate-300 hover:bg-slate-900'
                  )}
                >
                  {band.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500">DCF Value / Share</p>
            <p className="text-lg font-semibold text-slate-100">${currentScenario.value.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500">IRR</p>
            <p className="text-lg font-semibold text-slate-100">{currentScenario.irr}%</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500">Implied MoS</p>
            <p className="text-lg font-semibold text-slate-100">{currentScenario.impliedMoS}%</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Assumptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-400">
            Adjust core assumptions to see how EPV and DCF outputs react. Scenario buttons change the edges for
            required return and growth assumptions.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-xs">
              <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Assumption</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-center">Unit</th>
                  <th className="px-3 py-2 text-right">Bear</th>
                  <th className="px-3 py-2 text-right">Base</th>
                  <th className="px-3 py-2 text-right">Bull</th>
                  <th className="px-3 py-2 text-right">Override</th>
                  <th className="px-3 py-2 text-right">Sensitivity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {assumptions.map((assumption) => (
                  <tr key={assumption.id}>
                    <td className="px-3 py-2 text-slate-200">{assumption.label}</td>
                    <td className="px-3 py-2 text-slate-400">{assumption.description}</td>
                    <td className="px-3 py-2 text-center">{assumption.unit}</td>
                    <td className="px-3 py-2 text-right">{assumption.bear}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-100">{assumption.base}</td>
                    <td className="px-3 py-2 text-right">{assumption.bull}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                        value={state.assumptionOverrides[assumption.id] ?? assumption.base}
                        onChange={(event) => updateAssumption(assumption.id, Number(event.target.value))}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {assumption.sensitivity ? (
                        <Badge variant="outline" className="border-slate-700 text-[10px] uppercase text-amber-200">
                          {assumption.sensitivity}
                        </Badge>
                      ) : (
                        <span className="text-slate-500">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Valuation Outputs</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="epv">EPV</TabsTrigger>
              <TabsTrigger value="dcf">DCF Scenarios</TabsTrigger>
            </TabsList>
            <TabsContent value="epv" className="mt-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                {epv.map((item) => (
                  <Card key={item.id} className="border-slate-800 bg-slate-950/60">
                    <CardHeader>
                      <CardTitle className="text-xs uppercase text-slate-500">{item.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold text-slate-100">{item.value}</p>
                      {item.note && <p className="text-xs text-slate-500">{item.note}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="dcf" className="mt-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                {dcf.map((scenario) => (
                  <Card
                    key={scenario.band}
                    className={cn(
                      'border px-4 py-3 text-xs',
                      scenario.band === state.selectedScenario
                        ? 'border-emerald-500 bg-emerald-900/30 text-emerald-200'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300'
                    )}
                  >
                    <CardHeader>
                      <CardTitle className="text-sm uppercase">{scenario.band}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <p>Value/share: ${scenario.value.toFixed(2)}</p>
                      <p>IRR: {scenario.irr}%</p>
                      <p>MoS: {scenario.impliedMoS}%</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
