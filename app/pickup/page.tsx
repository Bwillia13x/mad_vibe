import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PickupPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Andreas Vibe - Pickup</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <i className="fas fa-box text-primary text-2xl"></i>
          </div>
          <h2 className="text-xl font-semibold text-foreground">Order Pickup Service</h2>
          <p className="text-muted-foreground">
            This service is available for authorized pickup requests. Please contact support for assistance.
          </p>
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              For pickup scheduling and order management, please access the admin dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
