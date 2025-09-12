import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, AlertTriangle, CheckCircle, Mail, Send, ArrowRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useQuery } from '@tanstack/react-query'
import type { InventoryItem } from '@shared/schema'

export default function InventoryPage() {
  const [sendingOrder, setSendingOrder] = useState(false)
  const { toast } = useToast()

  // Fetch inventory data from API
  const { data: inventory = [], isLoading: loading, error } = useQuery<InventoryItem[]>({
    queryKey: ['/api', 'inventory'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Helper function to calculate status based on current vs min stock
  const getCalculatedStatus = (item: InventoryItem): 'in-stock' | 'low-stock' | 'out-of-stock' => {
    if (item.currentStock === 0) return 'out-of-stock'
    if (item.currentStock <= item.minStock) return 'low-stock'
    return 'in-stock'
  }

  // Helper function to format currency in CAD
  const formatCAD = (amount: string | number) => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(numericAmount)
  }

  const getStatusColor = (status: 'in-stock' | 'low-stock' | 'out-of-stock') => {
    switch (status) {
      case 'in-stock': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'low-stock': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'out-of-stock': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const getStatusIcon = (status: 'in-stock' | 'low-stock' | 'out-of-stock') => {
    switch (status) {
      case 'in-stock': return <CheckCircle className="h-4 w-4" />
      case 'low-stock': return <AlertTriangle className="h-4 w-4" />
      case 'out-of-stock': return <AlertTriangle className="h-4 w-4" />
      default: return <Package className="h-4 w-4" />
    }
  }

  const handleSendPurchaseOrder = async () => {
    setSendingOrder(true)
    try {
      // This would call the actual email API in production
      console.log('Sending purchase order email...')
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: "Purchase Order Sent",
        description: "Low stock items have been sent to suppliers via email with CSV attachment."
      })
    } catch (error) {
      console.error('Failed to send purchase order:', error)
      toast({
        title: "Failed to Send Order",
        description: "Please try again or contact support.",
        variant: "destructive"
      })
    } finally {
      setSendingOrder(false)
    }
  }

  const lowStockItems = inventory.filter(item => {
    const status = getCalculatedStatus(item)
    return status === 'low-stock' || status === 'out-of-stock'
  })

  // Calculate total inventory value
  const totalInventoryValue = inventory.reduce((total, item) => {
    const cost = typeof item.unitCost === 'string' ? parseFloat(item.unitCost) : item.unitCost
    return total + (cost * item.currentStock)
  }, 0)

  if (loading) {
    return (
      <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to Load Inventory</h3>
          <p className="text-gray-600 dark:text-gray-400">Please try refreshing the page or contact support.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white" data-testid="heading-inventory">
          Inventory Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Monitor stock levels and automate purchase orders</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="total-items">
                  {inventory.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="low-stock-count">
                  {lowStockItems.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Stock</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="in-stock-count">
                  {inventory.filter(item => getCalculatedStatus(item) === 'in-stock').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="total-inventory-value">
                  {formatCAD(totalInventoryValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Inventory</span>
              <Button variant="ghost" size="sm" data-testid="button-view-all">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {inventory.map((item) => {
              const status = getCalculatedStatus(item)
              return (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                  data-testid={`inventory-item-${item.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white" data-testid={`item-name-${item.id}`}>
                        {item.name} - {item.sku}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400" data-testid={`supplier-${item.id}`}>
                        {item.brand} • {item.supplier}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 truncate" data-testid={`category-${item.id}`}>
                        {item.category} • {formatCAD(item.unitCost)} unit cost
                        {item.retailPrice && ` • ${formatCAD(item.retailPrice)} retail`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white" data-testid={`stock-${item.id}`}>
                      {item.currentStock} / {item.minStock} min
                    </p>
                    <span 
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${getStatusColor(status)}`}
                      data-testid={`status-${item.id}`}
                    >
                      {getStatusIcon(status)}
                      {status.replace('-', ' ')}
                    </span>
                  </div>
                </div>
              )
            })}

            {/* Automated Purchase Orders */}
            {lowStockItems.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg" data-testid="purchase-order-panel">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-blue-800 dark:text-blue-200" data-testid="auto-order-title">
                    Auto Purchase Order
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3" data-testid="order-description">
                  {lowStockItems.length} low stock item{lowStockItems.length !== 1 ? 's' : ''} automatically queued for vendor email with CSV attachment.
                </p>
                <Button 
                  onClick={handleSendPurchaseOrder}
                  disabled={sendingOrder}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-send-order"
                >
                  {sendingOrder ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Order Email
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-16" data-testid="button-add-item">
                <div className="text-center">
                  <Package className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-sm">Add Item</div>
                </div>
              </Button>
              <Button variant="outline" className="h-16" data-testid="button-scan-barcode">
                <div className="text-center">
                  <CheckCircle className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-sm">Scan Barcode</div>
                </div>
              </Button>
              <Button variant="outline" className="h-16" data-testid="button-generate-report">
                <div className="text-center">
                  <Mail className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-sm">Generate Report</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}