import { useState } from 'react'
import { GlassCard } from '@/components/layout/GlassCard'
import { Button } from '@/components/ui/button'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { createArtifact } from '@/lib/workspace-api'
import type { UpdateWorkspaceInput } from '@shared/types'

export function DataToolbelt({ className = '' }: { className?: string }) {
  const { currentWorkspace, updateWorkspace } = useWorkspaceContext()
  const [isLoading, setIsLoading] = useState(false)
  const [lastMessage, setLastMessage] = useState('')

  const fetchAll = async () => {
    if (!currentWorkspace?.ticker) return
    setIsLoading(true)
    setLastMessage('')
    try {
      const res = await fetch(`/api/data-sources/company/${currentWorkspace.ticker}/all`)
      if (!res.ok) throw new Error('Failed to fetch company data')
      const data = await res.json()

      // Save a compact artifact snapshot for quick reference
      const snapshot = {
        sec: data.sec,
        quote: data.market?.quote,
        metrics: data.market?.metrics,
        filings: data.filings
      }

      if (currentWorkspace.id) {
        await createArtifact(currentWorkspace.id, {
          workflowId: currentWorkspace.id,
          stageSlug: 'studio',
          type: 'analysis',
          name: `Market Snapshot (${new Date().toLocaleString()})`,
          data: snapshot,
          metadata: { source: 'data-toolbelt' }
        })
      }

      // Optionally update workspace settings with fresh values (best-effort)
      const settings = currentWorkspace.settings || {}
      const updates: UpdateWorkspaceInput = {
        settings: {
          ...settings,
          currentPrice: data.market?.quote?.price ?? settings['currentPrice'],
          marketCap: data.market?.quote?.marketCap ?? settings['marketCap'],
          peRatio: data.market?.metrics?.peRatio ?? settings['peRatio'],
          debtToEquity: data.market?.metrics?.debtToEquity ?? settings['debtToEquity'],
          sector: data.market?.profile?.sector ?? settings['sector'],
          industry: data.market?.profile?.industry ?? settings['industry'],
          latestFilings: {
            tenK: data?.filings?.latest10K?.reportDate ?? null,
            tenQ: data?.filings?.latest10Q?.reportDate ?? null
          },
          lastDataRefresh: new Date().toISOString()
        }
      }
      await updateWorkspace(currentWorkspace.id, updates)

      setLastMessage('Fetched and saved snapshot to Artifacts.')
    } catch (_e) {
      setLastMessage('Failed to fetch company data.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <GlassCard title="Data Toolbelt" subtitle="Pull SEC + market data" className={className}>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={fetchAll} disabled={isLoading || !currentWorkspace?.ticker}>
          {isLoading ? 'Fetching…' : 'Fetch Company Data'}
        </Button>
        {lastMessage && <div className="text-xs text-slate-400">{lastMessage}</div>}
      </div>
    </GlassCard>
  )
}
