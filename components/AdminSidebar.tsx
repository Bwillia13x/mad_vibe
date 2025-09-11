'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  icon: string
  label: string
  badge?: string
}

const navigationItems: NavItem[] = [
  { href: '/admin', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
  { href: '/admin/scheduling', icon: 'fas fa-calendar-check', label: 'Scheduling', badge: 'Live' },
  { href: '/admin/inventory', icon: 'fas fa-boxes', label: 'Inventory' },
  { href: '/admin/staff', icon: 'fas fa-users', label: 'Staff Management' },
]

const analyticsItems: NavItem[] = [
  { href: '/admin/analytics', icon: 'fas fa-chart-bar', label: 'Performance' },
  { href: '/admin/ai-insights', icon: 'fas fa-robot', label: 'AI Insights' },
  { href: '/admin/email-automation', icon: 'fas fa-envelope', label: 'Email Automation' },
]

const systemItems: NavItem[] = [
  { href: '/admin/database', icon: 'fas fa-database', label: 'Database' },
  { href: '/admin/settings', icon: 'fas fa-cogs', label: 'Settings' },
]

export function AdminSidebar() {
  const [isHidden, setIsHidden] = useState(false)
  const pathname = usePathname()

  const NavSection = ({ title, items }: { title: string; items: NavItem[] }) => (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        {title}
      </div>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors",
            pathname === item.href
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-muted"
          )}
        >
          <i className={item.icon}></i>
          <span>{item.label}</span>
          {item.badge && (
            <span className="ml-auto bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full">
              {item.badge}
            </span>
          )}
        </Link>
      ))}
    </div>
  )

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden",
          isHidden ? "block" : "hidden"
        )}
        onClick={() => setIsHidden(false)}
      />
      
      {/* Sidebar */}
      <div 
        className={cn(
          "sidebar-transition fixed lg:static inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transform lg:transform-none",
          isHidden ? "sidebar-hidden" : ""
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 p-6 border-b border-border">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-chart-line text-primary-foreground"></i>
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">Andreas Vibe</h1>
              <p className="text-sm text-muted-foreground">Business Platform</p>
            </div>
            {/* WebSocket Status Indicator */}
            <div className="websocket-indicator ml-auto">
              <div className="w-3 h-3 bg-accent rounded-full animate-pulse" title="WebSocket Connected"></div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-8">
            <NavSection title="Operations" items={navigationItems} />
            <NavSection title="Analytics" items={analyticsItems} />
            <NavSection title="System" items={systemItems} />
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <i className="fas fa-user text-secondary-foreground text-sm"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Admin User</p>
                <p className="text-xs text-muted-foreground">System Administrator</p>
              </div>
              <button className="text-muted-foreground hover:text-foreground">
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
