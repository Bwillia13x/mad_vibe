import { type ReactNode } from 'react'

export type StageGateChecklistItem = {
  id: string
  label: string
  helper?: string
}

export type WorkflowStage = {
  id: number
  slug: string
  title: string
  shortTitle: string
  goal: string
  inputs: string[]
  work: string[]
  outputs: string[]
  gateChecklist: StageGateChecklistItem[]
  defaultTabs?: string[]
  aiModes?: string[]
}

export const workflowStages: WorkflowStage[] = [
  {
    id: 0,
    slug: 'home',
    title: 'Home / Daily Brief',
    shortTitle: 'Home',
    goal: 'Re-enter context in seconds',
    inputs: ['Open sessions', 'Watchlists', 'Tasks', 'Alerts'],
    work: ['Review latest activity cards', 'Choose session resume or start new idea'],
    outputs: ['Selected starting point', 'Stage chip context'],
    gateChecklist: [
      {
        id: 'home.choose-path',
        label: 'Select Resume or New Idea to start the workflow'
      }
    ],
    defaultTabs: ['Daily Brief'],
    aiModes: ['Summarize overnight moves', 'Highlight urgent tasks']
  },
  {
    id: 1,
    slug: 'intake',
    title: 'Idea Intake (Triage)',
    shortTitle: 'Intake',
    goal: 'Qualify the spark before deeper work',
    inputs: ['Ticker or theme', 'Source context', 'Quick facts'],
    work: ['Capture thesis stub', 'Record business quality impression', 'List disqualifiers'],
    outputs: ['Triage decision', 'Research log entry'],
    gateChecklist: [
      {
        id: 'intake.thesis-stub',
        label: 'Document a testable thesis stub'
      },
      {
        id: 'intake.disqualifier',
        label: 'Record at least one disqualifier check'
      }
    ],
    defaultTabs: ['One-Pager Draft'],
    aiModes: ['Summarize 10-K in 5 bullets', 'Explain revenue drivers', 'List contrarian risks']
  },
  {
    id: 2,
    slug: 'screener',
    title: 'Universe Screener',
    shortTitle: 'Screener',
    goal: 'Build a themed candidate set',
    inputs: ['Quality factors', 'Geography', 'Sector filters'],
    work: ['Compose natural-language screener', 'Inspect results against prior runs'],
    outputs: ['Saved screener run', 'Promoted tickers'],
    gateChecklist: [
      {
        id: 'screener.select',
        label: 'Promote up to five tickers for a One-Pager'
      }
    ],
    defaultTabs: ['Screener'],
    aiModes: ['Suggest factor mix', 'Compare to prior screens']
  },
  {
    id: 3,
    slug: 'one-pager',
    title: 'One-Pager (Quick Look)',
    shortTitle: 'One-Pager',
    goal: 'Decide if the idea deserves deeper work',
    inputs: ['Auto facts', '10Y financial highlights'],
    work: ['Run quality flags', 'Sketch unit economics', 'Draft initial hypothesis'],
    outputs: ['Go-deeper flag', 'Hypothesis card'],
    gateChecklist: [
      {
        id: 'onepager.coverage',
        label: 'Confirm coverage quality and flag blockers'
      }
    ],
    defaultTabs: ['Snapshot', 'Quality Flags'],
    aiModes: ['Should I dig deeper?', 'Highlight red flags']
  },
  {
    id: 4,
    slug: 'dossier',
    title: 'Company Dossier (Business Map)',
    shortTitle: 'Dossier',
    goal: 'Assemble the business model map',
    inputs: ['Segments', 'Products', 'Customers', 'Competitors'],
    work: ['Fill canvas blocks', 'Link moat sources', 'Attach supporting evidence'],
    outputs: ['Business map v1', 'Evidence citations'],
    gateChecklist: [
      {
        id: 'dossier.blocks',
        label: 'Complete every required business block'
      },
      {
        id: 'dossier.citations',
        label: 'Attach five evidence citations'
      }
    ],
    defaultTabs: ['Business Canvas'],
    aiModes: ['Compose company narrative', 'Explain customer journey']
  },
  {
    id: 5,
    slug: 'data',
    title: 'Data Ingestion & Normalization',
    shortTitle: 'Data',
    goal: 'Normalise trusted financial inputs',
    inputs: ['Filings', 'Price series', 'Alt data'],
    work: ['Map to canonical schema', 'Apply adjustments', 'Run reconciliation checks'],
    outputs: ['Cleaned financials', 'Owner earnings view'],
    gateChecklist: [
      {
        id: 'data.recon',
        label: 'Pass reconciliation and footnote coverage'
      }
    ],
    defaultTabs: ['Source Map', 'Adjustments'],
    aiModes: ['Highlight unmatched lines', 'Suggest adjustments']
  },
  {
    id: 6,
    slug: 'financials',
    title: 'Financials Workbench (Owner Earnings)',
    shortTitle: 'Financials',
    goal: 'Translate statements into owner earnings',
    inputs: ['Normalized statements'],
    work: [
      'Build owner earnings bridge',
      'Model reinvestment needs',
      'Explain working capital cycles'
    ],
    outputs: ['Owner earnings timeline', 'Commentary'],
    gateChecklist: [
      {
        id: 'financials.review',
        label: 'Confirm reviewer alignment with business map'
      }
    ],
    defaultTabs: ['Owner Earnings'],
    aiModes: ['Explain bridge', 'Check consistency']
  },
  {
    id: 7,
    slug: 'valuation',
    title: 'Valuation Workbench (EPV → DCF → Alt)',
    shortTitle: 'Valuation',
    goal: 'Generate value range across methods',
    inputs: ['Owner earnings', 'Competitive dynamics'],
    work: ['Model EPV baseline', 'Run DCF scenarios', 'Compare relatives and industry models'],
    outputs: ['Value range', 'Drivers tornado'],
    gateChecklist: [
      {
        id: 'valuation.margin-safety',
        label: 'Apply margin of safety rule with tagged assumptions'
      }
    ],
    defaultTabs: ['EPV', 'DCF', 'Comps'],
    aiModes: ['Stress assumptions', 'Explain driver impacts']
  },
  {
    id: 8,
    slug: 'scenarios',
    title: 'Scenario & Stress Lab',
    shortTitle: 'Scenarios',
    goal: 'Map sensitivity and ruin risks',
    inputs: ['Valuation models'],
    work: ['Run Monte Carlo', 'Test regime shifts', 'Capture path-dependency'],
    outputs: ['Distribution view', 'Driver ranking'],
    gateChecklist: [
      {
        id: 'scenarios.variant',
        label: 'Document your variant perception'
      }
    ],
    defaultTabs: ['Monte Carlo', 'Sensitivity'],
    aiModes: ['Find tail risks', 'Quantify kill factors']
  },
  {
    id: 9,
    slug: 'risks',
    title: 'Risk Register & Catalysts',
    shortTitle: 'Risk',
    goal: 'Make uncertainty explicit',
    inputs: ['Risk list', 'Scenario tails'],
    work: ['Score likelihood and impact', 'Define mitigation', 'Plan catalyst monitoring'],
    outputs: ['Top risks', 'Catalyst calendar'],
    gateChecklist: [
      {
        id: 'risks.assign-owner',
        label: 'Assign owners and alert rules'
      }
    ],
    defaultTabs: ['Risk Grid', 'Catalysts'],
    aiModes: ['Suggest mitigations', 'Flag missing catalysts']
  },
  {
    id: 10,
    slug: 'quality',
    title: 'Quality & Governance Checks',
    shortTitle: 'Quality',
    goal: 'Verify trust factors',
    inputs: ['Insider data', 'Capital allocation history'],
    work: ['Score governance', 'Assess capital allocation', 'Flag accounting issues'],
    outputs: ['Quality score', 'Justification'],
    gateChecklist: [
      {
        id: 'quality.waiver',
        label: 'Waive or resolve any hard fails'
      }
    ],
    defaultTabs: ['Scorecards'],
    aiModes: ['Challenge quality score', 'Find governance red flags']
  },
  {
    id: 11,
    slug: 'portfolio',
    title: 'Portfolio Fit & Sizing',
    shortTitle: 'Portfolio',
    goal: 'Decide portfolio placement',
    inputs: ['Portfolio exposures', 'Liquidity rules'],
    work: ['Run sizing math', 'Check correlation mix', 'Review liquidity stress'],
    outputs: ['Sizing proposal', 'Stop triggers'],
    gateChecklist: [
      {
        id: 'portfolio.signoff',
        label: 'Capture risk lead or self sign-off'
      }
    ],
    defaultTabs: ['Sizing', 'Risk Budget'],
    aiModes: ['Optimize sizing', 'Stress liquidity']
  },
  {
    id: 12,
    slug: 'memo',
    title: 'IC-Style Memo Draft',
    shortTitle: 'Memo',
    goal: 'Synthesize into a decision memo',
    inputs: ['All prior outputs'],
    work: ['Edit auto-drafted memo', 'Embed exhibits', 'Run red-team prompts'],
    outputs: ['IC memo v1', 'One-slide summary'],
    gateChecklist: [
      {
        id: 'memo.redteam',
        label: 'Complete red-team review cycle'
      }
    ],
    defaultTabs: ['Draft', 'Exhibits', 'Red Team'],
    aiModes: ['Attack assumptions', 'Find missing comps']
  },
  {
    id: 13,
    slug: 'execution',
    title: 'Execution Planner',
    shortTitle: 'Execution',
    goal: 'Translate thesis into orders',
    inputs: ['Sizing', 'Liquidity', 'Catalysts'],
    work: ['Design entry plan', 'Set alerts', 'Run pre-mortem'],
    outputs: ['Execution checklist', 'Alert stack'],
    gateChecklist: [
      {
        id: 'execution.alerts',
        label: 'Confirm monitoring and alert hooks'
      }
    ],
    defaultTabs: ['Entry Plan', 'Alerts'],
    aiModes: ['Stress entry bands', 'Suggest monitoring hooks']
  },
  {
    id: 14,
    slug: 'monitoring',
    title: 'Monitoring & Post-Mortem',
    shortTitle: 'Monitoring',
    goal: 'Track thesis drift and learn',
    inputs: ['KPIs', 'Catalyst updates', 'News'],
    work: ['Compare thesis delta', 'Update decision journal', 'Run post-mortems'],
    outputs: ['Thesis health score', 'Lessons library'],
    gateChecklist: [
      {
        id: 'monitoring.journal',
        label: 'Log decision outcomes into lessons library'
      }
    ],
    defaultTabs: ['Thesis Delta', 'Decision Journal'],
    aiModes: ['Highlight drift', 'Surface lessons']
  },
  {
    id: 15,
    slug: 'post-mortem',
    title: 'Post-Mortem Template',
    shortTitle: 'Post-Mortem',
    goal: 'Conduct structured post-mortem to capture lessons from closed positions',
    inputs: ['Trade details', 'Thesis recap', 'Outcome data'],
    work: ['Document hypothesis vs outcome', 'Attribute performance', 'Extract lessons and tags'],
    outputs: ['Published lessons', 'Updated tags library'],
    gateChecklist: [
      {
        id: 'postmortem.complete-fields',
        label: 'Complete all required fields (thesis, outcome, errors, lessons, tags)'
      }
    ],
    defaultTabs: ['Template'],
    aiModes: ['Summarize key learnings', 'Suggest process improvements']
  }
]

export const stageIndexBySlug = new Map(workflowStages.map((stage) => [stage.slug, stage.id]))

export const workflowTabsByStage = new Map(
  workflowStages.map((stage) => [stage.slug, stage.defaultTabs ?? []])
)

export type InspectorPanel = {
  id: string
  label: string
  description?: string
  render?: ReactNode
}

export const explorerObjects = [
  {
    section: 'Pipeline',
    items: ['Intake', 'Research', 'Modeling', 'IC', 'Execution', 'Monitoring']
  },
  {
    section: 'Objects',
    items: ['Ideas', 'Companies', 'Models', 'Scenarios', 'Memos', 'Tasks']
  },
  {
    section: 'Saved Views',
    items: ['Screens', 'Watchlists', 'Portfolios']
  }
]
