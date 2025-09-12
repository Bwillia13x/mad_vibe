import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SidebarLayout from "@/components/SidebarLayout";
import Home from "@/pages/home";
import Scheduling from "@/pages/scheduling";
import Inventory from "@/pages/inventory";
import Staff from "@/pages/staff";
import Analytics from "@/pages/analytics";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Business Tool Pages with Sidebar */}
      <Route path="/">
        <SidebarLayout>
          <Home />
        </SidebarLayout>
      </Route>
      <Route path="/scheduling">
        <SidebarLayout>
          <Scheduling />
        </SidebarLayout>
      </Route>
      <Route path="/inventory">
        <SidebarLayout>
          <Inventory />
        </SidebarLayout>
      </Route>
      <Route path="/staff">
        <SidebarLayout>
          <Staff />
        </SidebarLayout>
      </Route>
      <Route path="/analytics">
        <SidebarLayout>
          <Analytics />
        </SidebarLayout>
      </Route>
      {/* Fallback to 404 without sidebar */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
