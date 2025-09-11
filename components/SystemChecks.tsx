'use client'

export function SystemChecks() {
  const handleRunCommand = async (command: string) => {
    // Mock command execution - in production this would call an API
    console.log(`Running: pnpm ${command}`)
    alert(`Running: pnpm ${command}`)
  }

  const checkItems = [
    { category: 'Core Systems', items: [
      { name: 'TypeScript Zero Errors', status: true },
      { name: 'ESLint Compliance', status: true },
      { name: 'Build Success (45 pages)', status: true },
      { name: 'Test Suite Passing', status: true }
    ]},
    { category: 'Database & Security', items: [
      { name: 'PostgreSQL Connected', status: true },
      { name: 'Migrations Applied', status: true },
      { name: 'Admin Token Security', status: true },
      { name: 'Backup Schedule Active', status: true }
    ]},
    { category: 'Operations', items: [
      { name: 'WebSocket Configured', status: true },
      { name: 'Smoke Tests Passing', status: true },
      { name: 'Health Endpoint Active', status: true },
      { name: 'Structured Logging', status: true }
    ]}
  ]

  const commands = [
    { name: 'pnpm check', icon: 'fas fa-play', variant: 'primary' },
    { name: 'pnpm build', icon: 'fas fa-hammer', variant: 'secondary' },
    { name: 'pnpm test', icon: 'fas fa-flask', variant: 'accent' },
    { name: 'pnpm smoke', icon: 'fas fa-smoke', variant: 'muted' }
  ]

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Production Readiness Checklist</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-accent font-medium">All Systems Operational</span>
          <i className="fas fa-check-circle text-accent"></i>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {checkItems.map((section) => (
          <div key={section.category} className="space-y-3">
            <h4 className="font-medium text-foreground">{section.category}</h4>
            <div className="space-y-2">
              {section.items.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <i className={`fas fa-check-circle ${item.status ? 'text-accent' : 'text-muted-foreground'}`}></i>
                  <span className="text-sm text-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Command Center */}
      <div className="mt-6 p-4 bg-muted/30 rounded-lg">
        <h4 className="font-medium text-foreground mb-3">Quick Commands</h4>
        <div className="flex flex-wrap gap-3">
          {commands.map((cmd) => (
            <button
              key={cmd.name}
              onClick={() => handleRunCommand(cmd.name.replace('pnpm ', ''))}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                cmd.variant === 'primary' 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : cmd.variant === 'secondary'
                  ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                  : cmd.variant === 'accent'
                  ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <i className={`${cmd.icon} mr-2`}></i>{cmd.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
