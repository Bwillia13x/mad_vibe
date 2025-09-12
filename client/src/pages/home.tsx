import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Package, Users, BarChart3, Settings } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4" data-testid="heading-main">
            Andreas Vibe Business Management
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto" data-testid="text-description">
            Streamline your business operations with our comprehensive management platform
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow" data-testid="card-scheduling">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Calendar className="h-6 w-6 text-blue-600" />
                <CardTitle>Scheduling</CardTitle>
              </div>
              <CardDescription>Manage appointments and bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/scheduling">
                <Button className="w-full" data-testid="button-scheduling">
                  Open Scheduling
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow" data-testid="card-inventory">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Package className="h-6 w-6 text-green-600" />
                <CardTitle>Inventory</CardTitle>
              </div>
              <CardDescription>Track products and stock levels</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/inventory">
                <Button className="w-full" data-testid="button-inventory">
                  Manage Inventory
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow" data-testid="card-staff">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Users className="h-6 w-6 text-purple-600" />
                <CardTitle>Staff Management</CardTitle>
              </div>
              <CardDescription>Manage employees and schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/staff">
                <Button className="w-full" data-testid="button-staff">
                  View Staff
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow" data-testid="card-analytics">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-6 w-6 text-orange-600" />
                <CardTitle>Analytics</CardTitle>
              </div>
              <CardDescription>View business insights and reports</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/analytics">
                <Button className="w-full" data-testid="button-analytics">
                  View Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow" data-testid="card-settings">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Settings className="h-6 w-6 text-gray-600" />
                <CardTitle>Settings</CardTitle>
              </div>
              <CardDescription>Configure system preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/settings">
                <Button className="w-full" data-testid="button-settings">
                  Open Settings
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow bg-blue-50 dark:bg-blue-900/20" data-testid="card-admin">
            <CardHeader>
              <CardTitle className="text-blue-800 dark:text-blue-200">Admin Dashboard</CardTitle>
              <CardDescription>Access full administrative controls</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin">
                <Button variant="default" className="w-full" data-testid="button-admin">
                  Enter Admin Panel
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Status Section */}
        <div className="text-center">
          <Card className="max-w-md mx-auto" data-testid="card-status">
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" data-testid="status-indicator"></div>
                <span className="text-green-700 dark:text-green-400" data-testid="text-status">All systems operational</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}