import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, AlertTriangle, CheckCircle, Mail, Send, ArrowRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface InventoryItem {
  id: string
  name: string
  sku: string
  supplier: string
  stock: number
  status: 'in-stock' | 'low-stock' | 'out-of-stock'
  reorderPoint: number
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingOrder, setSendingOrder] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Mock inventory data - in production this would fetch from API
    const mockInventory: InventoryItem[] = [
      {
        id: '1',
        name: 'Professional Hair Color',
        sku: 'AC-HC001',
        supplier: 'Andreas Co. Supplier',
        stock: 23,
        status: 'in-stock',
        reorderPoint: 10
      },
      {
        id: '2',
        name: 'Styling Tools',
        sku: 'AC-ST002',
        supplier: 'Andreas Co. Supplier',
        stock: 5,
        status: 'low-stock',
        reorderPoint: 10
      },
      {
        id: '3',
        name: 'Premium Shampoo',
        sku: 'AC-SH003',
        supplier: 'Beauty Supplies Inc',
        stock: 0,
        status: 'out-of-stock',
        reorderPoint: 15
      },
      {
        id: '4',
        name: 'Hair Treatment Oil',
        sku: 'AC-HT004',
        supplier: 'Andreas Co. Supplier',
        stock: 45,
        status: 'in-stock',
        reorderPoint: 20
      }
    ]
    
    setTimeout(() => {
      setInventory(mockInventory)
      setLoading(false)
    }, 1000)
  }, [])

  const getStatusColor = (status: InventoryItem['status']) => {
    switch (status) {
      case 'in-stock': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'low-stock': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'out-of-stock': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const getStatusIcon = (status: InventoryItem['status']) => {
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

  const lowStockItems = inventory.filter(item => item.status === 'low-stock' || item.status === 'out-of-stock')

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

  return (
    <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white" data-testid="heading-inventory">
          Inventory Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Monitor stock levels and automate purchase orders</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                  {inventory.filter(item => item.status === 'in-stock').length}
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
            {inventory.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                data-testid={`inventory-item-${item.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white" data-testid={`item-name-${item.id}`}>
                      {item.name} - {item.sku}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400" data-testid={`supplier-${item.id}`}>
                      {item.supplier}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white" data-testid={`stock-${item.id}`}>
                    {item.stock} units
                  </p>
                  <span 
                    className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${getStatusColor(item.status)}`}
                    data-testid={`status-${item.id}`}
                  >
                    {getStatusIcon(item.status)}
                    {item.status.replace('-', ' ')}
                  </span>
                </div>
              </div>
            ))}

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