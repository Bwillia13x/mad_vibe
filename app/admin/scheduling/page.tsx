'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Appointment {
  id: string
  customerName: string
  service: string
  duration: number
  time: string
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled'
  staffId: string
}

export default function SchedulingPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In a real implementation, this would fetch from the API
    const mockAppointments: Appointment[] = [
      {
        id: '1',
        customerName: 'Sarah Johnson',
        service: 'Hair Color & Cut',
        duration: 120,
        time: '2:00 PM',
        status: 'confirmed',
        staffId: 'staff1'
      },
      {
        id: '2',
        customerName: 'Mike Chen',
        service: 'Beard Trim',
        duration: 30,
        time: '4:30 PM',
        status: 'in-progress',
        staffId: 'staff2'
      }
    ]
    
    setTimeout(() => {
      setAppointments(mockAppointments)
      setLoading(false)
    }, 1000)
  }, [])

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed': return 'bg-accent/20 text-accent'
      case 'in-progress': return 'bg-primary/20 text-primary'
      case 'completed': return 'bg-accent/20 text-accent'
      case 'cancelled': return 'bg-destructive/20 text-destructive'
      default: return 'bg-muted/20 text-muted-foreground'
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">AI-Powered Scheduling</h1>
        <p className="text-muted-foreground">Manage appointments with intelligent conflict detection</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Today's Schedule</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-accent">Live Updates</span>
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <i className="fas fa-user text-primary"></i>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{appointment.customerName}</p>
                    <p className="text-sm text-muted-foreground">{appointment.service} - {appointment.duration}min</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{appointment.time}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(appointment.status)}`}>
                    {appointment.status.replace('-', ' ')}
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
