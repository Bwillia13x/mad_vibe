import { type ReactNode } from 'react'
import { type WorkflowStage } from '@/lib/workflow'
import { type WorkbenchTab } from './WorkbenchLayout'
import { lazy, Suspense } from 'react'

// Lazy load stage components
const HomeDailyBrief = lazy(() => import('./stages/HomeDailyBrief').then(module => ({ default: module.HomeDailyBrief })))
const IntakeOnePagerDraft = lazy(() => import('./stages/IntakeOnePagerDraft').then(module => ({ default: module.IntakeOnePagerDraft })))
const PairAnalystOmniPrompt = lazy(() => import('./stages/PairAnalystOmniPrompt').then(module => ({ default: module.PairAnalystOmniPrompt })))
const WatchlistsPortfolios = lazy(() => import('./stages/WatchlistsPortfolios').then(module => ({ default: module.WatchlistsPortfolios })))
const DossierBusinessCanvas = lazy(() => import('./stages/DossierBusinessCanvas').then(module => ({ default: module.DossierBusinessCanvas })))
const ValuationWorkbench = lazy(() => import('./stages/ValuationWorkbench').then(module => ({ default: module.ValuationWorkbench })))
const DataNormalization = lazy(() => import('./stages/DataNormalization').then(module => ({ default: module.DataNormalization })))
const ScenariosStressLab = lazy(() => import('./stages/ScenariosStressLab').then(module => ({ default: module.ScenariosStressLab })))
const MonitoringDashboard = lazy(() => import('./stages/MonitoringDashboard'))
const RiskCatalystPlanner = lazy(() => import('./stages/RiskCatalystPlanner').then(module => ({ default: module.RiskCatalystPlanner })))
const PortfolioSizingWorkbench = lazy(() => import('./stages/PortfolioSizingWorkbench').then(module => ({ default: module.PortfolioSizingWorkbench })))
const ExecutionPlannerPanel = lazy(() => import('./stages/ExecutionPlannerPanel'))
const MemoComposer = lazy(() => import('./stages/MemoComposer').then(module => ({ default: module.MemoComposer })))
const FinancialsOwnerEarnings = lazy(() => import('./stages/FinancialsOwnerEarnings').then(module => ({ default: module.FinancialsOwnerEarnings })))
const MemoHistoryTimeline = lazy(() => import('./stages/MemoHistoryTimeline'))
const QualityGovernanceScorecard = lazy(() => import('./stages/QualityGovernanceScorecard').then(module => ({ default: module.QualityGovernanceScorecard })))
const RedTeamMode = lazy(() => import('./stages/RedTeamMode').then(module => ({ default: module.RedTeamMode })))

// Advanced screening components
const AdvancedUniverseScreener = lazy(() => import('./stages/AdvancedUniverseScreener').then(module => ({ default: module.AdvancedUniverseScreener })))
const NaturalLanguageScreener = lazy(() => import('./stages/NaturalLanguageScreener').then(module => ({ default: module.NaturalLanguageScreener })))
const FactorAnalysisWorkbench = lazy(() => import('./stages/FactorAnalysisWorkbench').then(module => ({ default: module.FactorAnalysisWorkbench })))

// Specialized valuation models
const ComparativeAnalysisWorkbench = lazy(() => import('./stages/ComparativeAnalysisWorkbench').then(module => ({ default: module.ComparativeAnalysisWorkbench })))
const REITNavModel = lazy(() => import('./stages/REITNavModel').then(module => ({ default: module.REITNavModel })))
const BankCET1Model = lazy(() => import('./stages/BankCET1Model').then(module => ({ default: module.BankCET1Model })))
const InsuranceRBCModel = lazy(() => import('./stages/InsuranceRBCModel').then(module => ({ default: module.InsuranceRBCModel })))
const EPV10Model = lazy(() => import('./stages/EPV10Model').then(module => ({ default: module.EPV10Model })))
const PostMortem = lazy(() => import('./stages/PostMortem').then(module => ({ default: module.PostMortem })))

