import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2, CheckCircle } from 'lucide-react'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { useToast } from '@/hooks/use-toast'

interface CompanyData {
  sec: {
    name: string
    cik: string
    sicDescription: string
  } | null
  market: {
    profile: {
      name: string
      description: string
      sector: string
      industry: string
    } | null
    quote: {
      price: number
      marketCap: number
    } | null
    metrics: {
      peRatio: number | null
      debtToEquity: number | null
      returnOnEquity: number | null
    } | null
  }
  filings: {
    latest10K: {
      filingDate: string
      reportDate: string
    } | null
    latest10Q: {
      filingDate: string
      reportDate: string
    } | null
  }
}

export function DataImportButton() {
  const { currentWorkspace, updateWorkspace } = useWorkspaceContext()
  const { toast } = useToast()
  const [isImporting, setIsImporting] = useState(false)
  const [imported, setImported] = useState(false)

  if (!currentWorkspace || !currentWorkspace.ticker) {
    return null
  }

  const handleImport = async () => {
    if (!currentWorkspace.ticker) return

    setIsImporting(true)
    setImported(false)

    try {
      const response = await fetch(`/api/data-sources/company/${currentWorkspace.ticker}/all`)

      if (!response.ok) {
        throw new Error('Failed to fetch company data')
      }

      const data: CompanyData = await response.json()

      // Update workspace with fetched data
      const updates: Record<string, unknown> = {}

      // Update company name if available
      if (data.market.profile?.name && !currentWorkspace.companyName) {
        updates.companyName = data.market.profile.name
      }

      // Update description if empty
      if (data.market.profile?.description && !currentWorkspace.description) {
        const shortDesc = data.market.profile.description.slice(0, 450)
        updates.description = `${shortDesc}... (${data.market.profile.sector})`
      }

      // Update settings with market data
      const newSettings = {
        ...currentWorkspace.settings,
        currentPrice: data.market.quote?.price || currentWorkspace.settings.currentPrice,
        marketCap: data.market.quote?.marketCap || currentWorkspace.settings.marketCap,
        peRatio: data.market.metrics?.peRatio || undefined,
        debtToEquity: data.market.metrics?.debtToEquity || undefined,
        sector: data.market.profile?.sector || undefined,
        industry: data.market.profile?.industry || undefined,
        latestFilings: {
          tenK: data.filings.latest10K?.reportDate || null,
          tenQ: data.filings.latest10Q?.reportDate || null
        },
        lastDataRefresh: new Date().toISOString()
      }

      updates.settings = newSettings

      if (Object.keys(updates).length > 0) {
        await updateWorkspace(currentWorkspace.id, updates)
      }

      setImported(true)

      toast({
        title: 'Data imported successfully',
        description: `Updated ${currentWorkspace.ticker} with latest SEC and market data`,
        duration: 3000
      })

      // Reset imported state after a delay
      setTimeout(() => setImported(false), 3000)
    } catch (error) {
      console.error('Data import failed:', error)
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import data',
        variant: 'destructive',
        duration: 5000
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Button
      onClick={handleImport}
      disabled={isImporting || imported}
      size="sm"
      variant="outline"
      className="gap-2"
    >
      {isImporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Importing...
        </>
      ) : imported ? (
        <>
          <CheckCircle className="w-4 h-4" />
          Imported
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Import Data
        </>
      )}
    </Button>
  )
}
