'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

  useEffect(() => {
    // Mock inventory data - in production this would fetch from API
    const mockInventory: InventoryItem[] = [
      {
        id: '1',
        name: 'Professional Hair Color',
        sku: 'RS-HC001',
        supplier: 'Andreas Co. Supplier',
        stock: 23,
        status: 'in-stock',
        reorderPoint: 10
      },
      {
        id: '2',
        name: 'Styling Tools',
        sku: 'RS-ST002',
        supplier: 'RS Supplier',
        stock: 5,
        status: 'low-stock',
        reorderPoint: 10
      }
    ]
    
    setTimeout(() => {
      setInventory(mockInventory)
      setLoading(false)
    }, 1000)
  }, [])

  const getStatusColor = (status: InventoryItem['status']) => {
    switch (status) {
      case 'in-stock': return 'bg-accent/20 text-accent'
      case 'low-stock': return 'bg-destructive/20 text-destructive'
      case 'out-of-stock': return 'bg-destructive/30 text-destructive'
      default: return 'bg-muted/20 text-muted-foreground'
    }
  }

  const handleSendPurchaseOrder = async () => {
    try {
      // This would call the actual email API in production
      console.log('Sending purchase order email...')
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Purchase order email sent successfully!')
    } catch (error) {
      console.error('Failed to send purchase order:', error)
      alert('Failed to send purchase order email')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Inventory Management</h1>
        <p className="text-muted-foreground">Monitor stock levels and automate purchase orders</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Inventory</span>
              <button className="text-primary hover:text-primary/80 text-sm font-medium">
                View All <i className="fas fa-arrow-right ml-1"></i>
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {inventory.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">{item.name} - {item.sku}</p>
                  <p className="text-sm text-muted-foreground">{item.supplier}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{item.stock} units</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(item.status)}`}>
                    {item.status.replace('-', ' ')}
                  </span>
                </div>
              </div>
            ))}

            {/* Automated Purchase Orders */}
            <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-envelope text-primary"></i>
                <span className="font-medium text-primary">Auto Purchase Order</span>
              </div>
              <p className="text-sm text-foreground mb-3">Low stock items automatically queued for vendor email with CSV attachment.</p>
              <button 
                onClick={handleSendPurchaseOrder}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <i className="fas fa-paper-plane mr-2"></i>Send Order Email
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
