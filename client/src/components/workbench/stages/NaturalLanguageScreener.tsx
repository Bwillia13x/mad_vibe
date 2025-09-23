import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useScreener } from '@/hooks/useScreener'
import { cn } from '@/lib/utils'

export function NaturalLanguageScreener() {
  const {
    naturalLanguageQuery,
    setNaturalLanguageQuery,
    executeNLQuery,
    queryResults,
    queryHistory,
    isLoading,
    error
  } = useScreener()

  const handleExecuteQuery = async () => {
    await executeNLQuery(naturalLanguageQuery)
  }

  return (
    <div className="space-y-6">
      {/* Query builder */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Natural Language Query Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="text-xs text-slate-400">
              Describe your investment universe in plain English:
            </label>
            <Textarea
              value={naturalLanguageQuery}
              onChange={(e) => setNaturalLanguageQuery(e.target.value)}
              placeholder="e.g., 'Find companies with ROIC > 15%, FCF yield > 6%, leverage < 2x, and strong insider ownership in the software sector with neglected stocks that have improving margins'"
              className="min-h-[120px] border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-slate-700 text-slate-300">
                {naturalLanguageQuery.length}/500 characters
              </Badge>
              <Badge variant="outline" className="border-violet-500 text-violet-300">
                AI-Powered
              </Badge>
            </div>
            <Button
              onClick={handleExecuteQuery}
              disabled={!naturalLanguageQuery.trim() || isLoading}
              className="bg-violet-600 hover:bg-violet-500"
            >
              {isLoading ? 'Processing...' : 'Execute Query'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error display */}
      {error && (
        <Card className="border-red-800 bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-red-300">{error}</div>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="border-red-700 text-red-300 hover:bg-red-900/30"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Query examples */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Query Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                label: 'Quality Compounders',
                query:
                  'Companies with ROIC > 20%, consistent revenue growth > 8%, and low capital intensity in recurring revenue businesses'
              },
              {
                label: 'Deep Value Opportunities',
                query:
                  'Undervalued companies with FCF yield > 10%, book value > market cap, and improving ROIC trends'
              },
              {
                label: 'Neglected Small Caps',
                query:
                  'Small cap stocks with institutional ownership < 30%, no analyst coverage, and ROIC > 12%'
              },
              {
                label: 'Turnaround Candidates',
                query:
                  'Companies showing margin improvement, declining leverage, and insider buying activity'
              },
              {
                label: 'Capital Light Businesses',
                query:
                  'Businesses with capex < 3% of revenue, strong FCF conversion, and pricing power indicators'
              },
              {
                label: 'Quality at Reasonable Price',
                query:
                  'Companies with ROIC > 15%, FCF yield > 6%, and P/E < 15x with growing market share'
              }
            ].map((example) => (
              <div
                key={example.label}
                className="p-3 rounded border border-slate-800 bg-slate-950/50 cursor-pointer hover:bg-slate-900/50 transition-colors"
                onClick={() => setNaturalLanguageQuery(example.query)}
              >
                <div className="text-sm font-medium text-slate-200 mb-2">{example.label}</div>
                <div className="text-xs text-slate-400">{example.query}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Query results */}
      {queryResults && (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm text-slate-200">
              Query Results ({queryResults.companies.length} companies)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="p-3 rounded border border-slate-800 bg-slate-950/50">
                  <div className="text-xs text-slate-500 mb-1">Avg ROIC</div>
                  <div className="text-lg font-semibold text-emerald-300">
                    {queryResults.averageROIC.toFixed(1)}%
                  </div>
                </div>
                <div className="p-3 rounded border border-slate-800 bg-slate-950/50">
                  <div className="text-xs text-slate-500 mb-1">Avg FCF Yield</div>
                  <div className="text-lg font-semibold text-blue-300">
                    {queryResults.averageFCFYield.toFixed(1)}%
                  </div>
                </div>
                <div className="p-3 rounded border border-slate-800 bg-slate-950/50">
                  <div className="text-xs text-slate-500 mb-1">Avg Leverage</div>
                  <div className="text-lg font-semibold text-amber-300">
                    {queryResults.averageLeverage.toFixed(1)}x
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-xs">
                  <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Company</th>
                      <th className="px-3 py-2 text-right">ROIC</th>
                      <th className="px-3 py-2 text-right">FCF Yield</th>
                      <th className="px-3 py-2 text-right">Leverage</th>
                      <th className="px-3 py-2 text-left">Match Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {queryResults.companies.map((company) => (
                      <tr key={company.id} className="hover:bg-slate-900/30">
                        <td className="px-3 py-2">
                          <div>
                            <div className="font-medium text-slate-200">{company.name}</div>
                            <div className="text-slate-500">{company.ticker}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">{company.roic.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right">{company.fcfYield.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right">{company.leverage.toFixed(1)}x</td>
                        <td className="px-3 py-2 text-left">
                          <div className="text-xs text-slate-400 max-w-[200px] truncate">
                            {company.matchReason}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Query history */}
      {queryHistory.length > 0 && (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <CardTitle className="text-sm text-slate-200">Query History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {queryHistory.slice(0, 5).map((query, index) => (
                <div
                  key={index}
                  className="p-3 rounded border border-slate-800 bg-slate-950/50 cursor-pointer hover:bg-slate-900/50 transition-colors"
                  onClick={() => setNaturalLanguageQuery(query.text)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant="outline"
                      className="border-slate-700 text-slate-300 text-[10px]"
                    >
                      {query.timestamp}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-violet-500 text-violet-300 text-[10px]"
                    >
                      {query.results} results
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-200">{query.text}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
