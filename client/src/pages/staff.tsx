import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageContainer, PageHeader, GlassCard } from '@/components/layout/Page'
import { Skeleton } from '@/components/ui/skeleton'
import { User, Clock, Star, Calendar, Users, UserCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Staff, Appointment, Customer, Service } from '@shared/schema'

interface StaffAvailability {
  [key: string]: { start: string; end: string } | 'off'
}

interface StaffWithMetrics extends Staff {
  status: 'available' | 'busy' | 'offline'
  currentAppointment?: string
  todayAppointments: number
}

export default function StaffPage() {
  // Fetch staff data
  const { data: staffData, isLoading: staffLoading } = useQuery<Staff[]>({
    queryKey: ['/api/staff']
  })

  // Fetch today's appointments to calculate staff metrics
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery<
    (Appointment & { customer?: Customer; service?: Service })[]
  >({
    queryKey: ['/api/appointments'],
    queryFn: async () => {
      const response = await fetch('/api/appointments?day=today', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch appointments')
      }
      return response.json()
    }
  })

  // Fetch customers to get names for current appointments
  const { data: customersData } = useQuery<Customer[]>({
    queryKey: ['/api/customers']
  })

  // Fetch services to get service names for current appointments
  const { data: servicesData } = useQuery<Service[]>({
    queryKey: ['/api/services']
  })

  const loading = staffLoading || appointmentsLoading

  // Process staff data to add metrics
  const staff: StaffWithMetrics[] = (staffData || []).map((member) => {
    const todaysAppointments = (appointmentsData || []).filter((apt) => apt.staffId === member.id)

    // Find current appointment (in-progress status)
    const currentAppointment = todaysAppointments.find((apt) => apt.status === 'in-progress')

    // Determine status
    let status: 'available' | 'busy' | 'offline' = 'available'
    if (!member.isActive) {
      status = 'offline'
    } else if (currentAppointment) {
      status = 'busy'
    } else {
      // Check if staff is scheduled to be working today
      const now = new Date()
      const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      const today = dayNames[now.getDay()]
      const availability = member.availability as StaffAvailability
      const todaySchedule = availability[today]

      if (todaySchedule === 'off' || !todaySchedule) {
        status = 'offline'
      } else {
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        const currentTime = currentHour * 60 + currentMinute

        const startTime =
          parseInt(todaySchedule.start.split(':')[0]) * 60 +
          parseInt(todaySchedule.start.split(':')[1])
        const endTime =
          parseInt(todaySchedule.end.split(':')[0]) * 60 + parseInt(todaySchedule.end.split(':')[1])

        if (currentTime < startTime || currentTime > endTime) {
          status = 'offline'
        }
      }
    }

    // Get current appointment description
    let currentAppointmentDesc = undefined
    if (currentAppointment) {
      const customer = customersData?.find((c) => c.id === currentAppointment.customerId)
      const service = servicesData?.find((s) => s.id === currentAppointment.serviceId)
      if (customer && service) {
        currentAppointmentDesc = `${customer.name} - ${service.name}`
      }
    }

    return {
      ...member,
      status,
      currentAppointment: currentAppointmentDesc,
      todayAppointments: todaysAppointments.length
    }
  })

  const getStatusColor = (status: StaffWithMetrics['status']) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'busy':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'offline':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const getStatusIcon = (status: StaffWithMetrics['status']) => {
    switch (status) {
      case 'available':
        return <UserCheck className="h-4 w-4" />
      case 'busy':
        return <Clock className="h-4 w-4" />
      case 'offline':
        return <User className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const averageRating =
    staff.length > 0
      ? (staff.reduce((sum, member) => sum + parseFloat(member.rating), 0) / staff.length).toFixed(
          1
        )
      : '0.0'
  const activeStaff = staff.filter((member) => member.status !== 'offline').length
  const totalAppointments = staff.reduce((sum, member) => sum + member.todayAppointments, 0)

  if (loading) {
    return (
      <PageContainer>
        <PageHeader
          title="Staff Management"
          subtitle="Monitor team performance and availability"
          testId="heading-staff"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl bg-slate-800/60" />
          ))}
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Staff Management"
        subtitle="Monitor team performance and availability"
        testId="heading-staff"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Staff</p>
                <p
                  className="text-2xl font-bold text-gray-900 dark:text-white"
                  data-testid="total-staff"
                >
                  {staff.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Today</p>
                <p
                  className="text-2xl font-bold text-gray-900 dark:text-white"
                  data-testid="active-staff"
                >
                  {activeStaff}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Appointments</p>
                <p
                  className="text-2xl font-bold text-gray-900 dark:text-white"
                  data-testid="total-appointments"
                >
                  {totalAppointments}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Rating</p>
                <p
                  className="text-2xl font-bold text-gray-900 dark:text-white"
                  data-testid="avg-rating"
                >
                  {averageRating}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {staff.map((member) => (
          <Card key={member.id} data-testid={`staff-card-${member.id}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3
                    className="font-semibold text-gray-900 dark:text-white"
                    data-testid={`staff-name-${member.id}`}
                  >
                    {member.name}
                  </h3>
                  <p
                    className="text-sm text-gray-600 dark:text-gray-400"
                    data-testid={`staff-role-${member.id}`}
                  >
                    {member.role}
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${getStatusColor(member.status)}`}
                  data-testid={`staff-status-${member.id}`}
                >
                  {getStatusIcon(member.status)}
                  {member.status}
                </span>
              </div>

              {member.currentAppointment && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current</span>
                  <span
                    className="text-sm text-gray-900 dark:text-white"
                    data-testid={`current-appointment-${member.id}`}
                  >
                    {member.currentAppointment}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Today's Appointments
                </span>
                <span
                  className="text-sm text-gray-900 dark:text-white"
                  data-testid={`today-appointments-${member.id}`}
                >
                  {member.todayAppointments}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Rating</span>
                <div className="flex items-center gap-1">
                  <span
                    className="text-sm text-gray-900 dark:text-white"
                    data-testid={`staff-rating-${member.id}`}
                  >
                    {parseFloat(member.rating).toFixed(1)}
                  </span>
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid={`button-view-schedule-${member.id}`}
                >
                  View Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Team Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Team Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Today's Highlights</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Top Performer</span>
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    {staff.length > 0
                      ? `${staff.reduce((prev, current) => (prev.todayAppointments > current.todayAppointments ? prev : current)).name} (${staff.reduce((prev, current) => (prev.todayAppointments > current.todayAppointments ? prev : current)).todayAppointments} appointments)`
                      : 'Loading...'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Team Utilization</span>
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {activeStaff > 0 ? `${Math.round((activeStaff / staff.length) * 100)}%` : '0%'}{' '}
                    (Active Staff)
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" data-testid="button-add-staff">
                  <User className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
                <Button variant="outline" size="sm" data-testid="button-shift-planning">
                  <Calendar className="h-4 w-4 mr-2" />
                  Shift Planning
                </Button>
                <Button variant="outline" size="sm" data-testid="button-performance">
                  <Star className="h-4 w-4 mr-2" />
                  Performance
                </Button>
                <Button variant="outline" size="sm" data-testid="button-time-tracking">
                  <Clock className="h-4 w-4 mr-2" />
                  Time Tracking
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
