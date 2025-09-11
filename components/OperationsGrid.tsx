'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Appointment {
  id: string
  customerName: string
  service: string
  time: string
  status: 'confirmed' | 'in-progress'
}

interface InventoryItem {
  id: string
  name: string
  sku: string
  supplier: string
  stock: number
  status: 'in-stock' | 'low-stock'
}

export function OperationsGrid() {
  const [appointments] = useState<Appointment[]>([
    {
      id: '1',
      customerName: 'Sarah Johnson',
      service: 'Hair Color & Cut - 2hrs',
      time: '2:00 PM',
      status: 'confirmed'
    },
    {
      id: '2',
      customerName: 'Mike Chen',
      service: 'Beard Trim - 30min',
      time: '4:30 PM',
      status: 'in-progress'
    }
  ])

  const [inventory] = useState<InventoryItem[]>([
    {
      id: '1',
      name: 'Professional Hair Color',
      sku: 'RS-HC001',
      supplier: 'Andreas Co. Supplier',
      stock: 23,
      status: 'in-stock'
    },
    {
      id: '2',
      name: 'Styling Tools',
      sku: 'RS-ST002',
      supplier: 'RS Supplier',
      stock: 5,
      status: 'low-stock'
    }
  ])

  const handleSendPurchaseOrder = async () => {
    // Mock API call
    alert('Purchase order email sent successfully!')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Real-time Scheduling */}
      <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">AI-Powered Scheduling</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-accent">Live Updates</span>
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
          </div>
        </div>
        
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <i className="fas fa-user text-primary"></i>
                </div>
                <div>
                  <p className="font-medium text-foreground">{appointment.customerName}</p>
                  <p className="text-sm text-muted-foreground">{appointment.service}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{appointment.time}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  appointment.status === 'confirmed' 
                    ? 'bg-accent/20 text-accent' 
                    : 'bg-primary/20 text-primary'
                }`}>
                  {appointment.status === 'confirmed' ? 'Confirmed' : 'In Progress'}
                </span>
              </div>
            </div>
          ))}
          
          {/* AI Conflict Detection */}
          <div className="p-4 bg-accent/5 border-l-4 border-accent rounded-r-lg">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-robot text-accent"></i>
              <span className="font-medium text-accent">AI Scheduling Assistant</span>
            </div>
            <p className="text-sm text-foreground">Suggested optimization: Move 5:00 PM appointment to 5:15 PM to reduce staff overlap by 15 minutes.</p>
            <div className="flex gap-2 mt-3">
              <button className="px-3 py-1 bg-accent text-accent-foreground rounded-md text-xs font-medium">Apply</button>
              <button className="px-3 py-1 bg-muted text-muted-foreground rounded-md text-xs font-medium">Dismiss</button>
            </div>
          </div>
        </div>
      </div>

      {/* System Operations */}
      <div className="space-y-6">
        {/* Database Operations */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Database Operations</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Migration</span>
              <span className="text-sm text-foreground">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Backup Status</span>
              <span className="text-sm text-accent">✅ Current</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Connection Pool</span>
              <span className="text-sm text-foreground">8/20 active</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                <i className="fas fa-database mr-1"></i>Migrate
              </button>
              <button className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/90 transition-colors">
                <i className="fas fa-save mr-1"></i>Backup
              </button>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">System Health</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Memory Usage</span>
                <span className="text-sm text-foreground">68%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{width: '68%'}}></div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">CPU Usage</span>
                <span className="text-sm text-foreground">34%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-accent h-2 rounded-full" style={{width: '34%'}}></div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">API Response</span>
                <span className="text-sm text-accent">245ms avg</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-accent h-2 rounded-full" style={{width: '85%'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
