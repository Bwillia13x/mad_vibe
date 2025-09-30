import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Route, Switch, useLocation } from 'wouter'
import { queryClient } from '@/lib/queryClient'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { WorkflowProvider } from '@/hooks/useWorkflow'
import { ScreenerProvider } from '@/hooks/useScreener'
import { WorkflowStageView } from '@/pages/workflow-stage'
import HomePage from '@/pages/home'
import AnalyticsPage from '@/pages/analytics'
import InventoryPage from '@/pages/inventory'
import LoyaltyPage from '@/pages/loyalty'
import MarketingPage from '@/pages/marketing'
import StaffPage from '@/pages/staff'
import SchedulingPage from '@/pages/scheduling'
import PosPage from '@/pages/pos'
import PerformanceDashboardPage from '@/pages/performance-dashboard'
import NotFoundPage from '@/pages/not-found'
import { AppShell } from '@/components/layout/AppShell'
import { workflowStages } from '@/lib/workflow'
import { useWorkflow } from '@/hooks/useWorkflow'
import { FloatingAIAssistant } from '@/components/ai/FloatingAIAssistant'
import { KeyboardShortcutsOverlay } from '@/components/ui/KeyboardShortcutsOverlay'

function RedirectToHome() {
  const [, navigate] = useLocation()
  useEffect(() => {
    navigate('/home', { replace: true })
  }, [navigate])
  return null
}

function StageRoute({ params }: { params: { stage: string } }) {
  return <WorkflowStageView stageSlug={params.stage} />
}

function LegacyStageRedirect({ params }: { params: { legacy: string } }) {
  const [, navigate] = useLocation()

  useEffect(() => {
    const match = workflowStages.find((stage) => stage.slug === params.legacy)
    if (match) {
      navigate(`/workbench/${match.slug}`, { replace: true })
    } else {
      navigate('/not-found', { replace: true })
    }
  }, [navigate, params.legacy])

  return null
}

function Router() {
  return (
    <Switch>
      <Route path="/home" component={HomePage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/loyalty" component={LoyaltyPage} />
      <Route path="/marketing" component={MarketingPage} />
      <Route path="/staff" component={StaffPage} />
      <Route path="/scheduling" component={SchedulingPage} />
      <Route path="/pos" component={PosPage} />
      <Route path="/performance-dashboard" component={PerformanceDashboardPage} />
      <Route path="/workbench/:stage" component={StageRoute} />
      <Route path="/not-found" component={NotFoundPage} />
      <Route path="/:legacy" component={LegacyStageRedirect} />
      <Route path="/" component={RedirectToHome} />
    </Switch>
  )
}

function AppContent() {
  const { activeStage, setActiveStage } = useWorkflow()
  const [, navigate] = useLocation()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
      if (isCmdK) {
        e.preventDefault()
        navigate(`/workbench/${activeStage.slug}`)
        return
      }
      if (e.key === '[' || e.key === ']') {
        const index = workflowStages.findIndex((s) => s.slug === activeStage.slug)
        if (index >= 0) {
          const nextIndex =
            e.key === ']' ? Math.min(workflowStages.length - 1, index + 1) : Math.max(0, index - 1)
          const next = workflowStages[nextIndex]
          if (next) {
            setActiveStage(next.slug)
            navigate(`/workbench/${next.slug}`)
          }
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeStage.slug, navigate, setActiveStage])

  return (
    <ScreenerProvider>
      <TooltipProvider>
        <AppShell>
          <Router />
        </AppShell>
        <FloatingAIAssistant />
        <KeyboardShortcutsOverlay />
        <Toaster />
      </TooltipProvider>
    </ScreenerProvider>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkflowProvider>
        <AppContent />
      </WorkflowProvider>
    </QueryClientProvider>
  )
}

export default App
