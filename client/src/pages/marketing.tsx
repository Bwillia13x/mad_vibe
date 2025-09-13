import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, Mail, Share2, TrendingUp } from "lucide-react";
import type { AnalyticsSnapshot } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, XAxis, YAxis, Bar } from "recharts";

export default function MarketingPage() {
  const { data: analytics = [] } = useQuery<AnalyticsSnapshot[]>({
    queryKey: ["/api/analytics"],
  });
  const { data: marketingPerf } = useQuery<any>({ queryKey: ['/api/marketing/performance'] })
  const [metricsSortBy, setMetricsSortBy] = useState<'impressions' | 'clicks' | 'ctr' | 'conversions'>('conversions')
  const [metricsSortDir, setMetricsSortDir] = useState<'asc' | 'desc'>('desc')
  const [metricsPage, setMetricsPage] = useState(1)
  const metricsPageSize = 8
  const latest = analytics[0];
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: campaigns = [] } = useQuery<any[]>({ queryKey: ['/api/marketing/campaigns'] })
  const [status, setStatus] = useState<string>('all');
  const [channel, setChannel] = useState<string>('all');

  const filtered = useMemo(() => campaigns.filter(c =>
    (status === 'all' || c.status === status) && (channel === 'all' || c.channel === channel)
  ), [campaigns, status, channel]);

  const createCampaign = async (name: string, description: string) => {
    try {
      const res = await fetch('/api/marketing/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description, channel: 'email', status: 'draft' }) });
      if (!res.ok) throw new Error('Failed to create campaign');
      const c = await res.json();
      toast({ description: `Campaign created: ${c.name}` });
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns'] })
    } catch (e: any) {
      toast({ description: e?.message || 'Failed to create campaign' });
    }
  }

  return (
    <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white" data-testid="heading-marketing">
          Marketing — Campaigns
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Megaphone className="h-4 w-4" />
          <span>Custom-built for Andreas & Co</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Suggested Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 border rounded-md dark:border-gray-700">
              <div className="font-medium">Bring Back Regulars</div>
              <div className="text-sm text-gray-500">Offer a 10% loyalty boost to customers who haven’t visited in 60+ days.</div>
              <Button size="sm" className="mt-2" onClick={() => createCampaign('Bring Back Regulars', '10% loyalty boost to lapsed customers')}>Create Campaign</Button>
            </div>
            <div className="p-3 border rounded-md dark:border-gray-700">
              <div className="font-medium">Upsell Premium Services</div>
              <div className="text-sm text-gray-500">Promote Executive Cut add-ons during peak hours to increase AOV.</div>
              <Button size="sm" className="mt-2" onClick={() => createCampaign('Upsell Premium Services', 'Promote Executive Cut add-ons during peak hours')}>Create Campaign</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline"><Mail className="h-4 w-4 mr-2" /> Send Email Blast</Button>
            <Button className="w-full justify-start" variant="outline"><Share2 className="h-4 w-4 mr-2" /> Share Promo Link</Button>
            <div className="text-xs text-gray-500 mt-2">
              Latest revenue: {latest ? `$${parseFloat(latest.totalRevenue).toFixed(0)}` : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns list with filters */}
      <div className="mt-4 grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-3">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Channel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="in-store">In-Store</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="divide-y dark:divide-gray-800">
              {filtered.length === 0 && (
                <div className="text-sm text-gray-500">No campaigns found.</div>
              )}
              {filtered.map((c) => (
                <div key={c.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.channel} · {c.status}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</div>
                    {c.status !== 'active' ? (
                      <Button size="sm" variant="outline" onClick={async () => {
                        try {
                          const res = await fetch(`/api/marketing/campaigns/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'active' }) })
                          if (res.ok) {
                          await res.json();
                          queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns'] })
                          toast({ description: 'Campaign activated' })
                        }
                      } catch {}
                      }}>Activate</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={async () => {
                        try {
                          const res = await fetch(`/api/marketing/campaigns/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'paused' }) })
                          if (res.ok) {
                            await res.json();
                            queryClient.invalidateQueries({ queryKey: ['/api/marketing/campaigns'] })
                            toast({ description: 'Campaign paused' })
                          }
                        } catch {}
                      }}>Pause</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance overview */}
      {marketingPerf?.campaigns?.length ? (
        <div className="mt-4 grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance (Conversions)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ChartContainer
                  config={{ conversions: { label: 'Conversions', color: 'hsl(var(--chart-3))' } }}
                >
                  <BarChart data={marketingPerf.campaigns.map((c: any) => ({ name: c.name, conversions: c.conversions, ctr: c.ctr }))}>
                    <XAxis dataKey="name" tickFormatter={(s: string) => (s.length > 12 ? s.slice(0, 12) + '…' : s)} />
                    <YAxis />
                    <ChartTooltip content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d: any = payload[0].payload;
                      return (
                        <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
                          <div className="font-medium">{d.name}</div>
                          <div>Conversions: {d.conversions}</div>
                          <div>CTR: {d.ctr}%</div>
                        </div>
                      );
                    }} />
                    <Bar dataKey="conversions" fill="var(--color-conversions)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Campaign performance table with sorting + pagination */}
      {marketingPerf?.campaigns?.length ? (
        <div className="mt-4 grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                <div className="col-span-2">Campaign</div>
                <button className="text-left" onClick={() => { setMetricsSortBy('impressions'); setMetricsSortDir(d => metricsSortBy==='impressions' && d==='desc' ? 'asc' : 'desc') }}>Impr.</button>
                <button className="text-left" onClick={() => { setMetricsSortBy('clicks'); setMetricsSortDir(d => metricsSortBy==='clicks' && d==='desc' ? 'asc' : 'desc') }}>Clicks</button>
                <button className="text-left" onClick={() => { setMetricsSortBy('ctr'); setMetricsSortDir(d => metricsSortBy==='ctr' && d==='desc' ? 'asc' : 'desc') }}>CTR</button>
                <button className="text-left" onClick={() => { setMetricsSortBy('conversions'); setMetricsSortDir(d => metricsSortBy==='conversions' && d==='desc' ? 'asc' : 'desc') }}>Conv.</button>
              </div>
              {(() => {
                const items = [...marketingPerf.campaigns]
                  .sort((a: any, b: any) => {
                    const k = metricsSortBy
                    const va = typeof a[k] === 'number' ? a[k] : 0
                    const vb = typeof b[k] === 'number' ? b[k] : 0
                    return metricsSortDir === 'asc' ? va - vb : vb - va
                  })
                const totalPages = Math.max(1, Math.ceil(items.length / metricsPageSize))
                const page = Math.min(metricsPage, totalPages)
                const start = (page - 1) * metricsPageSize
                const slice = items.slice(start, start + metricsPageSize)
                return (
                  <>
                    <div className="divide-y dark:divide-gray-800">
                      {slice.map((c: any) => (
                        <div key={c.id} className="grid grid-cols-6 gap-2 py-2 text-sm items-center">
                          <div className="col-span-2 truncate" title={c.name}>{c.name}</div>
                          <div>{c.impressions.toLocaleString?.() || c.impressions}</div>
                          <div>{c.clicks.toLocaleString?.() || c.clicks}</div>
                          <div>{c.ctr}%</div>
                          <div>{c.conversions.toLocaleString?.() || c.conversions}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-3 text-xs">
                      <span>Page {page} / {totalPages}</span>
                      <Button size="sm" variant="outline" onClick={() => setMetricsPage(p => Math.max(1, p-1))} disabled={page<=1}>Prev</Button>
                      <Button size="sm" variant="outline" onClick={() => setMetricsPage(p => Math.min(totalPages, p+1))} disabled={page>=totalPages}>Next</Button>
                    </div>
                  </>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
