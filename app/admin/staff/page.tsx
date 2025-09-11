'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StaffMember {
  id: string
  name: string
  role: string
  status: 'available' | 'busy' | 'offline'
  currentAppointment?: string
  todayAppointments: number
  rating: number
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const mockStaff: StaffMember[] = [
      {
        id: 'staff1',
        name: 'Emily Rodriguez',
        role: 'Senior Stylist',
        status: 'busy',
        currentAppointment: 'Sarah Johnson - Hair Color',
        todayAppointments: 6,
        rating: 4.9
      },
      {
        id: 'staff2',
        name: 'Marcus Thompson',
        role: 'Barber',
        status: 'available',
        todayAppointments: 4,
        rating: 4.8
      },
      {
        id: 'staff3',
        name: 'Sofia Martinez',
        role: 'Color Specialist',
        status: 'available',
        todayAppointments: 5,
        rating: 4.7
      }
    ]
    
    setTimeout(() => {
      setStaff(mockStaff)
      setLoading(false)
    }, 1000)
  }, [])

  const getStatusColor = (status: StaffMember['status']) => {
    switch (status) {
      case 'available': return 'bg-accent/20 text-accent'
      case 'busy': return 'bg-primary/20 text-primary'
      case 'offline': return 'bg-muted/20 text-muted-foreground'
      default: return 'bg-muted/20 text-muted-foreground'
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Staff Management</h1>
        <p className="text-muted-foreground">Monitor team performance and availability</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map((member) => (
          <Card key={member.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <i className="fas fa-user text-primary"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(member.status)}`}>
                  {member.status}
                </span>
              </div>

              {member.currentAppointment && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current</span>
                  <span className="text-sm text-foreground">{member.currentAppointment}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Today's Appointments</span>
                <span className="text-sm text-foreground">{member.todayAppointments}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rating</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-foreground">{member.rating}</span>
                  <i className="fas fa-star text-accent text-sm"></i>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <button className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                  View Schedule
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
