import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Star, User } from "lucide-react";
import type { Customer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card as UCard, CardContent as UCardContent, CardHeader as UCardHeader, CardTitle as UCardTitle } from "@/components/ui/card";

export default function LoyaltyPage() {
  const queryClient = useQueryClient();
  const { data: customers = [] } = useQuery<Pick<Customer, 'id' | 'name' | 'phone'>[]>({
    queryKey: ["/api/customers"],
  });
  const { toast } = useToast();
  const { data: entries = [] } = useQuery<any[]>({ queryKey: ['/api/loyalty/entries'] });
  const [type, setType] = useState<string>('all');
  const [customerId, setCustomerId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'points'>('name');

  const filtered = useMemo(() => entries.filter(e =>
    (type === 'all' || e.type === type) && (customerId === 'all' || e.customerId === customerId)
  ), [entries, type, customerId]);

  const pointsByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      if (e.type === 'points') {
        map.set(e.customerId, (map.get(e.customerId) || 0) + (e.points || 0));
      }
    }
    return Array.from(map.entries()).map(([cid, pts]) => ({ id: cid, points: pts, name: customers.find(c => c.id === cid)?.name || cid }))
      .sort((a, b) => b.points - a.points);
  }, [entries, customers]);

  const addReward = async (customerId: string) => {
    try {
      const res = await fetch('/api/loyalty/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId, type: 'reward', points: 50, note: 'Complimentary add-on' }) });
      if (!res.ok) throw new Error('Failed to add reward');
      toast({ description: 'Reward added to customer' });
      queryClient.invalidateQueries({ queryKey: ['/api/loyalty/entries'] })
    } catch (e: any) {
      toast({ description: e?.message || 'Failed to add reward' });
    }
  }

  return (
    <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white" data-testid="heading-loyalty">
          Loyalty — Rewards
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Button asChild variant="outline" size="sm" aria-label="Export loyalty entries CSV">
            <a href="/api/loyalty/entries/export" download>Export Entries CSV</a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" /> Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Sort by</span>
              <Select value={sortBy} onValueChange={(v) => setSortBy((v as any) || 'name')}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Sort" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="points">Points</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="divide-y dark:divide-gray-800">
              {(sortBy === 'points' ? [...customers].sort((a, b) => (pointsByCustomer.find(p => p.id===b.id)?.points || 0) - (pointsByCustomer.find(p => p.id===a.id)?.points || 0)) : customers).slice(0, 12).map((c) => (
                <div key={c.id} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-gray-500">Points: {pointsByCustomer.find(p => p.id===c.id)?.points || 0}</div>
                      <div className="text-xs text-gray-500">{c.phone}</div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => addReward(c.id)}>Add Reward</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Programs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" variant="outline">Create Punch Card</Button>
            <Button className="w-full" variant="outline">Add Birthday Reward</Button>
            <Button className="w-full" variant="outline">Configure Points</Button>
            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium">Entries</div>
              <div className="flex items-center gap-2">
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="points">Points</SelectItem>
                    <SelectItem value="reward">Reward</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Customer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="max-h-64 overflow-auto divide-y dark:divide-gray-800">
                {filtered.length === 0 && (
                  <div className="text-xs text-gray-500">No entries found.</div>
                )}
                {filtered.map((e, i) => (
                  <div key={i} className="py-1 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium capitalize">{e.type}</div>
                      <div className="text-xs text-gray-500">{customers.find(c => c.id===e.customerId)?.name || e.customerId}</div>
                    </div>
                    <div className="text-xs text-gray-500">{new Date(e.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
              {/* Add points */}
              <div className="pt-3 border-t dark:border-gray-800">
                <div className="text-sm font-medium mb-2">Add Points</div>
                <div className="flex items-center gap-2">
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Customer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Select Customer</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input className="w-28" placeholder="Points" type="number" id="loyalty-points-input" />
                  <Button size="sm" variant="outline" onClick={async () => {
                    try {
                      const cid = customerId === 'all' ? customers[0]?.id : customerId
                      const pts = parseInt((document.getElementById('loyalty-points-input') as HTMLInputElement)?.value || '0', 10)
                      if (!cid || pts <= 0) return
                      const res = await fetch('/api/loyalty/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: cid, type: 'points', points: pts, note: 'Manual add' }) })
                      if (res.ok) { 
                        await res.json();
                        queryClient.invalidateQueries({ queryKey: ['/api/loyalty/entries'] })
                        toast({ description: 'Points added' })
                      }
                    } catch {}
                  }}>Add</Button>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Total points for selection: {customers.length > 0 ? entries.filter(e => (customerId==='all' ? true : e.customerId===customerId) && e.type==='points').reduce((sum, e) => sum + (e.points || 0), 0) : 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top customers by points */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UCard>
          <UCardHeader>
            <UCardTitle>Top Customers by Points</UCardTitle>
          </UCardHeader>
          <UCardContent>
            <div className="divide-y dark:divide-gray-800">
              {pointsByCustomer.slice(0, 10).map((row) => (
                <div key={row.id} className="py-2 flex items-center justify-between text-sm">
                  <div className="truncate mr-2">{row.name}</div>
                  <div className="font-medium">{row.points}</div>
                </div>
              ))}
              {pointsByCustomer.length === 0 && (
                <div className="text-xs text-gray-500">No points entries yet.</div>
              )}
            </div>
          </UCardContent>
        </UCard>
      </div>
    </div>
  );
}
