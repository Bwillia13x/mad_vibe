import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, Calendar, Users, TrendingUp, TrendingDown, BarChart3, Download, RefreshCw } from 'lucide-react'

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
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const mockAnalytics: AnalyticsData = {
      revenue: { value: 12450, change: 8.2 },
      appointments: { value: 156, change: 12.5 },
      customerSatisfaction: { value: 4.8, change: 2.1 },
      staffUtilization: { value: 82, change: -1.5 }
    }

    const mockChartData: ChartData[] = [
      { month: 'Jan', revenue: 8500, appointments: 120 },
      { month: 'Feb', revenue: 9200, appointments: 135 },
      { month: 'Mar', revenue: 11800, appointments: 152 },
      { month: 'Apr', revenue: 12450, appointments: 156 },
    ]
    
    setTimeout(() => {
      setAnalytics(mockAnalytics)
      setChartData(mockChartData)
      setLoading(false)
    }, 1000)
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getChangeIcon = (change: number) => {
    return change > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
  }

  const getChangeColor = (change: number) => {
    return change > 0 
      ? "text-green-600 dark:text-green-400" 
      : "text-red-600 dark:text-red-400"
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" data-testid="button-refresh">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
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
                  {analytics.revenue.change > 0 ? '+' : ''}{analytics.revenue.change}% from last month
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
                  {analytics.appointments.change > 0 ? '+' : ''}{analytics.appointments.change}% from last month
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
                  {analytics.customerSatisfaction.change > 0 ? '+' : ''}{analytics.customerSatisfaction.change}% from last month
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
                  {analytics.staffUtilization.value}%
                </div>
                <p className={`text-xs flex items-center gap-1 ${getChangeColor(analytics.staffUtilization.change)}`} data-testid="utilization-change">
                  {getChangeIcon(analytics.staffUtilization.change)}
                  {analytics.staffUtilization.change > 0 ? '+' : ''}{analytics.staffUtilization.change}% from last month
                </p>
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
                <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg" data-testid="revenue-chart">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Revenue trending upward
                    </p>
                    <div className="mt-4 space-y-2">
                      {chartData.map((data, index) => (
                        <div key={data.month} className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{data.month}</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(data.revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appointment Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg" data-testid="appointments-chart">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Steady appointment growth
                    </p>
                    <div className="mt-4 space-y-2">
                      {chartData.map((data, index) => (
                        <div key={data.month} className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{data.month}</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {data.appointments} appointments
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
                        <strong>Revenue Growth:</strong> 8.2% increase driven by premium services adoption
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg" data-testid="insight-efficiency">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Efficiency:</strong> AI scheduling reduced wait times by 15 minutes on average
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded-r-lg" data-testid="insight-satisfaction">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Customer Satisfaction:</strong> 4.8/5.0 rating with 97% retention rate
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Recommendations</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg" data-testid="recommendation-inventory">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Optimize inventory ordering for 12% cost reduction
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg" data-testid="recommendation-peak">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Consider peak-hour pricing to balance demand
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg" data-testid="recommendation-marketing">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Target marketing campaigns during low-booking periods
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