const slugify = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="space-y-2">
    <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
    <div className="space-y-1 text-xs leading-relaxed text-slate-400">{children}</div>
  </div>
)

const List = ({ items }: { items: string[] }) => (
  <ul className="list-disc space-y-1 pl-5">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
)

const defaultTabs = (stage: WorkflowStage): WorkbenchTab[] => {
  if (stage.defaultTabs && stage.defaultTabs.length > 0) {
    return stage.defaultTabs.map((label) => ({
      id: slugify(label),
      label,
      content: (
        <div className="space-y-4">
          <Section title="Stage Goal">
            <p>{stage.goal}</p>
          </Section>
          <Section title="Key Inputs">
            <List items={stage.inputs} />
          </Section>
          <Section title="Core Work">
            <List items={stage.work} />
          </Section>
          <Section title="Outputs">
            <List items={stage.outputs} />
          </Section>
        </div>
      )
    }))
  }

  return [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-4">
          <Section title="Stage Goal">
            <p>{stage.goal}</p>
          </Section>
          <Section title="Key Inputs">
            <List items={stage.inputs} />
          </Section>
        </div>
      )
    }
  ]
}

export const buildStageTabs = (stage: WorkflowStage): WorkbenchTab[] => {
  switch (stage.slug) {
    case 'home':
      return [
        {
          id: 'daily-brief',
          label: 'Daily Brief',
          content: <HomeDailyBrief />
        },
        {
          id: 'alerts',
          label: 'Alerts',
          content: (
            <div className="space-y-5">
              <Section title="What to Scan">
                <List
                  items={[
                    'Tasks & deadlines linked to stages show what is waiting on you.',
                    'Watchlist moves call out KPI deltas, transcript drops, and unusual price action.',
                    'Session history shows which company you were modeling last and progress percent.'
                  ]}
                />
              </Section>
              <Section title="Move Forward">
                <p>
                  Pick Resume or New Idea to advance. The moment you do, the Intake tools unlock and
                  a new Research Log entry starts tracking context.
                </p>
              </Section>
            </div>
          )
        }
      ]
    case 'intake':
      return [
        {
          id: 'one-pager-draft',
          label: 'One-Pager Draft',
          content: <IntakeOnePagerDraft />
        },
        {
          id: 'pair-analyst',
          label: 'Pair Analyst',
          content: <PairAnalystOmniPrompt />
        },
        {
          id: 'ai-modes',
          label: 'AI Pair Analyst',
          content: (
            <div className="space-y-4">
              <Section title="Recommended Prompts">
                <List
                  items={[
                    'Summarize the latest 10-K in five bullet points.',
                    'Explain the revenue drivers over the last three years.',
                    'List three contrarian risks that could break the thesis.'
                  ]}
                />
              </Section>
              <Section title="Logging">
                <p>Every decision writes to the Research Log so the audit trail begins here.</p>
              </Section>
            </div>
          )
        }
      ]
    case 'screener':
      return [
        {
          id: 'screener',
          label: 'Screener',
          content: <AdvancedUniverseScreener />
        },
        {
          id: 'nlp-filters',
          label: 'NLP Filters',
          content: <NaturalLanguageScreener />
        },
        {
          id: 'factor-analysis',
          label: 'Factor Analysis',
          content: <FactorAnalysisWorkbench />
        }
      ]
    case 'one-pager':
      return [
        {
          id: 'snapshot',
          label: 'Snapshot',
          content: (
            <div className="space-y-5">
              <Section title="Quick Look">
                <List
                  items={[
                    'Review 10-year mini statements with quality flags (Piotroski, Beneish, Altman).',
                    'Sketch unit economics and sanity-check rough EPV.',
                    'Record a go-deeper decision and open the hypothesis card.'
                  ]}
                />
              </Section>
              <Section title="Gate">
                <p>Confirm data coverage quality and note any obvious red flags.</p>
              </Section>
            </div>
          )
        },
        {
          id: 'quality-flags',
          label: 'Quality Flags',
          content: (
            <div className="space-y-4">
              <Section title="What to Inspect">
                <List
                  items={[
                    'Automated quality scores and forensic checks for accounting noise.',
                    'Business moat hints surfaced from filings and transcripts.',
                    'Fast yes/no prompts: Is the business good? Is the timing right?'
                  ]}
                />
              </Section>
            </div>
          )
        }
      ]
    case 'dossier':
      return [
        {
          id: 'business-canvas',
          label: 'Business Canvas',
          content: <DossierBusinessCanvas />
        }
      ]
    case 'data':
      return [
        {
          id: 'source-map',
          label: 'Source Map',
          content: <DataNormalization />
        }
      ]
    case 'financials':
      return [
        {
          id: 'owner-earnings',
          label: 'Owner Earnings',
          content: <FinancialsOwnerEarnings />
        }
      ]
    case 'valuation':
      return [
        {
          id: 'epv',
          label: 'EPV',
          content: <ValuationWorkbench />
        },
        {
          id: 'dcf',
          label: 'DCF',
          content: (
            <div className="space-y-4">
              <Section title="Scenario Envelopes">
                <List
                  items={[
                    'Model bull, base, and bear cash-flow paths with probability weights.',
                    'Highlight drivers causing divergence between scenarios.',
                    'Use AI to stress assumptions before sign-off.'
                  ]}
                />
              </Section>
            </div>
          )
        },
        {
          id: 'comps',
          label: 'Comps',
          content: <ComparativeAnalysisWorkbench />
        },
        {
          id: 'reit-nav',
          label: 'REIT NAV',
          content: <REITNavModel />
        },
        {
          id: 'bank-cet1',
          label: 'Bank CET1',
          content: <BankCET1Model />
        },
        {
          id: 'insurance-rbc',
          label: 'Insurance RBC',
          content: <InsuranceRBCModel />
        },
        {
          id: 'ep-pv10',
          label: 'E&P PV-10',
          content: <EPV10Model />
        }
      ]
    case 'scenarios':
      return [
        {
          id: 'monte-carlo',
          label: 'Monte Carlo',
          content: <ScenariosStressLab />
        }
      ]
    case 'risks':
      return [
        {
          id: 'risk-grid',
          label: 'Risk Grid',
          content: <RiskCatalystPlanner />
        }
      ]
    case 'quality':
      return [
        {
          id: 'scorecards',
          label: 'Scorecards',
          content: (
            <div className="space-y-5">
              <Section title="Governance Review">
                <List
                  items={[
                    'Run Graham & Dodd, Fisher 15, and capital allocation scorecards.',
                    'Tag insider ownership, compensation, and accounting quality flags.',
                    'Log any waivers with justification for the IC memo.'
                  ]}
                />
              </Section>
            </div>
          )
        }
      ]
    case 'portfolio':
      return [
        {
          id: 'watchlists',
          label: 'Watchlists',
          content: <WatchlistsPortfolios />
        },
        {
          id: 'sizing',
          label: 'Sizing',
          content: <PortfolioSizingWorkbench />
        }
      ]
    case 'memo':
      return [
        {
          id: 'draft',
          label: 'Draft',
          content: <MemoComposer />
        },
        {
          id: 'red-team',
          label: 'Red-Team',
          content: <RedTeamMode />
        },
        {
          id: 'quality-governance',
          label: 'Quality & Governance',
          content: <QualityGovernanceScorecard />
        },
        {
          id: 'history',
          label: 'History',
          content: <MemoHistoryTimeline />
        }
      ]
    case 'execution':
      return [
        {
          id: 'entry-plan',
          label: 'Entry Plan',
          content: <ExecutionPlannerPanel />
        }
      ]
    case 'monitoring':
      return [
        {
          id: 'monitoring-dashboard',
          label: 'Dashboard',
          content: <MonitoringDashboard />
        }
      ]
    case 'post-mortem':
      return [
        {
          id: 'template',
          label: 'Template',
          content: <PostMortem />
        }
      ]
    default:
      return defaultTabs(stage)
  }
}
