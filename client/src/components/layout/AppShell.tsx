import type { ReactNode } from 'react'
import { Link, useLocation } from 'wouter'
import { useMemo, useState } from 'react'
import { queryClient } from '@/lib/queryClient'
import {
  Sparkles,
  PanelsTopLeft,
  ChartBar,
  Briefcase,
  PanelLeftClose,
  PanelLeft,
  PenTool,
  LayoutDashboard,
  Search,
  ClipboardList,
  History
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkflow } from '@/hooks/useWorkflow'
import { ExplorerPanel } from '@/components/workspace/ExplorerPanel'
import { Button } from '@/components/ui/button'

interface NavItem {
  label: string
  href: string
  match: (path: string) => boolean
  icon: ReactNode
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation()
  const { activeStage } = useWorkflow()
  const [explorerOpen, setExplorerOpen] = useState(true)

  const workbenchHref = useMemo(() => `/workbench/${activeStage.slug}`, [activeStage.slug])
  const showExplorer = location.startsWith('/workbench') || location === '/home'

  const navItems: NavItem[] = useMemo(
    () => [
      {
        label: 'Home',
        href: '/home',
        match: (path) => path === '/home',
        icon: <Sparkles className="h-4 w-4" />
      },
      {
        label: 'Workspace',
        href: '/workspace',
        match: (path) => path.startsWith('/workspace'),
        icon: <LayoutDashboard className="h-4 w-4" />
      },
      {
        label: 'Agent Search',
        href: '/agent-search',
        match: (path) => path.startsWith('/agent-search'),
        icon: <Search className="h-4 w-4" />
      },
      {
        label: 'Agent Results',
        href: '/agent-results',
        match: (path) => path.startsWith('/agent-results'),
        icon: <ClipboardList className="h-4 w-4" />
      },
      {
        label: 'Audit Timeline',
        href: '/audit-timeline',
        match: (path) => path.startsWith('/audit-timeline'),
        icon: <History className="h-4 w-4" />
      },
      {
        label: 'Studio',
        href: '/studio',
        match: (path) => path.startsWith('/studio'),
        icon: <PenTool className="h-4 w-4" />
      },
      {
        label: 'Workbench',
        href: workbenchHref,
        match: (path) => path.startsWith('/workbench'),
        icon: <PanelsTopLeft className="h-4 w-4" />
      },
      {
        label: 'Analytics',
        href: '/analytics',
        match: (path) => path.startsWith('/analytics'),
        icon: <ChartBar className="h-4 w-4" />
      },
      {
        label: 'Operations',
        href: '/inventory',
        match: (path) =>
          path.startsWith('/inventory') ||
          path.startsWith('/staff') ||
          path.startsWith('/scheduling') ||
          path.startsWith('/loyalty') ||
          path.startsWith('/marketing') ||
          path.startsWith('/pos'),
        icon: <Briefcase className="h-4 w-4" />
      }
    ],
    [workbenchHref]
  )

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-xl focus:bg-slate-900 focus:px-3 focus:py-2 focus:text-slate-100"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {showExplorer && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExplorerOpen(!explorerOpen)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-200"
                title={explorerOpen ? 'Hide Explorer (Cmd+B)' : 'Show Explorer (Cmd+B)'}
              >
                {explorerOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>
            )}
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.18em] uppercase text-violet-200"
            >
              Value Venture Lab
            </button>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onMouseEnter={() => {
                  // Prefetch common queries when user hovers a nav item
                  if (item.href.startsWith('/analytics')) {
                    queryClient.prefetchQuery({ queryKey: ['/api/analytics'] })
                    queryClient.prefetchQuery({ queryKey: ['/api/marketing/campaigns'] })
                  } else if (
                    item.href.startsWith('/inventory') ||
                    item.href.startsWith('/staff') ||
                    item.href.startsWith('/scheduling') ||
                    item.href.startsWith('/loyalty') ||
                    item.href.startsWith('/marketing') ||
                    item.href.startsWith('/pos')
                  ) {
                    queryClient.prefetchQuery({ queryKey: ['/api/inventory'] })
                    queryClient.prefetchQuery({ queryKey: ['/api/appointments', 'today'] })
                    queryClient.prefetchQuery({ queryKey: ['/api/loyalty/entries'] })
                    queryClient.prefetchQuery({ queryKey: ['/api/marketing/campaigns'] })
                  }
                }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition',
                  item.match(location)
                    ? 'border-violet-600/50 bg-violet-600/20 text-violet-200 shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                    : 'border-transparent text-slate-300 hover:bg-slate-900/70'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        {showExplorer && explorerOpen && (
          <aside className="w-64 border-r border-slate-800 bg-slate-950 overflow-hidden">
            <ExplorerPanel />
          </aside>
        )}
        <main id="main" className="flex-1 overflow-auto" role="main" aria-live="polite">
          {children}
        </main>
      </div>
    </div>
  )
}
