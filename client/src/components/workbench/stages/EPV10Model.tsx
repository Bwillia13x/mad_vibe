import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useValuation } from '@/hooks/useValuation'
import { cn } from '@/lib/utils'

interface ReserveCategory {
  category: string
  reserves: number // MMBOE
  production: number // MBOE/day
  price: number // $/BOE
  costs: number // $/BOE
  discountRate: number // %
  pv10: number
}

export function EPV10Model() {
  const { state, updateAssumption } = useValuation()

  const reserveCategories: ReserveCategory[] = [
    {
      category: 'Proved Developed Producing (PDP)',
      reserves: 125.5,
      production: 45000,
      price: 68.5,
      costs: 22.3,
      discountRate: 10,
      pv10: 2850000000
    },
    {
      category: 'Proved Developed Non-Producing (PDNP)',
      reserves: 45.2,
      production: 12000,
      price: 68.5,
      costs: 18.75,
      discountRate: 10,
      pv10: 1250000000
    },
    {
      category: 'Proved Undeveloped (PUD)',
      reserves: 89.7,
      production: 25000,
      price: 68.5,
      costs: 15.2,
      discountRate: 10,
      pv10: 1950000000
    },
    {
      category: 'Probable Reserves',
      reserves: 156.3,
      production: 0,
      price: 68.5,
      costs: 12.8,
      discountRate: 15,
      pv10: 2800000000
    },
    {
      category: 'Possible Reserves',
      reserves: 234.8,
      production: 0,
      price: 68.5,
      costs: 10.45,
      discountRate: 20,
      pv10: 3200000000
    }
  ]

  const calculatePV10 = () => {
    const totalPV10 = reserveCategories.reduce((sum, cat) => sum + cat.pv10, 0)
    const totalReserves = reserveCategories.reduce((sum, cat) => sum + cat.reserves, 0)
    const totalProduction = reserveCategories.reduce((sum, cat) => sum + cat.production, 0)

    const pv10PerShare = totalPV10 / 100000000 // Assuming 100M shares
    const reserveLife = (totalReserves * 1000) / (totalProduction * 365) // years

    return {
      totalPV10,
      pv10PerShare,
      totalReserves,
      totalProduction,
      reserveLife
    }
  }

  const pv10 = calculatePV10()

  return (
    <div className="space-y-6">
      {/* PV-10 Summary */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">PV-10 Reserve Value Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">Total PV-10</div>
              <div className="text-2xl font-bold text-emerald-300">
                ${(pv10.totalPV10 / 1000000000).toFixed(2)}B
              </div>
            </div>
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">PV-10 per Share</div>
              <div className="text-lg font-semibold text-blue-300">
                ${pv10.pv10PerShare.toFixed(2)}
              </div>
            </div>
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">Total Reserves</div>
              <div className="text-lg font-semibold text-amber-300">
                {pv10.totalReserves.toFixed(1)} MMBOE
              </div>
            </div>
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">Reserve Life</div>
              <div className="text-lg font-semibold text-violet-300">
                {pv10.reserveLife.toFixed(1)} years
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reserve Categories */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Reserve Categories Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-xs">
              <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-right">Reserves (MMBOE)</th>
                  <th className="px-3 py-2 text-right">Production (MBOE/day)</th>
                  <th className="px-3 py-2 text-right">Price ($/BOE)</th>
                  <th className="px-3 py-2 text-right">Costs ($/BOE)</th>
                  <th className="px-3 py-2 text-right">Discount Rate</th>
                  <th className="px-3 py-2 text-right">PV-10 Value</th>
                  <th className="px-3 py-2 text-center">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {reserveCategories.map((category) => {
                  const percentage = (category.pv10 / pv10.totalPV10) * 100
                  return (
                    <tr key={category.category} className="hover:bg-slate-900/30">
                      <td className="px-3 py-2 text-slate-200 font-medium">{category.category}</td>
                      <td className="px-3 py-2 text-right">{category.reserves.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right">
                        {category.production.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">${category.price.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">${category.costs.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{category.discountRate}%</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-100">
                        ${(category.pv10 / 1000000).toFixed(0)}M
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="w-full h-2 bg-slate-800 rounded-full">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-300 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-[10px] mt-1 text-slate-500">
                          {percentage.toFixed(1)}%
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-slate-950/60">
                <tr>
                  <td className="px-3 py-2 text-slate-200 font-semibold">Total</td>
                  <td className="px-3 py-2 text-right text-slate-200 font-semibold">
                    {pv10.totalReserves.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-200 font-semibold">
                    {pv10.totalProduction.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right"></td>
                  <td className="px-3 py-2 text-right"></td>
                  <td className="px-3 py-2 text-right"></td>
                  <td className="px-3 py-2 text-right text-slate-200 font-semibold">
                    ${(pv10.totalPV10 / 1000000).toFixed(0)}M
                  </td>
                  <td className="px-3 py-2 text-center text-slate-200 font-semibold">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Price Sensitivity */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Price Sensitivity Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-sm font-medium text-slate-200 mb-3">Current Price</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-300">$68.50</div>
                <div className="text-xs text-slate-500">WTI Spot Price</div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">PV-10 per Share</span>
                  <span className="text-slate-200">${pv10.pv10PerShare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Implied Value</span>
                  <span className="text-emerald-300">BUY</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-sm font-medium text-slate-200 mb-3">Stress Test: $55/BOE</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-300">$55.00</div>
                <div className="text-xs text-slate-500">-19.7% from current</div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">PV-10 per Share</span>
                  <span className="text-amber-200">${(pv10.pv10PerShare * 0.85).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Implied Value</span>
                  <span className="text-amber-300">HOLD</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-sm font-medium text-slate-200 mb-3">Stress Test: $45/BOE</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-300">$45.00</div>
                <div className="text-xs text-slate-500">-34.3% from current</div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">PV-10 per Share</span>
                  <span className="text-red-300">${(pv10.pv10PerShare * 0.75).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Implied Value</span>
                  <span className="text-red-400">SELL</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Development Schedule */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">
            Development Schedule & Capital Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
                <div className="text-sm font-medium text-slate-200 mb-3">PUD Development</div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">PUD Reserves</span>
                    <span className="text-slate-200">89.7 MMBOE</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Development Cost</span>
                    <span className="text-slate-200">$15.20/BOE</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Total Capex Required</span>
                    <span className="text-slate-200">$1.36B</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Development Timeline</span>
                    <span className="text-slate-200">3-5 years</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
                <div className="text-sm font-medium text-slate-200 mb-3">Production Profile</div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Current Production</span>
                    <span className="text-slate-200">45 MBOE/day</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Peak Production</span>
                    <span className="text-slate-200">82 MBOE/day</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Decline Rate</span>
                    <span className="text-slate-200">15-20% annually</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Reserve Life Index</span>
                    <span className="text-slate-200">{pv10.reserveLife.toFixed(1)} years</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
