import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  RefreshCw,
  AlertCircle,
  Minus,
  Sparkles
} from 'lucide-react'
import type { AnalyticsSnapshot } from '@shared/schema'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, XAxis, YAxis, Bar, LineChart, Line } from 'recharts'
import { queryClient } from '@/lib/queryClient'
import { PageContainer, PageHeader, GlassCard } from '@/components/layout/Page'

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
    queryKey: ['/api/analytics']
  })
  const { data: campaigns = [] } = useQuery<any[]>({ queryKey: ['/api/marketing/campaigns'] })
  const { data: loyaltyEntries = [] } = useQuery<any[]>({ queryKey: ['/api/loyalty/entries'] })
  const { data: posSales = [] } = useQuery<any[]>({ queryKey: ['/api/pos/sales'] })
  const { data: marketingPerf } = useQuery<any>({ queryKey: ['/api/marketing/performance'] })

  const snapshots = useMemo(
    () => [...(analyticsSnapshots ?? [])].sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [analyticsSnapshots]
  )

  const currentMonthData = snapshots[0]
  const previousMonthData = snapshots[1]

  const calculateChange = (current: string | number, previous: string | number): number => {
    const currentNum = typeof current === 'string' ? parseFloat(current) : current
    const previousNum = typeof previous === 'string' ? parseFloat(previous) : previous
    if (!previousNum) return 0
    return ((currentNum - previousNum) / previousNum) * 100
  }

  const analytics: AnalyticsData | null = currentMonthData && previousMonthData
    ? {
        revenue: {
          value: parseFloat(currentMonthData.totalRevenue),
          change: calculateChange(currentMonthData.totalRevenue, previousMonthData.totalRevenue)
        },
        appointments: {
          value: currentMonthData.totalAppointments,
          change: calculateChange(currentMonthData.totalAppointments, previousMonthData.totalAppointments)
        },
        customerSatisfaction: {
          value: parseFloat(currentMonthData.customerSatisfaction) * 5,
          change: calculateChange(
            parseFloat(currentMonthData.customerSatisfaction) * 5,
            parseFloat(previousMonthData.customerSatisfaction) * 5
          )
        },
        staffUtilization: {
          value: parseFloat(currentMonthData.utilizationRate) * 100,
          change: calculateChange(
            parseFloat(currentMonthData.utilizationRate) * 100,
            parseFloat(previousMonthData.utilizationRate) * 100
          )
        }
      }
    : null

  const chartData: ChartData[] = snapshots.slice(0, 3).reverse().map((snapshot) => {
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4" />
    if (change < 0) return <TrendingDown className="h-4 w-4" />
    return <Minus className="h-4 w-4" />
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-emerald-300'
    if (change < 0) return 'text-rose-300'
    return 'text-slate-400'
  }

  if (error) {
    return (
      <PageContainer>
        <PageHeader title="Performance Analytics" subtitle="AI-powered business insights and metrics" />
        <Alert className="border-slate-800 bg-slate-900/60" data-testid="error-analytics">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2 flex items-center gap-2 text-slate-200">
            Failed to load analytics data. Please try again.
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-700/60 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </PageContainer>
    )
  }

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title="Performance Analytics" subtitle="AI-powered business insights and metrics" />
        <GlassCard className="animate-pulse p-6">
          <div className="h-4 w-32 rounded bg-slate-800" />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 rounded-xl bg-slate-800/70" />
            ))}
          </div>
        </GlassCard>
      </PageContainer>
    )
  }

  if (snapshots.length < 2) {
    return (
      <PageContainer>
        <PageHeader title="Performance Analytics" subtitle="AI-powered business insights and metrics" />
        <Alert className="border-slate-800 bg-slate-900/60">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2 text-slate-200">
            Insufficient data for analytics. At least two months of data are required for trend analysis.
          </AlertDescription>
        </Alert>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Performance Analytics"
        subtitle="AI-powered operating metrics surfaced for the investment workflow."
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-600/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-violet-200">
            <Sparkles className="h-3 w-3" /> Value Venture Lab
          </span>
        }
        actions={
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-slate-700/60 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
                  data-testid="button-refresh"
                  aria-label="Refresh analytics"
                  onClick={handleRefresh}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reload latest analytics</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-slate-700/60 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
                  data-testid="button-export"
                  aria-label="Export analytics as CSV"
                >
                  <a href="/api/analytics/export" download>
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download CSV snapshot</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-slate-700/60 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
                  data-testid="button-print-report"
                  aria-label="Print analytics report"
                  onClick={() => window.print()}
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Print snapshot</TooltipContent>
            </Tooltip>
          </>
        }
      />

      {analytics && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Total Revenue',
                icon: <DollarSign className="h-4 w-4 text-slate-500" />,
                value: formatCurrency(analytics.revenue.value),
                change: analytics.revenue.change
              },
              {
                label: 'Appointments',
                icon: <Calendar className="h-4 w-4 text-slate-500" />,
                value: analytics.appointments.value.toLocaleString(),
                change: analytics.appointments.change
              },
              {
                label: 'Satisfaction',
                icon: <Users className="h-4 w-4 text-slate-500" />,
                value: `${analytics.customerSatisfaction.value.toFixed(1)}/5.0`,
                change: analytics.customerSatisfaction.change
              },
              {
                label: 'Staff Utilization',
                icon: <BarChart3 className="h-4 w-4 text-slate-500" />,
                value: `${analytics.staffUtilization.value.toFixed(0)}%`,
                change: analytics.staffUtilization.change
              }
            ].map((metric) => (
              <GlassCard key={metric.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-slate-200">{metric.label}</CardTitle>
                  {metric.icon}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-slate-50">{metric.value}</div>
                  <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${getChangeColor(metric.change)}`}>
                    {getChangeIcon(metric.change)}
                    {metric.change > 0 ? '+' : ''}
                    {Math.abs(metric.change).toFixed(1)}%
                  </div>
                </CardContent>
              </GlassCard>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <GlassCard>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-200">Active Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-slate-50">
                  {Array.isArray(campaigns) ? campaigns.filter((campaign: any) => campaign.status === 'active').length : 0}
                </div>
              </CardContent>
            </GlassCard>
            <GlassCard>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-200">New Loyalty Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-slate-50">{loyaltyEntries.length}</div>
              </CardContent>
            </GlassCard>
            <GlassCard>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-200">POS Sales (Month)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-slate-50">
                  {Array.isArray(posSales)
                    ? formatCurrency(
                        posSales.reduce((total: number, sale: any) => total + parseFloat(sale.total ?? '0'), 0)
                      )
                    : '$0'}
                </div>
              </CardContent>
            </GlassCard>
            <GlassCard>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-200">Weekly POS Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-slate-50">
                  {Array.isArray(posSales)
                    ? (() => {
                        const now = new Date()
                        const day = now.getDay()
                        const diff = day === 0 ? 6 : day - 1
                        const start = new Date(now)
                        start.setDate(now.getDate() - diff)
                        start.setHours(0, 0, 0, 0)
                        const end = new Date(start)
                        end.setDate(start.getDate() + 7)
                        end.setHours(0, 0, 0, 0)
                        return posSales.filter((sale: any) => {
                          const date = new Date(sale.createdAt)
                          return date >= start && date < end
                        }).length
                      })()
                    : 0}
                </div>
              </CardContent>
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <GlassCard>
              <CardHeader>
                <CardTitle className="text-sm text-slate-200">Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64" data-testid="revenue-chart">
                  <ChartContainer
                    config={{
                      revenue: { label: 'Revenue', color: 'hsl(var(--chart-1))' }
                    }}
                  >
                    <BarChart data={chartData}>
                      <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                      <ChartTooltip content={<ChartTooltipContent />} formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                      <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </GlassCard>
            <GlassCard>
              <CardHeader>
                <CardTitle className="text-sm text-slate-200">Appointment Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64" data-testid="appointments-chart">
                  <ChartContainer
                    config={{
                      appointments: { label: 'Appointments', color: 'hsl(var(--chart-2))' }
                    }}
                  >
                    <LineChart data={chartData}>
                      <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                      <ChartTooltip content={<ChartTooltipContent />} formatter={(value: number) => [value, 'Appointments']} />
                      <Line
                        type="monotone"
                        dataKey="appointments"
                        stroke="var(--color-appointments)"
                        strokeWidth={3}
                        dot={{ fill: 'var(--color-appointments)', strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </GlassCard>
          </div>

          {marketingPerf?.campaigns?.length ? (
            <GlassCard>
              <CardHeader>
                <CardTitle className="text-sm text-slate-200">Campaign Conversions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ChartContainer
                    config={{ conversions: { label: 'Conversions', color: 'hsl(var(--chart-3))' } }}
                  >
                    <BarChart
                      data={marketingPerf.campaigns.map((campaign: any) => ({
                        name: campaign.name,
                        conversions: campaign.conversions,
                        ctr: campaign.ctr
                      }))}
                    >
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} tickFormatter={(name: string) => (name.length > 12 ? `${name.slice(0, 12)}…` : name)} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null
                          const value = payload[0]?.payload
                          if (!value) return null
                          return (
                            <div className="rounded-md border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-200 shadow-lg">
                              <div className="font-medium">{value.name}</div>
                              <div>Conversions: {value.conversions}</div>
                              <div>CTR: {value.ctr}%</div>
                            </div>
                          )
                        }}
                      />
                      <Bar dataKey="conversions" fill="var(--color-conversions)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </GlassCard>
          ) : null}

          <GlassCard>
            <CardHeader>
              <CardTitle className="text-sm text-slate-200">AI Insights</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-3 text-sm text-slate-200">
                <h4 className="text-xs uppercase tracking-[0.18em] text-slate-500">Performance highlights</h4>
                <div className="rounded-xl border border-emerald-600/40 bg-emerald-900/20 p-3" data-testid="insight-revenue">
                  Revenue up {analytics.revenue.change.toFixed(1)}% month-over-month, led by premium services.
                </div>
                <div className="rounded-xl border border-sky-600/40 bg-sky-900/20 p-3" data-testid="insight-efficiency">
                  Staff utilization at {analytics.staffUtilization.value.toFixed(0)}% with optimal scheduling cadence.
                </div>
                <div className="rounded-xl border border-violet-600/40 bg-violet-900/20 p-3" data-testid="insight-satisfaction">
                  Customer satisfaction at {analytics.customerSatisfaction.value.toFixed(1)}/5.0 with strong retention signals.
                </div>
              </div>
              <div className="space-y-3 text-sm text-slate-200">
                <h4 className="text-xs uppercase tracking-[0.18em] text-slate-500">Recommended next moves</h4>
                <div className="rounded-xl border border-amber-600/40 bg-amber-900/10 p-3" data-testid="recommendation-inventory">
                  Increase Executive Cut availability—the highest revenue per appointment.
                </div>
                <div className="rounded-xl border border-amber-600/40 bg-amber-900/10 p-3" data-testid="recommendation-peak">
                  Promote deluxe packages midweek to shore up softer dayparts.
                </div>
                <div className="rounded-xl border border-amber-600/40 bg-amber-900/10 p-3" data-testid="recommendation-marketing">
                  Target beard services in paid campaigns—fastest-growing category QoQ.
                </div>
              </div>
            </CardContent>
          </GlassCard>
        </>
      )}
    </PageContainer>
  )
}
