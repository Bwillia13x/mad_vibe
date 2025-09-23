import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Package, AlertTriangle, CheckCircle, Mail, Send, Sparkles, ArrowRight } from 'lucide-react'
import type { InventoryItem } from '@shared/schema'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { PageContainer, PageHeader, GlassCard } from '@/components/layout/Page'
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function InventoryPage() {
  const [sendingOrder, setSendingOrder] = useState(false)
  const { toast } = useToast()

  const {
    data: inventory = [],
    isLoading,
    error,
    refetch
  } = useQuery<InventoryItem[]>({
    queryKey: ['/api', 'inventory'],
    staleTime: 5 * 60 * 1000
  })

  const lowStockItems = useMemo(
    () =>
      inventory.filter((item) => {
        if (item.currentStock === 0) return true
        return item.currentStock <= item.minStock
      }),
    [inventory]
  )

  const formatCAD = (amount: string | number) => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(numericAmount)
  }

  const handleSendPurchaseOrder = async () => {
    setSendingOrder(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast({
        title: 'Purchase order sent',
        description: 'Low stock items have been queued for supplier outreach.'
      })
    } catch (err) {
      console.error('Failed to send purchase order', err)
      toast({
        title: 'Failed to send order',
        description: 'Please try again or contact support.',
        variant: 'destructive'
      })
    } finally {
      setSendingOrder(false)
    }
  }

  const getStatusData = (item: InventoryItem) => {
    if (item.currentStock === 0) {
      return {
        tone: 'bg-rose-500/10 text-rose-200 border border-rose-500/40',
        icon: <AlertTriangle className="h-4 w-4" />,
        label: 'Out of stock'
      }
    }
    if (item.currentStock <= item.minStock) {
      return {
        tone: 'bg-amber-500/10 text-amber-200 border border-amber-500/40',
        icon: <AlertTriangle className="h-4 w-4" />,
        label: 'Low stock'
      }
    }
    return {
      tone: 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/30',
      icon: <CheckCircle className="h-4 w-4" />,
      label: 'In stock'
    }
  }

  if (error) {
    return (
      <PageContainer>
        <PageHeader
          title="Inventory"
          subtitle="Track critical supplies and pro-actively trigger vendor workflows."
          testId="heading-inventory"
        />
        <GlassCard className="border-rose-500/40 bg-rose-900/20 p-6">
          <div className="flex items-center justify-between text-sm text-rose-200">
            <span>Failed to load inventory data. Retry?</span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-rose-500/40 bg-rose-900/20 text-rose-200 hover:bg-rose-900/40"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        </GlassCard>
      </PageContainer>
    )
  }

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          title="Inventory"
          subtitle="Track critical supplies and pro-actively trigger vendor workflows."
          testId="heading-inventory"
        />
        <GlassCard className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-xl bg-slate-800/60" />
          ))}
        </GlassCard>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Inventory"
        subtitle="Monitor supply positions, detect risks, and coordinate with vendors directly from the command center."
        testId="heading-inventory"
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-600/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-violet-200">
            <Sparkles className="h-3 w-3" /> Operations
          </span>
        }
        actions={
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendPurchaseOrder}
                  disabled={sendingOrder || lowStockItems.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border-emerald-500/40 bg-emerald-600/10 text-emerald-200 hover:bg-emerald-600/20"
                >
                  <Send className="h-4 w-4" /> Send PO
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generate a purchase order for low-stock items</TooltipContent>
            </Tooltip>
          </>
        }
      />

      <GlassCard>
        <CardHeader className="flex flex-col gap-2 border-b border-slate-800/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm text-slate-200">Low stock watchlist</CardTitle>
            <p className="text-xs text-slate-500">
              Prioritize replenishment for critical grooming supplies.
            </p>
          </div>
          <div className="text-xs text-slate-400">
            {lowStockItems.length} of {inventory.length} items below safety stock
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-slate-800/60 text-sm">
          {lowStockItems.length === 0 && (
            <div className="py-6 text-center text-slate-400">
              All SKUs are healthy. No action required.
            </div>
          )}
          {lowStockItems.map((item) => {
            const status = getStatusData(item)
            return (
              <div
                key={item.id}
                className="grid gap-4 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Package className="h-4 w-4 text-slate-500" />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <p className="text-xs text-slate-500">SKU {item.sku}</p>
                </div>
                <div className="flex flex-col gap-1 text-xs text-slate-400">
                  <span>On hand: {item.currentStock}</span>
                  <span>Minimum: {item.minStock}</span>
                </div>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${status.tone}`}
                  >
                    {status.icon}
                    {status.label}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-slate-700/60 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
                  >
                    View supplier
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </GlassCard>

      <GlassCard>
        <CardHeader className="flex flex-col gap-2 border-b border-slate-800/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm text-slate-200">Full inventory roster</CardTitle>
            <p className="text-xs text-slate-500">
              Command view across all SKUs with cost basis and reorder cadence.
            </p>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">Item</th>
                <th className="px-4 py-2 text-left">Supplier</th>
                <th className="px-4 py-2 text-left">Cost</th>
                <th className="px-4 py-2 text-right">On Hand</th>
                <th className="px-4 py-2 text-right">Min</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {inventory.map((item) => {
                const status = getStatusData(item)
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200">{item.name}</div>
                      <div className="text-xs text-slate-500">SKU {item.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{item.supplier ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatCAD(item.unitCost)}</td>
                    <td className="px-4 py-3 text-right text-slate-200">{item.currentStock}</td>
                    <td className="px-4 py-3 text-right text-slate-200">{item.minStock}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{item.status ?? 'Tracked'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${status.tone}`}
                      >
                        {status.icon}
                        {status.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </GlassCard>

      <GlassCard>
        <CardHeader className="flex flex-col gap-2 border-b border-slate-800/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm text-slate-200">Supplier coordination</CardTitle>
            <p className="text-xs text-slate-500">Jump straight into outreach workflows.</p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {lowStockItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between rounded-xl border border-slate-800/70 bg-slate-950/60 p-4 text-sm"
            >
              <div>
                <div className="font-medium text-slate-100">{item.name}</div>
                <p className="text-xs text-slate-500">{item.supplier ?? 'No supplier on file'}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="inline-flex items-center gap-2 rounded-xl border-violet-500/40 bg-violet-600/10 text-violet-200 hover:bg-violet-600/20"
              >
                <Mail className="h-4 w-4" />
                Draft email
              </Button>
            </div>
          ))}
          {lowStockItems.length === 0 && (
            <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-6 text-sm text-slate-400">
              Nothing urgent. Set alerts from the analytics workspace to stay ahead.
            </div>
          )}
        </CardContent>
      </GlassCard>

      <GlassCard className="flex flex-wrap items-center justify-between gap-4 border-violet-500/30 bg-violet-600/10 px-5 py-4 text-sm text-violet-100">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-violet-200">
            Omni-prompt shortcut
          </div>
          <p>“Flag supply risk for items with &lt;2 week cover and propose bundled orders.”</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="inline-flex items-center gap-2 rounded-xl border-violet-500/40 bg-violet-600/20 text-violet-100 hover:bg-violet-600/30"
        >
          Launch
          <ArrowRight className="h-4 w-4" />
        </Button>
      </GlassCard>
    </PageContainer>
  )
}
