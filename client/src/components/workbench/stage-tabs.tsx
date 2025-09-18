import { type ReactNode } from "react"
import { type WorkflowStage } from "@/lib/workflow"
import { type WorkbenchTab } from "./WorkbenchLayout"
import { HomeDailyBrief } from "./stages/HomeDailyBrief"
import { IntakeOnePagerDraft } from "./stages/IntakeOnePagerDraft"
import { DossierBusinessCanvas } from "./stages/DossierBusinessCanvas"
import { ValuationWorkbench } from "./stages/ValuationWorkbench"
import { DataNormalization } from "./stages/DataNormalization"
import { ScenariosStressLab } from "./stages/ScenariosStressLab"
import { MonitoringDashboard } from "./stages/MonitoringDashboard"
import { RiskCatalystPlanner } from "./stages/RiskCatalystPlanner"
import { PortfolioSizingWorkbench } from "./stages/PortfolioSizingWorkbench"
import { ExecutionPlannerPanel } from "./stages/ExecutionPlannerPanel"
import { MemoComposer } from "./stages/MemoComposer"
import { FinancialsOwnerEarnings } from "./stages/FinancialsOwnerEarnings"
import { MemoHistoryTimeline } from "./stages/MemoHistoryTimeline"
import { QualityGovernanceScorecard } from "./stages/QualityGovernanceScorecard"

const slugify = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

const Section = ({
  title,
  children
}: {
  title: string
  children: ReactNode
}) => (
  <div className="space-y-2">
    <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
    <div className="space-y-1 text-xs leading-relaxed text-slate-400">
      {children}
    </div>
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
      id: "overview",
      label: "Overview",
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
    case "home":
      return [
        {
          id: "daily-brief",
          label: "Daily Brief",
          content: <HomeDailyBrief />
        },
        {
          id: "alerts",
          label: "Alerts",
          content: (
            <div className="space-y-5">
              <Section title="What to Scan">
                <List
                  items={[
                    "Tasks & deadlines linked to stages show what is waiting on you.",
                    "Watchlist moves call out KPI deltas, transcript drops, and unusual price action.",
                    "Session history shows which company you were modeling last and progress percent."
                  ]}
                />
              </Section>
              <Section title="Move Forward">
                <p>
                  Pick Resume or New Idea to advance. The moment you do, the Intake tools unlock and a new
                  Research Log entry starts tracking context.
                </p>
              </Section>
            </div>
          )
        }
      ]
    case "intake":
      return [
        {
          id: "one-pager-draft",
          label: "One-Pager Draft",
          content: <IntakeOnePagerDraft />
        },
        {
          id: "ai-modes",
          label: "AI Pair Analyst",
          content: (
            <div className="space-y-4">
              <Section title="Recommended Prompts">
                <List
                  items={[
                    "Summarize the latest 10-K in five bullet points.",
                    "Explain the revenue drivers over the last three years.",
                    "List three contrarian risks that could break the thesis." 
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
    case "screener":
      return [
        {
          id: "screener",
          label: "Screener",
          content: (
            <div className="space-y-5">
              <Section title="Build the Universe">
                <List
                  items={[
                    "Use natural language filters for ROIC, FCF yield, leverage, growth durability, and insider activity.",
                    "Compare results with prior runs to understand deltas across factors.",
                    "Capture scenario tags so we can revisit this screen later." 
                  ]}
                />
              </Section>
              <Section title="Stage Gate">
                <p>Select up to five tickers to promote into the One-Pager flow.</p>
              </Section>
            </div>
          )
        }
      ]
    case "one-pager":
      return [
        {
          id: "snapshot",
          label: "Snapshot",
          content: (
            <div className="space-y-5">
              <Section title="Quick Look">
                <List
                  items={[
                    "Review 10-year mini statements with quality flags (Piotroski, Beneish, Altman).",
                    "Sketch unit economics and sanity-check rough EPV.",
                    "Record a go-deeper decision and open the hypothesis card." 
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
          id: "quality-flags",
          label: "Quality Flags",
          content: (
            <div className="space-y-4">
              <Section title="What to Inspect">
                <List
                  items={[
                    "Automated quality scores and forensic checks for accounting noise.",
                    "Business moat hints surfaced from filings and transcripts.",
                    "Fast yes/no prompts: Is the business good? Is the timing right?" 
                  ]}
                />
              </Section>
            </div>
          )
        }
      ]
    case "dossier":
      return [
        {
          id: "business-canvas",
          label: "Business Canvas",
          content: <DossierBusinessCanvas />
        }
      ]
    case "data":
      return [
        {
          id: "source-map",
          label: "Source Map",
          content: <DataNormalization />
        }
      ]
    case "financials":
      return [
        {
          id: "owner-earnings",
          label: "Owner Earnings",
          content: <FinancialsOwnerEarnings />
        }
      ]
    case "valuation":
      return [
        {
          id: "epv",
          label: "EPV",
          content: <ValuationWorkbench />
        },
        {
          id: "dcf",
          label: "DCF",
          content: (
            <div className="space-y-4">
              <Section title="Scenario Envelopes">
                <List
                  items={[
                    "Model bull, base, and bear cash-flow paths with probability weights.",
                    "Highlight drivers causing divergence between scenarios.",
                    "Use AI to stress assumptions before sign-off." 
                  ]}
                />
              </Section>
            </div>
          )
        },
        {
          id: "comps",
          label: "Comps",
          content: (
            <div className="space-y-4">
              <Section title="Relative Lenses">
                <List
                  items={[
                    "Compare current multiples to historical bands and peer sets.",
                    "Invoke industry-specific modules (REIT NAV, Bank capital, Insurance RBC, E&P PV-10).",
                    "Surface margin-of-safety guidance for the Execution planner." 
                  ]}
                />
              </Section>
              <Section title="Gate">
                <p>Margin-of-safety rule must be tagged to supporting evidence.</p>
              </Section>
            </div>
          )
        }
      ]
    case "scenarios":
      return [
        {
          id: "monte-carlo",
          label: "Monte Carlo",
          content: <ScenariosStressLab />
        }
      ]
    case "risks":
      return [
        {
          id: "risk-grid",
          label: "Risk Grid",
          content: <RiskCatalystPlanner />
        }
      ]
    case "quality":
      return [
        {
          id: "scorecards",
          label: "Scorecards",
          content: (
            <div className="space-y-5">
              <Section title="Governance Review">
                <List
                  items={[
                    "Run Graham & Dodd, Fisher 15, and capital allocation scorecards.",
                    "Tag insider ownership, compensation, and accounting quality flags.",
                    "Log any waivers with justification for the IC memo." 
                  ]}
                />
              </Section>
            </div>
          )
        }
      ]
    case "portfolio":
      return [
        {
          id: "sizing",
          label: "Sizing",
          content: <PortfolioSizingWorkbench />
        }
      ]
    case "memo":
      return [
        {
          id: "draft",
          label: "Draft",
          content: <MemoComposer />
        },
        {
          id: "quality-governance",
          label: "Quality & Governance",
          content: <QualityGovernanceScorecard />
        },
        {
          id: "history",
          label: "History",
          content: <MemoHistoryTimeline />
        }
      ]
    case "execution":
      return [
        {
          id: "entry-plan",
          label: "Entry Plan",
          content: <ExecutionPlannerPanel />
        }
      ]
    case "monitoring":
      return [
        {
          id: "monitoring-dashboard",
          label: "Dashboard",
          content: <MonitoringDashboard />
        }
      ]
    default:
      return defaultTabs(stage)
  }
}
