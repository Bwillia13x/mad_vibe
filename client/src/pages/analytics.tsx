import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DollarSign, Calendar, Users, TrendingUp, TrendingDown, BarChart3, Download, RefreshCw, AlertCircle, Minus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, XAxis, YAxis, Bar, LineChart, Line } from 'recharts'
import type { AnalyticsSnapshot } from '@shared/schema'

interface AnalyticsData {
  revenue: { value: number; change: number }
  appointments: { value: number; change: number }
  customerSatisfaction: { value: number; change: number }
  staffUtilization: { value: number; change: number }
}

interface ChartData {
  month: string
  revenue: number
  appointments: number
}

export default function AnalyticsPage() {
  const { data: analyticsSnapshots, isLoading, error, refetch } = useQuery<AnalyticsSnapshot[]>({
    queryKey: ['/api/analytics'],
  })
  const { data: campaigns = [] } = useQuery<any[]>({ queryKey: ['/api/marketing/campaigns'] })
  const { data: loyaltyEntries = [] } = useQuery<any[]>({ queryKey: ['/api/loyalty/entries'] })
  const { data: posSales = [] } = useQuery<any[]>({ queryKey: ['/api/pos/sales'] })
  const { data: marketingPerf } = useQuery<any>({ queryKey: ['/api/marketing/performance'] })

  // Sort analytics snapshots by date client-side for robustness
  const snapshots = [...(analyticsSnapshots || [])].sort((a, b) => +new Date(b.date) - +new Date(a.date))

  // Process analytics data to get current month and previous month for comparisons
  const currentMonthData = snapshots[0] // Most recent (September 2025)
  const previousMonthData = snapshots[1] // Previous month (August 2025)
  
  // Calculate percentage changes
  const calculateChange = (current: string | number, previous: string | number): number => {
    const currentNum = typeof current === 'string' ? parseFloat(current) : current
    const previousNum = typeof previous === 'string' ? parseFloat(previous) : previous
    if (previousNum === 0) return 0
    return ((currentNum - previousNum) / previousNum) * 100
  }

  // Transform data for UI
  const analytics: AnalyticsData | null = currentMonthData && previousMonthData ? {
    revenue: {
      value: parseFloat(currentMonthData.totalRevenue),
      change: calculateChange(currentMonthData.totalRevenue, previousMonthData.totalRevenue)
    },
    appointments: {
      value: currentMonthData.totalAppointments,
      change: calculateChange(currentMonthData.totalAppointments, previousMonthData.totalAppointments)
    },
    customerSatisfaction: {
      value: parseFloat(currentMonthData.customerSatisfaction) * 5, // Convert to 5-point scale
      change: calculateChange(
        parseFloat(currentMonthData.customerSatisfaction) * 5,
        parseFloat(previousMonthData.customerSatisfaction) * 5
      )
    },
    staffUtilization: {
      value: parseFloat(currentMonthData.utilizationRate) * 100, // Convert to percentage
      change: calculateChange(
        parseFloat(currentMonthData.utilizationRate) * 100,
        parseFloat(previousMonthData.utilizationRate) * 100
      )
    }
  } : null

  // Transform data for charts (last 3 months)
  const chartData: ChartData[] = snapshots.slice(0, 3).reverse().map((snapshot, index) => {
    const date = new Date(snapshot.date)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return {
      month: monthNames[date.getMonth()],
      revenue: parseFloat(snapshot.totalRevenue),
      appointments: snapshot.totalAppointments
    }
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/analytics'] })
    queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns'] })
    queryClient.invalidateQueries({ queryKey: ['/api/loyalty/entries'] })
    queryClient.invalidateQueries({ queryKey: ['/api/pos/sales'] })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4" />
    if (change < 0) return <TrendingDown className="h-4 w-4" />
    return <Minus className="h-4 w-4" />
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600 dark:text-green-400"
    if (change < 0) return "text-red-600 dark:text-red-400"
    return "text-gray-600 dark:text-gray-400"
  }

  if (error) {
    return (
      <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4" data-testid="heading-analytics">
          Performance Analytics
        </h1>
        <Alert className="max-w-md mx-auto" data-testid="error-analytics">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            Failed to load analytics data. Please try again.
            <Button variant="outline" size="sm" className="ml-2" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4" data-testid="heading-analytics">
          Performance Analytics
        </h1>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (snapshots.length < 2) {
    return (
      <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4" data-testid="heading-analytics">
          Performance Analytics
        </h1>
        <Alert className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            Insufficient data for analytics. At least 2 months of data are required for trend analysis.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white" data-testid="heading-analytics">
              Performance Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">AI-powered business insights and metrics</p>
          </div>
          <div className="flex gap-2 no-print">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-refresh" onClick={handleRefresh} aria-label="Refresh analytics">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reload latest analytics</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="outline" size="sm" data-testid="button-export" aria-label="Export analytics as CSV">
                  <a href="/api/analytics/export" download>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download CSV snapshot</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => window.print()} data-testid="button-print-report" aria-label="Print analytics report">
                  Print Report
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open print dialog</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {analytics && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="revenue-value">
                  {formatCurrency(analytics.revenue.value)}
                </div>
                <p className={`text-xs flex items-center gap-1 ${getChangeColor(analytics.revenue.change)}`} data-testid="revenue-change">
                  {getChangeIcon(analytics.revenue.change)}
                  {analytics.revenue.change > 0 ? '+' : ''}{analytics.revenue.change.toFixed(1)}% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="appointments-value">
                  {analytics.appointments.value}
                </div>
                <p className={`text-xs flex items-center gap-1 ${getChangeColor(analytics.appointments.change)}`} data-testid="appointments-change">
                  {getChangeIcon(analytics.appointments.change)}
                  {analytics.appointments.change > 0 ? '+' : ''}{analytics.appointments.change.toFixed(1)}% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Satisfaction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="satisfaction-value">
                  {analytics.customerSatisfaction.value}/5.0
                </div>
                <p className={`text-xs flex items-center gap-1 ${getChangeColor(analytics.customerSatisfaction.change)}`} data-testid="satisfaction-change">
                  {getChangeIcon(analytics.customerSatisfaction.change)}
                  {analytics.customerSatisfaction.change > 0 ? '+' : ''}{analytics.customerSatisfaction.change.toFixed(1)}% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Staff Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="utilization-value">
                  {analytics.staffUtilization.value.toFixed(0)}%
                </div>
                <p className={`text-xs flex items-center gap-1 ${getChangeColor(analytics.staffUtilization.change)}`} data-testid="utilization-change">
                  {getChangeIcon(analytics.staffUtilization.change)}
                  {analytics.staffUtilization.change > 0 ? '+' : ''}{analytics.staffUtilization.change.toFixed(1)}% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Operational Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Active Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Array.isArray(campaigns) ? campaigns.filter((c: any) => c.status === 'active').length : 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Loyalty Entries (This Month)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Array.isArray(loyaltyEntries) ? (() => { const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1); const next = new Date(now.getFullYear(), now.getMonth()+1, 1); return loyaltyEntries.filter((e: any) => { const d = new Date(e.createdAt); return d >= start && d < next }).length })() : 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 dark:text-gray-400">POS Sales (Today)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Array.isArray(posSales) ? (() => { const now = new Date(); const start = new Date(now); start.setHours(0,0,0,0); const end = new Date(now); end.setHours(23,59,59,999); return posSales.filter((s: any) => { const d = new Date(s.createdAt); return d >= start && d <= end }).length })() : 0}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {Array.isArray(posSales) ? (() => { const now = new Date(); const start = new Date(now); start.setHours(0,0,0,0); const end = new Date(now); end.setHours(23,59,59,999); const total = posSales.filter((s: any) => { const d = new Date(s.createdAt); return d >= start && d <= end }).reduce((sum: number, s: any) => sum + parseFloat(s.total || '0'), 0); return `Revenue: $${total.toFixed(2)}` })() : 'Revenue: $0.00'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 dark:text-gray-400">POS Sales (This Week)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Array.isArray(posSales) ? (() => { const now = new Date(); const day = now.getDay(); const diff = (day === 0 ? 6 : day - 1); const start = new Date(now); start.setDate(now.getDate() - diff); start.setHours(0,0,0,0); const end = new Date(start); end.setDate(start.getDate() + 7); end.setHours(0,0,0,0); return posSales.filter((s: any) => { const d = new Date(s.createdAt); return d >= start && d < end }).length })() : 0}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {Array.isArray(posSales) ? (() => { const now = new Date(); const day = now.getDay(); const diff = (day === 0 ? 6 : day - 1); const start = new Date(now); start.setDate(now.getDate() - diff); start.setHours(0,0,0,0); const end = new Date(start); end.setDate(start.getDate() + 7); end.setHours(0,0,0,0); const total = posSales.filter((s: any) => { const d = new Date(s.createdAt); return d >= start && d < end }).reduce((sum: number, s: any) => sum + parseFloat(s.total || '0'), 0); return `Revenue: $${total.toFixed(2)}` })() : 'Revenue: $0.00'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64" data-testid="revenue-chart">
                  <ChartContainer
                    config={{
                      revenue: {
                        label: "Revenue",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                  >
                    <BarChart data={chartData}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                      />
                      <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appointment Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64" data-testid="appointments-chart">
                  <ChartContainer
                    config={{
                      appointments: {
                        label: "Appointments",
                        color: "hsl(var(--chart-2))",
                      },
                    }}
                  >
                    <LineChart data={chartData}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value: number) => [value, "Appointments"]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="appointments" 
                        stroke="var(--color-appointments)" 
                        strokeWidth={3}
                        dot={{ fill: "var(--color-appointments)", strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Campaign Performance */}
          {marketingPerf && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Total Impressions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {marketingPerf.summary?.impressions?.toLocaleString?.() || marketingPerf.summary?.impressions || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Clicks · CTR</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(marketingPerf.summary?.clicks || 0).toLocaleString?.()}
                    <span className="text-sm text-gray-500 ml-2">({marketingPerf.summary?.ctr || 0}%)</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Conversions · Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(marketingPerf.summary?.conversions || 0).toLocaleString?.()}
                    <span className="text-sm text-gray-500 ml-2">({marketingPerf.summary?.convRate || 0}%)</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Campaign Conversions */}
          {marketingPerf?.campaigns?.length ? (
            <div className="grid grid-cols-1 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Conversions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ChartContainer
                      config={{
                        conversions: { label: 'Conversions', color: 'hsl(var(--chart-3))' },
                      }}
                    >
                      <BarChart data={marketingPerf.campaigns.map((c: any) => ({ name: c.name, conversions: c.conversions, ctr: c.ctr }))}>
                        <XAxis dataKey="name" hide={false} tickFormatter={(s: string) => (s.length > 10 ? s.slice(0, 10) + '…' : s)} />
                        <YAxis />
                        <ChartTooltip content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const d: any = payload[0].payload;
                          return (
                            <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
                              <div className="font-medium">{d.name}</div>
                              <div>Conversions: {d.conversions}</div>
                              <div>CTR: {d.ctr}%</div>
                            </div>
                          );
                        }} />
                        <Bar dataKey="conversions" fill="var(--color-conversions)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                AI Business Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Performance Highlights</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-r-lg" data-testid="insight-revenue">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Revenue Growth:</strong> {analytics.revenue.change > 0 ? '+' : ''}{analytics.revenue.change.toFixed(1)}% increase driven by premium grooming services
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg" data-testid="insight-efficiency">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Efficiency:</strong> {analytics.staffUtilization.value.toFixed(0)}% staff utilization with optimized scheduling
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded-r-lg" data-testid="insight-satisfaction">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Customer Satisfaction:</strong> {analytics.customerSatisfaction.value.toFixed(1)}/5.0 rating with {currentMonthData ? (parseFloat(currentMonthData.repeatCustomerRate) * 100).toFixed(0) : 78}% retention rate
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Recommendations</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg" data-testid="recommendation-inventory">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Increase Executive Cut availability - highest revenue per appointment
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg" data-testid="recommendation-peak">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Promote Deluxe Grooming Packages during slower weekday mornings
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg" data-testid="recommendation-marketing">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Focus on beard services - growing trend in men's grooming
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
