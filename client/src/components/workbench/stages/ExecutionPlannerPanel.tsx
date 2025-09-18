import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useWorkflow } from '@/hooks/useWorkflow'
import { useScenarioLab } from '@/hooks/useScenarioLab'
import { useValuation } from '@/hooks/useValuation'
import { useMonitoring } from '@/hooks/useMonitoring'

const classifyRiskBand = (downsideProbability: number) => {
  if (downsideProbability >= 40) return 'guarded'
  if (downsideProbability >= 25) return 'balanced'
  return 'expansion'
}

export function ExecutionPlannerPanel() {
  const { getChecklist, checklistState, activeStage } = useWorkflow()
  const { simulation, state: scenarioState } = useScenarioLab()
  const { currentScenario, state: valuationState } = useValuation()
  const { alerts, deltas } = useMonitoring()

  const checklist = useMemo(() => getChecklist(activeStage.slug), [activeStage.slug, getChecklist])
  const stageState = checklistState[activeStage.slug] ?? {}
  const outstandingAlerts = alerts.filter((alert) => !alert.acknowledged)
  const riskBand = classifyRiskBand(simulation.downsideProbability)

  const readinessSignals = useMemo(() => {
    const readiness = checklist.map((item) => ({
      id: item.id,
      title: item.label,
      complete: Boolean(stageState[item.id])
    }))

    return readiness
  }, [checklist, stageState])

  const valuationSnapshot = useMemo(() => {
    const entryPrice = Number(
      (currentScenario.value * (1 - currentScenario.impliedMoS / 100)).toFixed(2)
    )
    const deepFill = Number(Math.max(simulation.p10 - 1.5, entryPrice * 0.94).toFixed(2))
    const pauseThreshold = Math.max(35, Math.round(simulation.downsideProbability + 5))
    const allocationBase = riskBand === 'guarded' ? 32 : riskBand === 'balanced' ? 40 : 55
    const initialAllocation = Math.round(allocationBase * 0.6)
    const followOnAllocation = allocationBase - initialAllocation

    return {
      entryPrice,
      deepFill,
      pauseThreshold,
      allocationBase,
      initialAllocation,
      followOnAllocation,
      band: riskBand
    }
  }, [currentScenario, simulation, riskBand])

  const orderTemplates = useMemo(() => {
    const gatingNotes = outstandingAlerts.length
      ? outstandingAlerts.map((alert) => `Block release until “${alert.title}” is acknowledged.`)
      : ['Monitoring hooks cleared.']

    const route =
      valuationSnapshot.band === 'guarded'
        ? 'VWAP program (18% participation cap, downside guard at -2%)'
        : 'Limit ladder (3 tranches) across two sessions'

    const secondRoute =
      valuationSnapshot.band === 'guarded'
        ? 'Conditional limit resting 1.5% below program bands'
        : 'Conditional dark pool sweep at liquidity windows'

    return [
      {
        title: 'Program build (T+0 start)',
        allocation: `${valuationSnapshot.initialAllocation}% of target exposure`,
        route,
        steps: [
          `Engage when live price ≤ $${valuationSnapshot.entryPrice.toFixed(2)} (MoS ${currentScenario.impliedMoS}% vs ${valuationState.selectedScenario} case).`,
          `Auto-pause if downside probability > ${valuationSnapshot.pauseThreshold}% (currently ${simulation.downsideProbability}%).`
        ],
        gatingNotes
      },
      {
        title: 'Follow-on tranche (contingent)',
        allocation: `${valuationSnapshot.followOnAllocation}% of target exposure`,
        route: secondRoute,
        steps: [
          `Stage orders at $${valuationSnapshot.deepFill.toFixed(2)} with staggered 0.6% spacing.`,
          `Trigger only after ${scenarioState.iterations} iteration run confirms downside probability < ${Math.max(valuationSnapshot.pauseThreshold - 7, 28)}%.`
        ],
        gatingNotes
      }
    ]
  }, [
    outstandingAlerts,
    valuationSnapshot,
    currentScenario,
    valuationState.selectedScenario,
    simulation.downsideProbability,
    scenarioState.iterations
  ])

  const routingAutomations = useMemo(() => {
    const alertHooks = outstandingAlerts.map((alert) => `Auto-acknowledge route requires ${alert.title} (${alert.severity}) owner: ${alert.owner ?? 'Unassigned'}.`)
    const riskSignals = deltas
      .filter((delta) => delta.status !== 'on-track')
      .map((delta) => `${delta.metric}: ${delta.status.toUpperCase()} — ${delta.description}`)

    return {
      alertHooks,
      riskSignals,
      monitoringSummary: riskSignals.length
        ? `${riskSignals.length} thesis tensions need routing guards.`
        : 'All monitoring deltas on-plan.'
    }
  }, [deltas, outstandingAlerts])

  const riskBudget = useMemo(() => {
    const guardRail = Number(simulation.p10.toFixed(2))
    const upsideRail = Number(simulation.p90.toFixed(2))
    const classification =
      riskBand === 'guarded'
        ? 'Guarded deployment'
        : riskBand === 'balanced'
          ? 'Balanced build'
          : 'Expansionary build'

    return {
      classification,
      allocation: `${valuationSnapshot.allocationBase}% position build cap`,
      guardRail,
      upsideRail,
      downsideProbability: simulation.downsideProbability,
      notes: [
        `Downside probability ${simulation.downsideProbability}% vs guard rail ${valuationSnapshot.pauseThreshold}%`,
        `Scenario spread: $${guardRail.toFixed(2)} (P10) / $${upsideRail.toFixed(2)} (P90)`
      ]
    }
  }, [simulation, valuationSnapshot, riskBand])

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Execution Readiness Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-xs text-slate-300 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase text-slate-500">Downside probability</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-semibold text-slate-100">{simulation.downsideProbability}%</p>
              <Badge
                variant="outline"
                className={
                  riskBand === 'guarded'
                    ? 'border-amber-500 text-amber-200'
                    : riskBand === 'balanced'
                      ? 'border-sky-500 text-sky-200'
                      : 'border-emerald-500 text-emerald-200'
                }
              >
                {riskBand}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500">Base case target</p>
            <p className="text-lg font-semibold text-slate-100">${currentScenario.value.toFixed(2)}</p>
            <p className="text-[11px] text-slate-500">MoS {currentScenario.impliedMoS}% on {valuationState.selectedScenario} case</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500">Alerts outstanding</p>
            <p className="text-lg font-semibold text-slate-100">{outstandingAlerts.length}</p>
            {outstandingAlerts.length > 0 && (
              <p className="text-[11px] text-amber-300">
                {outstandingAlerts[0]?.title}
                {outstandingAlerts.length > 1 ? ` +${outstandingAlerts.length - 1}` : ''}
              </p>
            )}
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500">Checklist status</p>
            <p className="text-lg font-semibold text-slate-100">
              {readinessSignals.filter((item) => item.complete).length}/{readinessSignals.length}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm text-slate-200">Automated Order Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-slate-300">
            {orderTemplates.map((template) => (
              <div key={template.title} className="rounded border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100">{template.title}</p>
                  <Badge variant="outline" className="border-slate-700 text-[10px] uppercase">
                    {template.allocation}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500">{template.route}</p>
                <ul className="mt-3 list-disc space-y-1 pl-6">
                  {template.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
                <div className="mt-3 border-t border-slate-800 pt-2 text-[11px] text-slate-500">
                  {template.gatingNotes.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm text-slate-200">Routing & Monitoring Automations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-300">
            <div className="rounded border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-[11px] uppercase text-slate-500">Alert hooks</p>
              {routingAutomations.alertHooks.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {routingAutomations.alertHooks.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[11px] text-slate-500">All monitoring alerts acknowledged.</p>
              )}
            </div>

            <div className="rounded border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-[11px] uppercase text-slate-500">Risk signals</p>
              {routingAutomations.riskSignals.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {routingAutomations.riskSignals.map((signal) => (
                    <li key={signal}>{signal}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[11px] text-slate-500">No thesis deltas breaching guard rails.</p>
              )}
            </div>

            <p className="text-[11px] text-slate-500">{routingAutomations.monitoringSummary}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Risk Budget Linkage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="border-slate-700 text-[10px] uppercase">
              {riskBudget.classification}
            </Badge>
            <p>{riskBudget.allocation}</p>
            <p>Guard rail: ${riskBudget.guardRail.toFixed(2)} | Upside rail: ${riskBudget.upsideRail.toFixed(2)}</p>
          </div>
          <ul className="list-disc space-y-1 pl-5">
            {riskBudget.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
