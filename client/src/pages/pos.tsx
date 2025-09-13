import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Plus, Package, Scissors, Printer, Undo2 } from "lucide-react";
import type { Service, InventoryItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type CartItem = { kind: 'service' | 'product'; id: string; name: string; price: number; quantity: number };

export default function POSPage() {
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });
  const { data: inventory = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });
  const { data: sales = [] } = useQuery<any[]>({ queryKey: ['/api/pos/sales'] });
  const [salesSortBy, setSalesSortBy] = useState<'date' | 'amount'>('date')
  const [salesSortDir, setSalesSortDir] = useState<'asc' | 'desc'>('desc')
  const [salesPage, setSalesPage] = useState(1)
  const salesPageSize = 6
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<{ id: string; items: { name: string; quantity: number; subtotal: string }[]; subtotal: string; discount: string; tax: string; total: string; createdAt: string } | null>(null);
  const [discountPct, setDiscountPct] = useState<number>(() => {
    try { const v = localStorage.getItem('pos_discount'); return v ? Math.max(0, parseFloat(v)) : 0 } catch { return 0 }
  });
  const [taxPct, setTaxPct] = useState<number>(() => {
    try { const r = localStorage.getItem('pos_region'); const map: Record<string, number> = { none: 0, ab: 5, sk: 11, bc: 12, mb: 12, on: 13, qc: 14.975 }; return r ? (map[r] ?? 5) : 5 } catch { return 5 }
  });
  const [regionCode, setRegionCode] = useState<string>(() => {
    try { return localStorage.getItem('pos_region') || 'ab' } catch { return 'ab' }
  });

  useEffect(() => { try { localStorage.setItem('pos_discount', String(discountPct)) } catch {} }, [discountPct])
  useEffect(() => { try { localStorage.setItem('pos_region', regionCode) } catch {} }, [regionCode])

  const addService = (s: Service) => {
    setCart((prev) => {
      const idx = prev.findIndex(i => i.kind==='service' && i.id===s.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { kind: 'service', id: s.id, name: s.name, price: parseFloat(String(s.price)), quantity: 1 }];
    });
  };

  const addProduct = (p: InventoryItem) => {
    setCart((prev) => {
      const idx = prev.findIndex(i => i.kind==='product' && i.id===p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      const price = parseFloat(String(p.retailPrice ?? p.unitCost));
      return [...prev, { kind: 'product', id: p.id, name: p.name, price, quantity: 1 }];
    });
  };

  const subtotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);
  const discountAmt = useMemo(() => subtotal * Math.max(0, discountPct) / 100, [subtotal, discountPct]);
  const taxAmt = useMemo(() => (subtotal - discountAmt) * Math.max(0, taxPct) / 100, [subtotal, discountAmt, taxPct]);
  const total = useMemo(() => subtotal - discountAmt + taxAmt, [subtotal, discountAmt, taxAmt]);

  const checkout = async () => {
    if (cart.length === 0) return;
    try {
      const items = cart.map(i => ({ kind: i.kind, id: i.id, quantity: i.quantity }));
      const res = await fetch('/api/pos/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, discountPct, taxPct }) });
      if (!res.ok) throw new Error('Checkout failed');
      const data = await res.json();
      setCart([]);
      toast({ description: `Payment accepted • $${parseFloat(data.total).toFixed(2)}` });
      // Open receipt dialog
      setLastSale({
        id: data.id,
        items: (data.items || []).map((x: any) => ({ name: x.name, quantity: x.quantity, subtotal: x.subtotal })),
        subtotal: data.subtotal,
        discount: data.discount,
        tax: data.tax,
        total: data.total,
        createdAt: data.createdAt,
      });
      setReceiptOpen(true);
    } catch (e: any) {
      toast({ description: e?.message || 'Checkout failed' });
    }
  };

  return (
    <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white" data-testid="heading-pos">
          POS — Checkout
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Button asChild variant="outline" size="sm" aria-label="Export sales CSV">
            <a href="/api/pos/sales/export" download>Export Sales CSV</a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" /> Quick Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {services.slice(0, 6).map((s) => (
                <Button key={s.id} onClick={() => addService(s)} variant="outline" className="justify-start h-auto p-3" aria-label={`Add service ${s.name}`}>
                  <div className="text-left">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-gray-500">${parseFloat(s.price).toFixed(2)} · {s.duration} min</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Add Product
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Input placeholder="Search product…" aria-label="Search product" />
              <div className="max-h-64 overflow-auto space-y-1">
                {inventory.slice(0, 10).map((item) => (
                  <Button key={item.id} onClick={() => addProduct(item)} variant="ghost" className="w-full justify-between">
                    <span>{item.name}</span>
                    <Plus className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cart */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> Cart Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="text-sm text-gray-500">No items yet. Click a service or product to add.</div>
            ) : (
              <div className="space-y-2">
                {cart.map((i, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex-1 truncate">{i.name}</div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" aria-label={`decrease ${i.name}`} onClick={() => setCart(prev => prev.map((p, ix) => ix===idx ? { ...p, quantity: Math.max(1, p.quantity-1) } : p))}>-</Button>
                      <Input className="w-14 h-8" aria-label={`${i.name} quantity`} value={i.quantity} onChange={(e) => {
                        const v = Math.max(1, parseInt(e.target.value || '1', 10) || 1);
                        setCart(prev => prev.map((p, ix) => ix===idx ? { ...p, quantity: v } : p));
                      }} />
                      <Button size="sm" variant="outline" aria-label={`increase ${i.name}`} onClick={() => setCart(prev => prev.map((p, ix) => ix===idx ? { ...p, quantity: p.quantity+1 } : p))}>+</Button>
                      <div className="w-20 text-right">${(i.price * i.quantity).toFixed(2)}</div>
                      <Button size="sm" variant="ghost" aria-label={`remove ${i.name}`} onClick={() => setCart(prev => prev.filter((_, ix) => ix!==idx))}>Remove</Button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-end gap-6 border-t pt-2 mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span>Region</span>
                    <Select value={regionCode} onValueChange={(v) => {
                      const map: Record<string, number> = { none: 0, ab: 5, sk: 11, bc: 12, mb: 12, on: 13, qc: 14.975 };
                      setRegionCode(v);
                      setTaxPct(map[v] ?? 5);
                    }}>
                      <SelectTrigger className="w-56"><SelectValue placeholder="Select region">{regionCode.toUpperCase()}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ab">Alberta (5% GST)</SelectItem>
                        <SelectItem value="sk">Saskatchewan (11% GST+PST)</SelectItem>
                        <SelectItem value="bc">British Columbia (12% GST+PST)</SelectItem>
                        <SelectItem value="mb">Manitoba (12% GST+PST)</SelectItem>
                        <SelectItem value="on">Ontario (13% HST)</SelectItem>
                        <SelectItem value="qc">Quebec (14.975% combined)</SelectItem>
                        <SelectItem value="none">None (0%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Discount %</span>
                    <Input className="w-16 h-8" type="number" value={discountPct} onChange={(e) => setDiscountPct(Math.max(0, parseFloat(e.target.value || '0')))} />
                    <div className="flex items-center gap-1">
                      {[5,10,15].map((d) => (
                        <Button key={d} size="sm" variant="outline" onClick={() => setDiscountPct(d)} aria-label={`Set discount ${d}%`}>
                          {d}%
                        </Button>
                      ))}
                      <Button size="sm" variant="ghost" onClick={() => setDiscountPct(0)} aria-label="Clear discount">Clear</Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Tax %</span>
                    <Input className="w-16 h-8" type="number" value={taxPct} onChange={(e) => setTaxPct(Math.max(0, parseFloat(e.target.value || '0')))} />
                  </div>
                </div>
                <div className="flex flex-col items-end mt-2 text-sm">
                  <div className="flex items-center justify-between gap-10 w-full max-w-xs"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex items-center justify-between gap-10 w-full max-w-xs"><span>Discount</span><span>- ${discountAmt.toFixed(2)}</span></div>
                  <div className="flex items-center justify-between gap-10 w-full max-w-xs"><span>Tax</span><span>${taxAmt.toFixed(2)}</span></div>
                  <div className="flex items-center justify-between gap-10 w-full max-w-xs font-semibold border-t pt-2 mt-2"><span>Total</span><span>${total.toFixed(2)}</span></div>
                </div>
                <div className="mt-3">
                  <Button onClick={checkout} data-testid="button-pos-checkout">Charge ${total.toFixed(2)}</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {(Array.isArray(sales) && sales.length > 0) ? (
              <>
                <div className="flex items-center justify-between mb-2 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <span>Sort by</span>
                    <Button size="sm" variant={salesSortBy==='date' ? 'default' : 'outline'} onClick={() => setSalesSortBy('date')}>Date</Button>
                    <Button size="sm" variant={salesSortBy==='amount' ? 'default' : 'outline'} onClick={() => setSalesSortBy('amount')}>Amount</Button>
                    <Button size="sm" variant="outline" onClick={() => setSalesSortDir(d => d==='desc' ? 'asc' : 'desc')}>{salesSortDir === 'desc' ? 'Desc' : 'Asc'}</Button>
                  </div>
                </div>
                {(() => {
                  const items = [...sales].sort((a: any, b: any) => {
                    const va = salesSortBy === 'date' ? +new Date(a.createdAt) : parseFloat(a.total || '0')
                    const vb = salesSortBy === 'date' ? +new Date(b.createdAt) : parseFloat(b.total || '0')
                    return salesSortDir === 'asc' ? va - vb : vb - va
                  })
                  const totalPages = Math.max(1, Math.ceil(items.length / salesPageSize))
                  const page = Math.min(salesPage, totalPages)
                  const start = (page - 1) * salesPageSize
                  const slice = items.slice(start, start + salesPageSize)
                  return (
                    <>
                      <div className="max-h-64 overflow-auto divide-y dark:divide-gray-800">
                        {slice.map((s: any) => (
                          <div key={s.id} className="py-2 flex items-center justify-between text-sm">
                            <div>
                              <div className="font-medium">${(parseFloat(s.total || '0')).toFixed(2)}</div>
                              <div className="text-xs text-gray-500">{new Date(s.createdAt).toLocaleString()}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => { setLastSale({ id: s.id, items: s.items || [], subtotal: s.subtotal || '0', discount: s.discount || '0', tax: s.tax || '0', total: s.total, createdAt: s.createdAt }); setReceiptOpen(true) }}>View</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-2 text-xs">
                        <span>Page {page} / {totalPages}</span>
                        <Button size="sm" variant="outline" onClick={() => setSalesPage(p => Math.max(1, p-1))} disabled={page<=1}>Prev</Button>
                        <Button size="sm" variant="outline" onClick={() => setSalesPage(p => Math.min(totalPages, p+1))} disabled={page>=totalPages}>Next</Button>
                      </div>
                    </>
                  )
                })()}
              </>
            ) : (
              <div className="text-xs text-gray-500">No sales yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent>
          <div className="p-2 receipt">
            <div className="text-lg font-semibold mb-2">Receipt</div>
            {lastSale ? (
              <div className="space-y-2">
                <div className="text-xs text-gray-500">Sale ID: {lastSale.id}</div>
                <div className="divide-y dark:divide-gray-800">
                  {lastSale.items.map((li, i) => (
                    <div key={i} className="py-1 flex items-center justify-between text-sm">
                      <div>{li.name} × {li.quantity}</div>
                      <div>${parseFloat(li.subtotal).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-end mt-2 text-sm">
                  <div className="flex items-center justify-between gap-10 w-full max-w-xs"><span>Subtotal</span><span>${parseFloat(lastSale.subtotal).toFixed(2)}</span></div>
                  <div className="flex items-center justify-between gap-10 w-full max-w-xs"><span>Discount</span><span>- ${parseFloat(lastSale.discount).toFixed(2)}</span></div>
                  <div className="flex items-center justify-between gap-10 w-full max-w-xs"><span>Tax</span><span>${parseFloat(lastSale.tax).toFixed(2)}</span></div>
                  <div className="flex items-center justify-between gap-10 w-full max-w-xs font-semibold border-t pt-2 mt-2"><span>Total</span><span>${parseFloat(lastSale.total).toFixed(2)}</span></div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-xs text-gray-500">{new Date(lastSale.createdAt).toLocaleString()}</div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.print()} aria-label="Print receipt"><Printer className="h-4 w-4 mr-1" /> Print</Button>
                    <Button variant="outline" size="sm" onClick={async () => {
                      try {
                        const res = await fetch(`/api/pos/sales/${lastSale.id}`, { method: 'DELETE' })
                        if (!res.ok) throw new Error('Failed to void sale')
                        toast({ description: 'Sale voided' })
                        setReceiptOpen(false)
                      } catch (e: any) {
                        toast({ description: e?.message || 'Failed to void sale' })
                      }
                    }} aria-label="Void sale"><Undo2 className="h-4 w-4 mr-1" /> Void</Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
