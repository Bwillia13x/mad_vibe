import type { ReactNode } from 'react'
import { Link, useLocation } from 'wouter'
import { useMemo } from 'react'
import { Sparkles, PanelsTopLeft, ChartBar, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkflow } from '@/hooks/useWorkflow'

interface NavItem {
  label: string
  href: string
  match: (path: string) => boolean
  icon: ReactNode
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation()
  const { activeStage } = useWorkflow()

  const workbenchHref = useMemo(() => `/workbench/${activeStage.slug}`, [activeStage.slug])

  const navItems: NavItem[] = useMemo(
    () => [
      {
        label: 'Home',
        href: '/home',
        match: (path) => path === '/home',
        icon: <Sparkles className="h-4 w-4" />
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.18em] uppercase text-violet-200"
          >
            Value Venture Lab
          </button>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href}>
                <a
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition',
                    item.match(location)
                      ? 'border-violet-600/50 bg-violet-600/20 text-violet-200 shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                      : 'border-transparent text-slate-300 hover:bg-slate-900/70'
                  )}
                >
                  {item.icon}
                  {item.label}
                </a>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
