import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SidebarLayout from "@/components/SidebarLayout";
const Home = lazy(() => import("@/pages/home"));
const Scheduling = lazy(() => import("@/pages/scheduling"));
const Inventory = lazy(() => import("@/pages/inventory"));
const Staff = lazy(() => import("@/pages/staff"));
const Analytics = lazy(() => import("@/pages/analytics"));
const NotFound = lazy(() => import("@/pages/not-found"));
// New custom tool pages
const POS = lazy(() => import("@/pages/pos"));
const Marketing = lazy(() => import("@/pages/marketing"));
const Loyalty = lazy(() => import("@/pages/loyalty"));
import DemoInit from "@/components/DemoInit";

function Router() {
  return (
    <Switch>
      {/* Business Tool Pages with Sidebar */}
      <Route path="/">
        <SidebarLayout>
          <Suspense fallback={<div className="p-6">Loading…</div>}>
            <Home />
          </Suspense>
        </SidebarLayout>
      </Route>
      <Route path="/pos">
        <SidebarLayout>
          <Suspense fallback={<div className="p-6">Loading…</div>}>
            <POS />
          </Suspense>
        </SidebarLayout>
      </Route>
      <Route path="/marketing">
        <SidebarLayout>
          <Suspense fallback={<div className="p-6">Loading…</div>}>
            <Marketing />
          </Suspense>
        </SidebarLayout>
      </Route>
      <Route path="/loyalty">
        <SidebarLayout>
          <Suspense fallback={<div className="p-6">Loading…</div>}>
            <Loyalty />
          </Suspense>
        </SidebarLayout>
      </Route>
      <Route path="/scheduling">
        <SidebarLayout>
          <Suspense fallback={<div className="p-6">Loading…</div>}>
            <Scheduling />
          </Suspense>
        </SidebarLayout>
      </Route>
      <Route path="/inventory">
        <SidebarLayout>
          <Suspense fallback={<div className="p-6">Loading…</div>}>
            <Inventory />
          </Suspense>
        </SidebarLayout>
      </Route>
      <Route path="/staff">
        <SidebarLayout>
          <Suspense fallback={<div className="p-6">Loading…</div>}>
            <Staff />
          </Suspense>
        </SidebarLayout>
      </Route>
      <Route path="/analytics">
        <SidebarLayout>
          <Suspense fallback={<div className="p-6"><h1 className="text-2xl font-semibold" data-testid="heading-analytics">Performance Analytics</h1></div>}>
            <Analytics />
          </Suspense>
        </SidebarLayout>
      </Route>
      {/* Fallback to 404 without sidebar */}
      <Route>
        <Suspense fallback={<div className="p-6">Loading…</div>}>
          <NotFound />
        </Suspense>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DemoInit />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
