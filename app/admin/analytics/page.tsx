'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AnalyticsData {
  revenue: { value: number; change: number }
  appointments: { value: number; change: number }
  customerSatisfaction: { value: number; change: number }
  staffUtilization: { value: number; change: number }
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const mockAnalytics: AnalyticsData = {
      revenue: { value: 12450, change: 8.2 },
      appointments: { value: 156, change: 12.5 },
      customerSatisfaction: { value: 4.8, change: 2.1 },
      staffUtilization: { value: 82, change: -1.5 }
    }
    
    setTimeout(() => {
      setAnalytics(mockAnalytics)
      setLoading(false)
    }, 1000)
  }, [])

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Performance Analytics</h1>
        <p className="text-muted-foreground">AI-powered business insights and metrics</p>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">${analytics.revenue.value.toLocaleString()}</div>
              <p className={`text-xs ${analytics.revenue.change > 0 ? 'text-accent' : 'text-destructive'}`}>
                {analytics.revenue.change > 0 ? '+' : ''}{analytics.revenue.change}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{analytics.appointments.value}</div>
              <p className={`text-xs ${analytics.appointments.change > 0 ? 'text-accent' : 'text-destructive'}`}>
                {analytics.appointments.change > 0 ? '+' : ''}{analytics.appointments.change}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Satisfaction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{analytics.customerSatisfaction.value}/5</div>
              <p className={`text-xs ${analytics.customerSatisfaction.change > 0 ? 'text-accent' : 'text-destructive'}`}>
                {analytics.customerSatisfaction.change > 0 ? '+' : ''}{analytics.customerSatisfaction.change}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Staff Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{analytics.staffUtilization.value}%</div>
              <p className={`text-xs ${analytics.staffUtilization.change > 0 ? 'text-accent' : 'text-destructive'}`}>
                {analytics.staffUtilization.change > 0 ? '+' : ''}{analytics.staffUtilization.change}% from last month
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <i className="fas fa-robot text-accent"></i>
              <span>AI Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/5 border-l-4 border-primary rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-chart-line text-primary"></i>
                <span className="font-medium text-primary">Revenue Optimization</span>
              </div>
              <p className="text-sm text-foreground mb-2">Peak booking hours: 2-4 PM and 6-8 PM. Consider premium pricing during these slots.</p>
              <div className="text-sm">
                <span className="text-muted-foreground">Confidence:</span>
                <span className="text-foreground ml-1">89%</span>
              </div>
            </div>

            <div className="p-4 bg-accent/5 border-l-4 border-accent rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-users text-accent"></i>
                <span className="font-medium text-accent">Staff Performance</span>
              </div>
              <p className="text-sm text-foreground mb-2">Emily Rodriguez has 25% higher customer retention. Consider cross-training other staff.</p>
              <div className="text-sm">
                <span className="text-muted-foreground">Confidence:</span>
                <span className="text-foreground ml-1">92%</span>
              </div>
            </div>

            <div className="p-4 bg-secondary/5 border-l-4 border-secondary rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-calendar text-secondary"></i>
                <span className="font-medium text-secondary">Scheduling Insights</span>
              </div>
              <p className="text-sm text-foreground mb-2">Customers prefer 90-minute color services over 120-minute slots. Adjust service offerings.</p>
              <div className="text-sm">
                <span className="text-muted-foreground">Confidence:</span>
                <span className="text-foreground ml-1">76%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
