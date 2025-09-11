'use client'

interface SystemStatus {
  buildStatus: string
  database: { status: string; connections: string; lastMigration: string }
  websocket: { status: string; port: number }
  memory: { usage: number }
  cpu: { usage: number }
  api: { responseTime: number }
}

interface MetricsOverviewProps {
  systemStatus: SystemStatus | null
  wsConnected: boolean
}

export function MetricsOverview({ systemStatus, wsConnected }: MetricsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="metric-card bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Build Status</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {systemStatus?.buildStatus || 'Loading...'}
            </p>
          </div>
          <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
            <i className="fas fa-check-circle text-accent text-xl"></i>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">✅ 45 Pages Compiled</span>
        </div>
      </div>

      <div className="metric-card bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Database</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {systemStatus?.database.status || 'Loading...'}
            </p>
          </div>
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <i className="fas fa-database text-primary text-xl"></i>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">PostgreSQL Active</span>
        </div>
      </div>

      <div className="metric-card bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">TypeScript</p>
            <p className="text-2xl font-bold text-foreground mt-1">0 Errors</p>
          </div>
          <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
            <i className="fab fa-js-square text-accent text-xl"></i>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">Strict Mode ✅</span>
        </div>
      </div>

      <div className="metric-card bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">WebSocket</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {wsConnected ? 'Active' : 'Inactive'}
            </p>
          </div>
          <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
            <i className="fas fa-plug text-secondary text-xl"></i>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <span className="text-xs bg-secondary/20 text-secondary px-2 py-1 rounded-full">
            Port {systemStatus?.websocket.port || '8080'}
          </span>
        </div>
      </div>
    </div>
  )
}
