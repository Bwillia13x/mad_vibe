import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useDataNormalization } from '@/hooks/useDataNormalization'
import { useOwnerEarnings } from '@/hooks/useOwnerEarnings'
import { useValuation } from '@/hooks/useValuation'
import { useScenarioLab } from '@/hooks/useScenarioLab'
import { useMonitoring } from '@/hooks/useMonitoring'
import { useMemoComposer } from '@/hooks/useMemoComposer'

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)))

const gradeFromScore = (score: number) => {
  if (score >= 92) return { label: 'A', tone: 'border-emerald-500 text-emerald-200', statement: 'IC ready – data and governance checks are green.' }
  if (score >= 85) return { label: 'B+', tone: 'border-sky-500 text-sky-200', statement: 'Strong draft – tighten a few governance follow-ups.' }
  if (score >= 76) return { label: 'B', tone: 'border-amber-500 text-amber-200', statement: 'Progressing – resolve outstanding issues before committee.' }
  if (score >= 68) return { label: 'C+', tone: 'border-amber-600 text-amber-200', statement: 'At risk – several blocking items remain open.' }
  return { label: 'Watch', tone: 'border-red-600 text-red-200', statement: 'Not ready – remediate data and governance gaps.' }
}

export function QualityGovernanceScorecard() {
  const { coverage } = useDataNormalization()
  const { state: ownerState, bridge, historical, currentOwnerEarnings } = useOwnerEarnings()
  const { state: valuationState, currentScenario } = useValuation()
  const { simulation, state: scenarioState } = useScenarioLab()
  const { alerts, deltas } = useMonitoring()
  const { reviewPrompts, state: memoState, exhibits, openCommentCount } = useMemoComposer()

  const positiveOwnerEarningsYears = useMemo(() => {
    if (historical.length <= 1) return 0
    return historical.slice(1).filter((entry, index) => entry.ownerEarnings >= historical[index].ownerEarnings).length
  }, [historical])

  const dataScore = useMemo(() => {
    const reconciliationRatio = coverage.totalSources === 0 ? 1 : coverage.reconciledCount / coverage.totalSources
    const base = coverage.avgCoverage * 0.35 + coverage.avgFootnoteCoverage * 0.25 + reconciliationRatio * 100 * 0.25
    const unmatchedPenalty = Math.min(coverage.totalUnmatched * 1.8, 25)
    const normalized = base - unmatchedPenalty + 10
    return clampScore(normalized)
  }, [coverage])

  const financialScore = useMemo(() => {
    const totalSegments = bridge.length || 1
    const enabledSegments = bridge.filter((segment) => ownerState.includeBridgeSegments[segment.id]).length
    const segmentRatio = enabledSegments / totalSegments
    const growthRatio = historical.length > 1 ? positiveOwnerEarningsYears / (historical.length - 1) : 1
    const score = segmentRatio * 70 + growthRatio * 25 + 5
    return clampScore(score)
  }, [bridge, ownerState.includeBridgeSegments, historical, positiveOwnerEarningsYears])

  const valuationScore = useMemo(() => {
    const marginOfSafety = currentScenario.impliedMoS
    const downside = simulation.downsideProbability
    const iterationBonus = scenarioState.iterations >= 600 ? 10 : scenarioState.iterations >= 400 ? 6 : 3
    const overrideCount = Object.keys(valuationState.assumptionOverrides ?? {}).length
    const overrideBonus = Math.min(overrideCount * 2, 12)
    const score = marginOfSafety * 0.7 + (100 - downside) * 0.45 + iterationBonus + overrideBonus - 20
    return clampScore(score)
  }, [currentScenario, simulation.downsideProbability, scenarioState.iterations, valuationState.assumptionOverrides])

  const governanceScore = useMemo(() => {
    const totalPrompts = reviewPrompts.length || 1
    const completedPrompts = Object.values(memoState.reviewChecklist).filter(Boolean).length
    const reviewCompletion = (completedPrompts / totalPrompts) * 100

    const commentScore = Math.max(0, 100 - openCommentCount * 12)

    const outstandingAlerts = alerts.filter((alert) => !alert.acknowledged)
    const severityPenalty = outstandingAlerts.reduce((sum, alert) => {
      switch (alert.severity) {
        case 'critical':
          return sum + 18
        case 'warning':
          return sum + 10
        default:
          return sum + 4
      }
    }, 0)
    const alertScore = Math.max(0, 100 - severityPenalty)

    const deltaPenalty = deltas.reduce((sum, delta) => {
      if (delta.status === 'breach') return sum + 15
      if (delta.status === 'warning') return sum + 8
      return sum
    }, 0)
    const deltaScore = Math.max(0, 100 - deltaPenalty)

    const composite = reviewCompletion * 0.45 + commentScore * 0.25 + alertScore * 0.2 + deltaScore * 0.1
    return clampScore(composite)
  }, [alerts, deltas, memoState.reviewChecklist, openCommentCount, reviewPrompts.length])

  const categories = useMemo(
    () => [
      {
        id: 'data',
        label: 'Data Integrity',
        score: dataScore,
        description: 'Source reconciliation, coverage, and footnote rigor.',
        evidence: [
          `${coverage.reconciledCount}/${coverage.totalSources} sources reconciled`,
          `Average coverage ${coverage.avgCoverage}% | footnotes ${coverage.avgFootnoteCoverage}%`,
          `${coverage.totalUnmatched} unmatched line items flagged`
        ]
      },
      {
        id: 'financial',
        label: 'Financial Rigor',
        score: financialScore,
        description: 'Owner earnings bridge completeness and trend validation.',
        evidence: [
          `${bridge.filter((segment) => ownerState.includeBridgeSegments[segment.id]).length}/${bridge.length} bridge segments validated`,
          `Normalized owner earnings: $${currentOwnerEarnings.toFixed(1)}M`,
          `${positiveOwnerEarningsYears} of ${Math.max(historical.length - 1, 0)} YoY owner earnings beats`
        ]
      },
      {
        id: 'valuation',
        label: 'Valuation Confidence',
        score: valuationScore,
        description: 'Scenario coverage, margin of safety, and override discipline.',
        evidence: [
          `Selected scenario: ${valuationState.selectedScenario.toUpperCase()} → $${currentScenario.value.toFixed(2)} target`,
          `Margin of safety ${currentScenario.impliedMoS}% with downside probability ${simulation.downsideProbability}%`,
          `${Object.keys(valuationState.assumptionOverrides ?? {}).length} assumption overrides documented`
        ]
      },
      {
        id: 'governance',
        label: 'Governance Readiness',
        score: governanceScore,
        description: 'Review sign-offs, outstanding commentary, and monitoring hooks.',
        evidence: [
          `${Object.values(memoState.reviewChecklist).filter(Boolean).length}/${reviewPrompts.length} review prompts complete`,
          `${openCommentCount} open reviewer comments`,
          `${alerts.filter((alert) => !alert.acknowledged).length} monitoring alerts awaiting acknowledgement`
        ]
      }
    ],
    [
      alerts,
      bridge,
      coverage,
      currentOwnerEarnings,
      currentScenario,
      dataScore,
      financialScore,
      governanceScore,
      historical,
      memoState.reviewChecklist,
      openCommentCount,
      positiveOwnerEarningsYears,
      reviewPrompts.length,
      simulation.downsideProbability,
      valuationScore,
      valuationState.selectedScenario,
      valuationState.assumptionOverrides
    ]
  )

  const overallScore = useMemo(() => {
    if (categories.length === 0) return 0
    const total = categories.reduce((sum, category) => sum + category.score, 0)
    return Math.round(total / categories.length)
  }, [categories])

  const grade = gradeFromScore(overallScore)
  const includedExhibits = exhibits.filter((exhibit) => exhibit.attachment.include).length

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-sm text-slate-200">Quality & Governance Summary</CardTitle>
            <p className="mt-2 text-xs text-slate-400">
              Aggregate quality score blends data coverage, financial rigor, valuation discipline, and governance
              readiness to signal IC preparedness.
            </p>
          </div>
          <Badge
            variant="outline"
            className={`border-2 px-4 py-2 text-lg font-semibold uppercase ${grade.tone}`}
          >
            {grade.label} ({overallScore})
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-[2fr_1fr]">
          <div>
            <p>{grade.statement}</p>
            <p className="mt-2 text-slate-500">
              Exhibits packaged: {includedExhibits}/{exhibits.length}. Reviewer threads open: {openCommentCount}.
            </p>
          </div>
          <div className="space-y-2 rounded border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[11px] uppercase text-slate-500">Scenario Snapshot</p>
            <p>
              {valuationState.selectedScenario.toUpperCase()} case at ${currentScenario.value.toFixed(2)} with {currentScenario.impliedMoS}% MoS.
              Monte Carlo mean ${simulation.meanValue.toFixed(2)} vs downside probability {simulation.downsideProbability}%.
            </p>
            <p className="text-slate-500">Iterations run: {scenarioState.iterations}.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {categories.map((category) => (
          <Card key={category.id} className="border-slate-800 bg-slate-900/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-slate-200">{category.label}</CardTitle>
                <span className="text-lg font-semibold text-slate-100">{category.score}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{category.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={category.score} className="h-3 bg-slate-800" />
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-400">
                {category.evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default QualityGovernanceScorecard
