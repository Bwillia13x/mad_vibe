import { useEffect } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { Route, Switch, useLocation } from "wouter"
import { queryClient } from "@/lib/queryClient"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { WorkflowProvider } from "@/hooks/useWorkflow"
import { WorkflowStageView } from "@/pages/workflow-stage"

function RedirectToHome() {
  const [, navigate] = useLocation()
  useEffect(() => {
    navigate("/home", { replace: true })
  }, [navigate])
  return null
}

function StageRoute({ params }: { params: { stage: string } }) {
  return <WorkflowStageView stageSlug={params.stage} />
}

function Router() {
  return (
    <Switch>
      <Route path="/:stage" component={StageRoute} />
      <Route path="/">
        <RedirectToHome />
      </Route>
    </Switch>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkflowProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </WorkflowProvider>
    </QueryClientProvider>
  )
}

export default App
