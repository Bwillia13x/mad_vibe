import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone, TrendingUp, Mail, Share2, Sparkles } from 'lucide-react'
import type { AnalyticsSnapshot } from '@shared/schema'
import { Button } from '@/components/ui/button'
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, XAxis, YAxis, Bar } from 'recharts'
import { useToast } from '@/hooks/use-toast'
import { PageContainer, PageHeader, GlassCard } from '@/components/layout/Page'

interface Campaign {
  id: string
  name: string
  description?: string
  channel?: string
  status?: string
  conversions?: number
  ctr?: number
  impressions?: number
  clicks?: number
  createdAt: string
}

interface MarketingPerformance {
  summary?: {
    impressions?: number
    clicks?: number
    ctr?: number
    conversions?: number
    convRate?: number
  }
  campaigns?: Campaign[]
}

export default function MarketingPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: analytics = [] } = useQuery<AnalyticsSnapshot[]>({ queryKey: ['/api/analytics'] })
  const { data: marketingPerf } = useQuery<MarketingPerformance>({ queryKey: ['/api/marketing/performance'] })
  const { data: campaigns = [] } = useQuery<Campaign[]>({ queryKey: ['/api/marketing/campaigns'] })

  const [status, setStatus] = useState<'all' | string>('all')
  const [channel, setChannel] = useState<'all' | string>('all')
  const [sortedBy, setSortedBy] = useState<'conversions' | 'impressions' | 'clicks' | 'ctr'>('conversions')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const latest = analytics[0]

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const statusMatch = status === 'all' || campaign.status === status
      const channelMatch = channel === 'all' || campaign.channel === channel
      return statusMatch && channelMatch
    })
  }, [campaigns, status, channel])

  const sortedCampaigns = useMemo(() => {
    return [...filteredCampaigns].sort((a, b) => {
      const aValue = a[sortedBy] ?? 0
      const bValue = b[sortedBy] ?? 0
      return sortDir === 'asc' ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue)
    })
  }, [filteredCampaigns, sortedBy, sortDir])

  const paginatedCampaigns = useMemo(() => sortedCampaigns.slice(0, 10), [sortedCampaigns])

  useEffect(() => {
    if (!campaigns.length) {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns'] })
    }
  }, [campaigns.length, queryClient])

  const createCampaign = async (name: string, description: string) => {
    try {
      const response = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, channel: 'email', status: 'draft' })
      })
      if (!response.ok) throw new Error('Failed to create campaign')
      toast({ description: `Campaign created: ${name}` })
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns'] })
    } catch (error) {
      toast({ description: error instanceof Error ? error.message : 'Failed to create campaign', variant: 'destructive' })
    }
  }

  const campaignChannels = useMemo(() => ['email', 'social', 'paid'], [])

  return (
    <PageContainer>
      <PageHeader
        title="Marketing Campaigns"
        subtitle="Coordinate omni-channel touchpoints and measure conversion lift in real-time."
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-600/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-violet-200">
            <Sparkles className="h-3 w-3" /> Growth Studio
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-2 rounded-xl border-violet-500/40 bg-violet-600/10 text-violet-200 hover:bg-violet-600/20"
              onClick={() => createCampaign('Bring Back Regulars', '10% loyalty boost to lapsed customers')}
            >
              <Megaphone className="h-4 w-4" /> Quick launch
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-2 rounded-xl border-slate-700/60 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
            >
              <Share2 className="h-4 w-4" /> Share promo link
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-violet-300" /> Suggested campaigns
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-slate-200 md:grid-cols-2">
            {[
              {
                name: 'Bring Back Regulars',
                description: 'Offer a 10% loyalty boost to customers inactive for 60+ days.'
              },
              {
                name: 'Upsell Premium Services',
                description: 'Promote Executive Cut add-ons during peak hours to lift AOV.'
              }
            ].map((suggestion) => (
              <div key={suggestion.name} className="rounded-xl border border-slate-800/60 bg-slate-950/60 p-4">
                <div className="font-medium text-slate-100">{suggestion.name}</div>
                <p className="mt-1 text-xs text-slate-400">{suggestion.description}</p>
                <Button
                  size="sm"
                  className="mt-3 rounded-xl bg-violet-600 text-white hover:bg-violet-500"
                  onClick={() => createCampaign(suggestion.name, suggestion.description)}
                >
                  Launch campaign
                </Button>
              </div>
            ))}
          </CardContent>
        </GlassCard>

        <GlassCard>
          <CardHeader>
            <CardTitle className="text-sm text-slate-200">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-200">
            <Button variant="outline" className="w-full justify-start rounded-xl border-slate-700/60 bg-slate-900/60 text-slate-200 hover:bg-slate-900">
              <Mail className="mr-2 h-4 w-4" /> Send email blast
            </Button>
            <Button variant="outline" className="w-full justify-start rounded-xl border-slate-700/60 bg-slate-900/60 text-slate-200 hover:bg-slate-900">
              <Share2 className="mr-2 h-4 w-4" /> Share promo link
            </Button>
            <div className="mt-3 text-xs text-slate-400">
              Latest revenue snapshot: {latest ? `$${parseFloat(latest.totalRevenue).toFixed(0)}` : '—'}
            </div>
          </CardContent>
        </GlassCard>
      </div>

      <GlassCard>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
          <CardTitle className="text-sm text-slate-200">Campaign roster</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
              <SelectTrigger className="w-28 rounded-xl border-slate-700/60 bg-slate-950/60 text-xs text-slate-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channel} onValueChange={(value) => setChannel(value as typeof channel)}>
              <SelectTrigger className="w-28 rounded-xl border-slate-700/60 bg-slate-950/60 text-xs text-slate-200">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                {campaignChannels.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortedBy} onValueChange={(value) => setSortedBy(value as typeof sortedBy)}>
              <SelectTrigger className="w-32 rounded-xl border-slate-700/60 bg-slate-950/60 text-xs text-slate-200">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conversions">Conversions</SelectItem>
                <SelectItem value="impressions">Impressions</SelectItem>
                <SelectItem value="clicks">Clicks</SelectItem>
                <SelectItem value="ctr">CTR</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortDir} onValueChange={(value) => setSortDir(value as typeof sortDir)}>
              <SelectTrigger className="w-28 rounded-xl border-slate-700/60 bg-slate-950/60 text-xs text-slate-200">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Desc</SelectItem>
                <SelectItem value="asc">Asc</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-slate-800/60">
          {paginatedCampaigns.length === 0 && (
            <div className="py-6 text-center text-sm text-slate-400">No campaigns match the current filters.</div>
          )}
          {paginatedCampaigns.map((campaign) => (
            <div key={campaign.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium text-slate-100">{campaign.name}</div>
                <p className="text-xs text-slate-500">{campaign.description ?? 'No description provided'}</p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                  <span className="rounded-full border border-slate-700/60 px-2 py-1 uppercase tracking-[0.18em]">
                    {campaign.channel ?? 'channel'}
                  </span>
                  <span className="rounded-full border border-slate-700/60 px-2 py-1 uppercase tracking-[0.18em]">
                    {campaign.status ?? 'draft'}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>Conversions: {campaign.conversions ?? 0}</span>
                <span>CTR: {(campaign.ctr ?? 0).toFixed(2)}%</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-slate-700/60 bg-slate-900/60 text-slate-200 hover:bg-slate-900"
                  onClick={async () => {
                    try {
                      const nextStatus = campaign.status === 'active' ? 'paused' : 'active'
                      const response = await fetch(`/api/marketing/campaigns/${campaign.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: nextStatus })
                      })
                      if (response.ok) {
                        queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns'] })
                        toast({ description: `Campaign ${nextStatus === 'active' ? 'activated' : 'paused'}` })
                      }
                    } catch (err) {
                      console.error(err)
                    }
                  }}
                >
                  {campaign.status === 'active' ? 'Pause' : 'Activate'}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </GlassCard>

      {marketingPerf?.campaigns?.length ? (
        <GlassCard>
          <CardHeader>
            <CardTitle className="text-sm text-slate-200">Campaign conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ChartContainer config={{ conversions: { label: 'Conversions', color: 'hsl(var(--chart-3))' } }}>
                <BarChart
                  data={marketingPerf.campaigns.map((campaign) => ({
                    name: campaign.name,
                    conversions: campaign.conversions,
                    ctr: campaign.ctr
                  }))}
                >
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                    tickFormatter={(value: string) => (value.length > 12 ? `${value.slice(0, 12)}…` : value)}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const datum = payload[0]?.payload as { name: string; conversions: number; ctr: number }
                      if (!datum) return null
                      return (
                        <div className="rounded-md border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-200 shadow-lg">
                          <div className="font-medium">{datum.name}</div>
                          <div>Conversions: {datum.conversions}</div>
                          <div>CTR: {datum.ctr}%</div>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="conversions" fill="var(--color-conversions)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </GlassCard>
      ) : null}
    </PageContainer>
  )
}
