import { AdminSidebar } from '@/components/AdminSidebar'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

function validateAdminToken(): boolean {
  const adminToken = process.env.ADMIN_TOKEN
  const smokeMode = process.env.SMOKE_MODE === '1'
  
  if (smokeMode) {
    return true // Allow access in smoke mode for testing
  }
  
  if (!adminToken) {
    return false
  }
  
  // In a real implementation, you'd check the request headers or session
  // For now, we'll assume valid admin access if ADMIN_TOKEN is set
  return true
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isAuthorized = validateAdminToken()
  
  if (!isAuthorized) {
    redirect('/api/admin/auth')
  }

  return (
    <div className="min-h-screen flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col lg:ml-0">
        {children}
      </div>
    </div>
  )
}
