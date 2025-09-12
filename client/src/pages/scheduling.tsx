import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Clock, CheckCircle, XCircle, Bot, Zap } from 'lucide-react'
import type { Appointment, Service, Staff, Customer } from '@shared/schema'

// Extended appointment interface with joined data for display
interface AppointmentWithDetails extends Appointment {
  customer?: Pick<Customer, 'name' | 'phone'>
  service?: Pick<Service, 'name' | 'duration' | 'price' | 'category'>
  staff?: Pick<Staff, 'name' | 'role'>
}

export default function SchedulingPage() {
  // Fetch today's appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments', 'today'],
    queryFn: async () => {
      const response = await fetch('/api/appointments?day=today')
      if (!response.ok) throw new Error('Failed to fetch appointments')
      return response.json()
    }
  })

  // Fetch all services for joining
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const response = await fetch('/api/services')
      if (!response.ok) throw new Error('Failed to fetch services')
      return response.json()
    }
  })

  // Fetch all staff for joining
  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ['/api/staff'],
    queryFn: async () => {
      const response = await fetch('/api/staff')
      if (!response.ok) throw new Error('Failed to fetch staff')
      return response.json()
    }
  })

  // Fetch customers for joining (limited data for privacy)
  const { data: customers = [] } = useQuery<Pick<Customer, 'id' | 'name' | 'phone'>[]>({
    queryKey: ['/api/customers'],
    queryFn: async () => {
      const response = await fetch('/api/customers')
      if (!response.ok) throw new Error('Failed to fetch customers')
      return response.json()
    }
  })

  // Join appointment data with related entities
  const appointmentsWithDetails: AppointmentWithDetails[] = appointments.map(appointment => {
    const customer = customers.find(c => c.id === appointment.customerId)
    const service = services.find(s => s.id === appointment.serviceId)
    const staffMember = staff.find(s => s.id === appointment.staffId)
    
    return {
      ...appointment,
      customer: customer ? { name: customer.name, phone: customer.phone } : undefined,
      service: service ? { 
        name: service.name, 
        duration: service.duration, 
        price: service.price,
        category: service.category 
      } : undefined,
      staff: staffMember ? { name: staffMember.name, role: staffMember.role } : undefined
    }
  })

  const loading = appointmentsLoading

  // Format price in CAD currency
  const formatPrice = (price: string | undefined) => {
    if (!price) return ''
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(parseFloat(price))
  }

  // Format appointment time
  const formatTime = (dateTime: Date | string) => {
    const date = new Date(dateTime)
    return date.toLocaleTimeString('en-CA', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'in-progress': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="h-4 w-4" />
      case 'confirmed': return <Clock className="h-4 w-4" />
      case 'in-progress': return <Zap className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const handleApplyOptimization = () => {
    // In a real implementation, this would apply the AI suggestion
    console.log('Applying AI scheduling optimization...')
    // Could show a toast notification here
  }

  const handleDismissOptimization = () => {
    // In a real implementation, this would dismiss the AI suggestion
    console.log('Dismissing AI scheduling optimization...')
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white" data-testid="heading-scheduling">
          AI-Powered Scheduling
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Manage appointments with intelligent conflict detection</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Today's Schedule</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600 dark:text-blue-400" data-testid="text-live-updates">Live Updates</span>
                <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appointmentsWithDetails.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No appointments scheduled for today</p>
              </div>
            ) : (
              appointmentsWithDetails
                .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
                .map((appointment) => (
                <div 
                  key={appointment.id} 
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                  data-testid={`appointment-${appointment.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white" data-testid={`customer-name-${appointment.id}`}>
                        {appointment.customer?.name || 'Unknown Customer'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400" data-testid={`service-${appointment.id}`}>
                        {appointment.service?.name || 'Unknown Service'} - {appointment.service?.duration || 0}min
                        {appointment.service?.price && (
                          <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                            {formatPrice(appointment.service.price)}
                          </span>
                        )}
                      </p>
                      {appointment.staff && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          with {appointment.staff.name} ({appointment.staff.role})
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white" data-testid={`appointment-time-${appointment.id}`}>
                      {formatTime(appointment.scheduledStart)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(appointment.scheduledStart)} - {formatTime(appointment.scheduledEnd)}
                    </p>
                    <span 
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full mt-1 ${getStatusColor(appointment.status)}`}
                      data-testid={`status-${appointment.id}`}
                    >
                      {getStatusIcon(appointment.status)}
                      {appointment.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* AI Conflict Detection */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg" data-testid="ai-optimization-panel">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-800 dark:text-blue-200" data-testid="ai-assistant-title">
                  AI Scheduling Assistant
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300" data-testid="ai-suggestion">
                {appointmentsWithDetails.length > 0 ? (
                  `Analyzing ${appointmentsWithDetails.length} appointments for optimization opportunities...`
                ) : (
                  'No appointments to optimize today. Schedule looks clear!'
                )}
              </p>
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  onClick={handleApplyOptimization}
                  data-testid="button-apply-optimization"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Apply
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleDismissOptimization}
                  data-testid="button-dismiss-optimization"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-16" data-testid="button-new-appointment">
                <div className="text-center">
                  <Clock className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-sm">New Appointment</div>
                </div>
              </Button>
              <Button variant="outline" className="h-16" data-testid="button-view-calendar">
                <div className="text-center">
                  <User className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-sm">View Calendar</div>
                </div>
              </Button>
              <Button variant="outline" className="h-16" data-testid="button-staff-schedule">
                <div className="text-center">
                  <Bot className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-sm">Staff Schedule</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}