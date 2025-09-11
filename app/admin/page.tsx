'use client'

import { MetricsOverview } from '@/components/MetricsOverview'
import { OperationsGrid } from '@/components/OperationsGrid'
import { SystemChecks } from '@/components/SystemChecks'
import { useState, useEffect } from 'react'

interface SystemStatus {
  buildStatus: string
  database: { status: string; connections: string; lastMigration: string }
  websocket: { status: string; port: number }
  memory: { usage: number }
  cpu: { usage: number }
  api: { responseTime: number }
}

export default function AdminDashboard() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [wsConnected, setWsConnected] = useState(false)

  useEffect(() => {
    // Fetch initial system status
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/health')
        if (response.ok) {
          const data = await response.json()
          setSystemStatus(data)
        }
      } catch (error) {
        console.error('Failed to fetch system status:', error)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const handleStartWebSocket = async () => {
    try {
      const response = await fetch('/api/operations?action=start', {
        method: 'GET'
      })
      if (response.ok) {
        setWsConnected(true)
      }
    } catch (error) {
      console.error('Failed to start WebSocket:', error)
    }
  }

  const handleCheckWebSocketStatus = async () => {
    try {
      const response = await fetch('/api/operations?action=status')
      if (response.ok) {
        const data = await response.json()
        setWsConnected(data.connected)
      }
    } catch (error) {
      console.error('Failed to check WebSocket status:', error)
    }
  }

  return (
    <>
      {/* Header */}
      <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="lg:hidden text-foreground hover:text-muted-foreground">
            <i className="fas fa-bars"></i>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Operations Dashboard</h1>
            <p className="text-sm text-muted-foreground">Real-time business monitoring</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* WebSocket Operations Controls */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleStartWebSocket}
              className="px-3 py-1.5 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <i className="fas fa-play mr-2"></i>Start WS
            </button>
            <button 
              onClick={handleCheckWebSocketStatus}
              className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/90 transition-colors"
            >
              <i className="fas fa-info-circle mr-2"></i>Status
            </button>
          </div>
          
          {/* System Health */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
            <div className={`w-2 h-2 rounded-full ${systemStatus ? 'bg-accent' : 'bg-destructive'}`}></div>
            <span className="text-sm text-muted-foreground">
              {systemStatus ? 'System Healthy' : 'System Loading'}
            </span>
          </div>
          
          {/* Notifications */}
          <button className="relative p-2 text-muted-foreground hover:text-foreground">
            <i className="fas fa-bell"></i>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">3</span>
          </button>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="flex-1 p-6 space-y-6 overflow-auto">
        <MetricsOverview systemStatus={systemStatus} wsConnected={wsConnected} />
        <OperationsGrid />
        <SystemChecks />
      </main>
    </>
  )
}
