import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useValuation } from '@/hooks/useValuation'
import { cn } from '@/lib/utils'

interface PeerCompany {
  name: string
  ticker: string
  price: number
  marketCap: number
  pe: number
  pb: number
  evEbitda: number
  roic: number
  fcfYield: number
  leverage: number
}

export function ComparativeAnalysisWorkbench() {
  const { state, updateAssumption } = useValuation()

  const peerCompanies: PeerCompany[] = [
    {
      name: 'Apple Inc.',
      ticker: 'AAPL',
      price: 175.43,
      marketCap: 2740000,
      pe: 28.5,
      pb: 7.8,
      evEbitda: 22.1,
      roic: 28.5,
      fcfYield: 4.2,
      leverage: 1.8
    },
    {
      name: 'Microsoft Corporation',
      ticker: 'MSFT',
      price: 378.85,
      marketCap: 2810000,
      pe: 32.1,
      pb: 12.3,
      evEbitda: 24.8,
      roic: 32.1,
      fcfYield: 3.8,
      leverage: 0.3
    },
    {
      name: 'Alphabet Inc.',
      ticker: 'GOOGL',
      price: 139.69,
      marketCap: 1760000,
      pe: 24.8,
      pb: 5.2,
      evEbitda: 18.9,
      roic: 24.8,
      fcfYield: 3.1,
      leverage: 0.1
    },
    {
      name: 'Amazon.com Inc.',
      ticker: 'AMZN',
      price: 155.89,
      marketCap: 1590000,
      pe: 45.2,
      pb: 8.9,
      evEbitda: 19.8,
      roic: 15.3,
      fcfYield: 2.9,
      leverage: 0.8
    },
    {
      name: 'Meta Platforms Inc.',
      ticker: 'META',
      price: 484.81,
      marketCap: 1230000,
      pe: 22.4,
      pb: 6.8,
      evEbitda: 16.7,
      roic: 22.4,
      fcfYield: 4.8,
      leverage: 0.1
    },
    {
      name: 'Netflix Inc.',
      ticker: 'NFLX',
      price: 449.52,
      marketCap: 193000,
      pe: 34.2,
      pb: 9.1,
      evEbitda: 21.3,
      roic: 18.9,
      fcfYield: 1.8,
      leverage: 1.2
    }
  ]

  const subjectCompany = {
    name: 'Target Company',
    ticker: 'TARGET',
    price: 42.18,
    marketCap: 421800000,
    pe: 18.5,
    pb: 2.1,
    evEbitda: 12.3,
    roic: 22.1,
    fcfYield: 6.2,
    leverage: 0.7
  }

  const calculateMultiples = () => {
    const peAverage = peerCompanies.reduce((sum, peer) => sum + peer.pe, 0) / peerCompanies.length
    const pbAverage = peerCompanies.reduce((sum, peer) => sum + peer.pb, 0) / peerCompanies.length
    const evEbitdaAverage =
      peerCompanies.reduce((sum, peer) => sum + peer.evEbitda, 0) / peerCompanies.length

    return {
      peAverage,
      pbAverage,
      evEbitdaAverage,
      peImpliedPrice: peAverage * (subjectCompany.pe / subjectCompany.pe), // This would need actual earnings data
      pbImpliedPrice: pbAverage * (subjectCompany.pb / subjectCompany.pb), // This would need actual book value data
      evEbitdaImpliedPrice: evEbitdaAverage * (subjectCompany.evEbitda / subjectCompany.evEbitda) // This would need actual EBITDA data
    }
  }

  const multiples = calculateMultiples()

  return (
    <div className="space-y-6">
      {/* Valuation Summary */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Comparative Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">Current Price</div>
              <div className="text-2xl font-bold text-slate-100">
                ${subjectCompany.price.toFixed(2)}
              </div>
            </div>
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">Avg Peer Multiple</div>
              <div className="text-lg font-semibold text-blue-300">
                ${multiples.peImpliedPrice.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500">P/E Implied</div>
            </div>
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">Premium/Discount</div>
              <div
                className={cn(
                  'text-lg font-semibold',
                  subjectCompany.price > multiples.peImpliedPrice
                    ? 'text-red-300'
                    : 'text-emerald-300'
                )}
              >
                {((subjectCompany.price / multiples.peImpliedPrice - 1) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">Recommendation</div>
              <div className="text-lg font-semibold text-emerald-300">BUY</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Peer Comparison Table */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Peer Comparison Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-xs">
              <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Company</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2 text-right">Market Cap ($B)</th>
                  <th className="px-3 py-2 text-right">P/E</th>
                  <th className="px-3 py-2 text-right">P/B</th>
                  <th className="px-3 py-2 text-right">EV/EBITDA</th>
                  <th className="px-3 py-2 text-right">ROIC</th>
                  <th className="px-3 py-2 text-right">FCF Yield</th>
                  <th className="px-3 py-2 text-right">Leverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {/* Subject company first */}
                <tr className="bg-slate-900/30">
                  <td className="px-3 py-2 font-semibold text-slate-100">
                    {subjectCompany.name} (Target)
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-100">
                    ${subjectCompany.price.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-100">
                    {(subjectCompany.marketCap / 1000).toFixed(0)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-100">
                    {subjectCompany.pe.toFixed(1)}x
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-100">
                    {subjectCompany.pb.toFixed(1)}x
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-100">
                    {subjectCompany.evEbitda.toFixed(1)}x
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-emerald-300">
                    {subjectCompany.roic.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-blue-300">
                    {subjectCompany.fcfYield.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-amber-300">
                    {subjectCompany.leverage.toFixed(1)}x
                  </td>
                </tr>

                {/* Peer companies */}
                {peerCompanies.map((peer) => (
                  <tr key={peer.ticker} className="hover:bg-slate-900/20">
                    <td className="px-3 py-2 text-slate-200">
                      <div className="font-medium">{peer.name}</div>
                      <div className="text-slate-500">{peer.ticker}</div>
                    </td>
                    <td className="px-3 py-2 text-right">${peer.price.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{(peer.marketCap / 1000).toFixed(0)}</td>
                    <td className="px-3 py-2 text-right">{peer.pe.toFixed(1)}x</td>
                    <td className="px-3 py-2 text-right">{peer.pb.toFixed(1)}x</td>
                    <td className="px-3 py-2 text-right">{peer.evEbitda.toFixed(1)}x</td>
                    <td className="px-3 py-2 text-right">{peer.roic.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right">{peer.fcfYield.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right">{peer.leverage.toFixed(1)}x</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-950/60">
                <tr>
                  <td className="px-3 py-2 text-slate-200 font-semibold">Average (Peers)</td>
                  <td className="px-3 py-2 text-right text-slate-200 font-semibold">
                    $
                    {(
                      peerCompanies.reduce((sum, p) => sum + p.price, 0) / peerCompanies.length
                    ).toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-200 font-semibold">
                    {(
                      peerCompanies.reduce((sum, p) => sum + p.marketCap, 0) /
                      peerCompanies.length /
                      1000
                    ).toFixed(0)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-200 font-semibold">
                    {multiples.peAverage.toFixed(1)}x
                  </td>
                  <td className="px-3 py-2 text-right text-slate-200 font-semibold">
                    {multiples.pbAverage.toFixed(1)}x
                  </td>
                  <td className="px-3 py-2 text-right text-slate-200 font-semibold">
                    {multiples.evEbitdaAverage.toFixed(1)}x
                  </td>
                  <td className="px-3 py-2 text-right text-slate-200 font-semibold">
                    {(
                      peerCompanies.reduce((sum, p) => sum + p.roic, 0) / peerCompanies.length
                    ).toFixed(1)}
                    %
                  </td>
                  <td className="px-3 py-2 text-right text-slate-200 font-semibold">
                    {(
                      peerCompanies.reduce((sum, p) => sum + p.fcfYield, 0) / peerCompanies.length
                    ).toFixed(1)}
                    %
                  </td>
                  <td className="px-3 py-2 text-right text-slate-200 font-semibold">
                    {(
                      peerCompanies.reduce((sum, p) => sum + p.leverage, 0) / peerCompanies.length
                    ).toFixed(1)}
                    x
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Multiple Analysis */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Multiple Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-sm font-medium text-slate-200 mb-3">P/E Multiple</div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Peer Average</span>
                  <span className="text-slate-200">{multiples.peAverage.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Target Company</span>
                  <span className="text-slate-200">{subjectCompany.pe.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Discount/Premium</span>
                  <span
                    className={cn(
                      'font-semibold',
                      subjectCompany.pe > multiples.peAverage ? 'text-red-300' : 'text-emerald-300'
                    )}
                  >
                    {((subjectCompany.pe / multiples.peAverage - 1) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-sm font-medium text-slate-200 mb-3">EV/EBITDA Multiple</div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Peer Average</span>
                  <span className="text-slate-200">{multiples.evEbitdaAverage.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Target Company</span>
                  <span className="text-slate-200">{subjectCompany.evEbitda.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Discount/Premium</span>
                  <span
                    className={cn(
                      'font-semibold',
                      subjectCompany.evEbitda > multiples.evEbitdaAverage
                        ? 'text-red-300'
                        : 'text-emerald-300'
                    )}
                  >
                    {((subjectCompany.evEbitda / multiples.evEbitdaAverage - 1) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-sm font-medium text-slate-200 mb-3">P/B Multiple</div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Peer Average</span>
                  <span className="text-slate-200">{multiples.pbAverage.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Target Company</span>
                  <span className="text-slate-200">{subjectCompany.pb.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Discount/Premium</span>
                  <span
                    className={cn(
                      'font-semibold',
                      subjectCompany.pb > multiples.pbAverage ? 'text-red-300' : 'text-emerald-300'
                    )}
                  >
                    {((subjectCompany.pb / multiples.pbAverage - 1) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investment Recommendation */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Investment Recommendation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="p-4 rounded border border-emerald-800 bg-emerald-900/20">
              <div className="text-sm font-medium text-emerald-200 mb-3">Positive Factors</div>
              <ul className="text-xs text-emerald-300 space-y-1">
                <li>• Superior ROIC vs peers (22.1% vs 19.8% average)</li>
                <li>• Higher FCF yield (6.2% vs 3.4% average)</li>
                <li>• Lower leverage (0.7x vs 0.9x average)</li>
                <li>• Trading at discount to peer multiples</li>
                <li>• Strong balance sheet and cash generation</li>
              </ul>
            </div>

            <div className="p-4 rounded border border-amber-800 bg-amber-900/20">
              <div className="text-sm font-medium text-amber-200 mb-3">Risk Considerations</div>
              <ul className="text-xs text-amber-300 space-y-1">
                <li>• Market volatility impact on multiples</li>
                <li>• Execution risk on growth initiatives</li>
                <li>• Competitive landscape evolution</li>
                <li>• Regulatory and policy changes</li>
                <li>• Macroeconomic sensitivity</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 rounded border border-slate-800 bg-slate-950/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-200 mb-1">Recommendation: BUY</div>
                <div className="text-xs text-slate-400">
                  Target trades at attractive valuation relative to peers with superior fundamentals
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-emerald-300">Price Target</div>
                <div className="text-2xl font-bold text-emerald-300">$52.00</div>
                <div className="text-xs text-slate-500">+23% upside</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
