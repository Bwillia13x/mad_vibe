/**
 * Performance Dashboard Page
 * Provides real-time performance monitoring interface
 */

import React, { useState, useEffect } from 'react'
import { PageContainer, PageHeader, GlassCard } from '@/components/layout/Page'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Alert, AlertDescription } from '../components/ui/alert'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  BarChart3,
  Download,
  RefreshCw
} from 'lucide-react'

interface PerformanceMetrics {
  timestamp: number
  requests: {
    total: number
    successful: number
    failed: number
    errorRate: number
    requestsPerSecond: number
  }
  responseTime: {
    average: number
    p50: number
    p95: number
    p99: number
    min: number
    max: number
  }
  system: {
    cpuUsage: number
    memoryUsage: number
    heapUtilization: number
    activeConnections: number
    uptime: number
  }
  business: {
    activeUsers: number
    transactionsPerMinute: number
    averageSessionDuration: number
  }
}

interface PerformanceAlert {
  id: string
  timestamp: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  metric: string
  value: number
  threshold: number
  message: string
  resolved?: boolean
}

interface DashboardData {
  summary: {
    health: 'healthy' | 'warning' | 'critical'
    uptime: number
    activeAlerts: number
    totalRequests: number
    errorRate: number
    averageResponseTime: number
  }
  metrics: {
    current: PerformanceMetrics | null
    history: PerformanceMetrics[]
  }
  alerts: {
    active: PerformanceAlert[]
    recent: PerformanceAlert[]
  }
}

export default function PerformanceDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/performance/dashboard')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const result = await response.json()
      if (result.success) {
        setDashboardData(result.data)
        setError(null)
      } else {
        throw new Error(result.error || 'Failed to fetch dashboard data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/performance/alerts/${alertId}/resolve`, {
        method: 'POST'
      })
      if (response.ok) {
        fetchDashboardData() // Refresh data
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err)
    }
  }

  const generateReport = async () => {
    try {
      const response = await fetch('/api/performance/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodHours: 24 })
      })
      if (response.ok) {
        const result = await response.json()
        // In a real app, you might navigate to a report view or download the report
        alert('Report generated successfully!')
      }
    } catch (err) {
      console.error('Failed to generate report:', err)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchDashboardData, 15000) // Refresh every 15 seconds
    return () => clearInterval(interval)
  }, [autoRefresh])

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'critical':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      default:
        return <Activity className="h-5 w-5 text-gray-600" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-blue-100 text-blue-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'critical':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <PageHeader
          title="Performance Dashboard"
          subtitle="Real-time system performance monitoring"
          testId="heading-performance"
        />
        <GlassCard className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-slate-800/60" />
          ))}
        </GlassCard>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <PageHeader
          title="Performance Dashboard"
          subtitle="Real-time system performance monitoring"
          testId="heading-performance"
        />
        <Alert className="border-slate-800 bg-slate-900/60">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load performance dashboard: {error}
            <Button variant="outline" size="sm" className="ml-2" onClick={fetchDashboardData}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </PageContainer>
    )
  }

  if (!dashboardData) {
    return (
      <PageContainer>
        <PageHeader
          title="Performance Dashboard"
          subtitle="Real-time system performance monitoring"
          testId="heading-performance"
        />
        <Alert className="border-slate-800 bg-slate-900/60">
          <AlertDescription>No performance data available</AlertDescription>
        </Alert>
      </PageContainer>
    )
  }

  const { summary, metrics, alerts } = dashboardData
  const current = metrics.current

  return (
    <PageContainer>
      <PageHeader
        title="Performance Dashboard"
        subtitle="Real-time system performance monitoring"
        testId="heading-performance"
        actions={
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto-refresh On' : 'Auto-refresh Off'}
            </Button>
            <Button variant="outline" size="sm" onClick={generateReport}>
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        }
      />

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            {getHealthIcon(summary.health)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(summary.health)}`}>
              {summary.health.charAt(0).toUpperCase() + summary.health.slice(1)}
            </div>
            <p className="text-xs text-gray-600">Uptime: {formatUptime(summary.uptime)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(summary.averageResponseTime)}ms</div>
            <p className="text-xs text-gray-600">Average response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${summary.errorRate > 1 ? 'text-red-600' : 'text-green-600'}`}
            >
              {summary.errorRate.toFixed(2)}%
            </div>
            <p className="text-xs text-gray-600">Current error rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${summary.activeAlerts > 0 ? 'text-red-600' : 'text-green-600'}`}
            >
              {summary.activeAlerts}
            </div>
            <p className="text-xs text-gray-600">Alerts requiring attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Current Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="system">System Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          {current && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Request Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Requests:</span>
                    <span className="font-semibold">{current.requests.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Successful:</span>
                    <span className="font-semibold text-green-600">
                      {current.requests.successful}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed:</span>
                    <span className="font-semibold text-red-600">{current.requests.failed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Requests/sec:</span>
                    <span className="font-semibold">
                      {current.requests.requestsPerSecond.toFixed(1)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Response Times</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Average:</span>
                    <span className="font-semibold">
                      {Math.round(current.responseTime.average)}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>95th Percentile:</span>
                    <span className="font-semibold">{Math.round(current.responseTime.p95)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>99th Percentile:</span>
                    <span className="font-semibold">{Math.round(current.responseTime.p99)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min/Max:</span>
                    <span className="font-semibold">
                      {Math.round(current.responseTime.min)}/{Math.round(current.responseTime.max)}
                      ms
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Business Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Active Users:</span>
                    <span className="font-semibold">{current.business.activeUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transactions/min:</span>
                    <span className="font-semibold">{current.business.transactionsPerMinute}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Session:</span>
                    <span className="font-semibold">
                      {formatUptime(current.business.averageSessionDuration)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {alerts.active.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Active Alerts</h3>
              {alerts.active.map((alert) => (
                <Card key={alert.id} className="border-l-4 border-l-red-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="font-medium">{alert.message}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => resolveAlert(alert.id)}>
                        Resolve
                      </Button>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      Value: {alert.value.toFixed(2)} | Threshold: {alert.threshold} | Time:{' '}
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-gray-600">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
                  <p>No active alerts</p>
                </div>
              </CardContent>
            </Card>
          )}

          {alerts.recent.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Recent Alerts</h3>
              <div className="space-y-2">
                {alerts.recent.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-3">
                      <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                      <span className="text-sm">{alert.message}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          {current && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Memory Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Heap Utilization</span>
                        <span>{Math.round(current.system.heapUtilization)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${
                            current.system.heapUtilization > 85
                              ? 'bg-red-500'
                              : current.system.heapUtilization > 70
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, current.system.heapUtilization)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory Usage:</span>
                      <span className="font-semibold">
                        {Math.round(current.system.memoryUsage)}MB
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Connections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Active Connections:</span>
                      <span className="font-semibold">{current.system.activeConnections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CPU Usage:</span>
                      <span className="font-semibold">{Math.round(current.system.cpuUsage)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uptime:</span>
                      <span className="font-semibold">{formatUptime(current.system.uptime)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
