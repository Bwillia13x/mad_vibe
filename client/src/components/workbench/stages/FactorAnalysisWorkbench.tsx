import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useScreener } from '@/hooks/useScreener'
import { cn } from '@/lib/utils'

interface FactorAnalysis {
  factor: string
  description: string
  weight: number
  correlation: number
  predictivePower: number
  stability: number
}

interface FactorBacktest {
  factor: string
  period: string
  return: number
  sharpe: number
  maxDrawdown: number
  winRate: number
}

export function FactorAnalysisWorkbench() {
  const { factorAnalysis, runFactorBacktest, factorBacktests } = useScreener()
  const [selectedFactor, setSelectedFactor] = useState<string>('ROIC')
  const [analysisPeriod, setAnalysisPeriod] = useState<string>('5Y')

  const selectedFactorData = useMemo(() => {
    return factorAnalysis.find((f) => f.factor === selectedFactor)
  }, [factorAnalysis, selectedFactor])

  const handleRunBacktest = async () => {
    await runFactorBacktest(selectedFactor, analysisPeriod)
  }

  return (
    <div className="space-y-6">
      {/* Factor analysis overview */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Factor Analysis Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-3 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">Total Factors</div>
              <div className="text-lg font-semibold text-slate-100">{factorAnalysis.length}</div>
            </div>
            <div className="p-3 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">Avg Correlation</div>
              <div className="text-lg font-semibold text-blue-300">
                {(
                  (factorAnalysis.reduce((sum, f) => sum + Math.abs(f.correlation), 0) /
                    factorAnalysis.length) *
                  100
                ).toFixed(1)}
                %
              </div>
            </div>
            <div className="p-3 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">Top Predictive</div>
              <div className="text-lg font-semibold text-emerald-300">
                {
                  factorAnalysis.reduce(
                    (max, f) => (f.predictivePower > max.predictivePower ? f : max),
                    factorAnalysis[0]
                  ).factor
                }
              </div>
            </div>
            <div className="p-3 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">Most Stable</div>
              <div className="text-lg font-semibold text-amber-300">
                {
                  factorAnalysis.reduce(
                    (max, f) => (f.stability > max.stability ? f : max),
                    factorAnalysis[0]
                  ).factor
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Factor selection and controls */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Factor Deep Dive</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Select Factor</label>
              <Select value={selectedFactor} onValueChange={setSelectedFactor}>
                <SelectTrigger className="border-slate-700 bg-slate-950 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {factorAnalysis.map((factor) => (
                    <SelectItem key={factor.factor} value={factor.factor}>
                      {factor.factor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Analysis Period</label>
              <Select value={analysisPeriod} onValueChange={setAnalysisPeriod}>
                <SelectTrigger className="border-slate-700 bg-slate-950 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1Y">1 Year</SelectItem>
                  <SelectItem value="3Y">3 Years</SelectItem>
                  <SelectItem value="5Y">5 Years</SelectItem>
                  <SelectItem value="10Y">10 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleRunBacktest}
                className="w-full bg-violet-600 hover:bg-violet-500"
              >
                Run Backtest
              </Button>
            </div>
          </div>

          {selectedFactorData && (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-3 rounded border border-slate-800 bg-slate-950/50">
                <div className="text-xs text-slate-500 mb-1">Weight</div>
                <div className="text-lg font-semibold text-slate-100">
                  {selectedFactorData.weight.toFixed(1)}%
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full mt-2">
                  <div
                    className="h-full bg-violet-500 rounded-full"
                    style={{ width: `${selectedFactorData.weight}%` }}
                  />
                </div>
              </div>
              <div className="p-3 rounded border border-slate-800 bg-slate-950/50">
                <div className="text-xs text-slate-500 mb-1">Correlation</div>
                <div
                  className={cn(
                    'text-lg font-semibold',
                    selectedFactorData.correlation > 0 ? 'text-emerald-300' : 'text-red-300'
                  )}
                >
                  {selectedFactorData.correlation > 0 ? '+' : ''}
                  {selectedFactorData.correlation.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-1">vs Market</div>
              </div>
              <div className="p-3 rounded border border-slate-800 bg-slate-950/50">
                <div className="text-xs text-slate-500 mb-1">Predictive Power</div>
                <div className="text-lg font-semibold text-blue-300">
                  {selectedFactorData.predictivePower.toFixed(1)}%
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full mt-2">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${selectedFactorData.predictivePower}%` }}
                  />
                </div>
              </div>
              <div className="p-3 rounded border border-slate-800 bg-slate-950/50">
                <div className="text-xs text-slate-500 mb-1">Stability</div>
                <div className="text-lg font-semibold text-amber-300">
                  {selectedFactorData.stability.toFixed(1)}%
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full mt-2">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${selectedFactorData.stability}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Factor correlation matrix */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Factor Correlation Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2 px-2 text-slate-500">Factor</th>
                  {factorAnalysis.slice(0, 8).map((factor) => (
                    <th
                      key={factor.factor}
                      className="text-center py-2 px-2 text-slate-500 min-w-[80px]"
                    >
                      {factor.factor}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {factorAnalysis.slice(0, 8).map((rowFactor) => (
                  <tr key={rowFactor.factor} className="border-b border-slate-800/50">
                    <td className="py-2 px-2 text-slate-200 font-medium">{rowFactor.factor}</td>
                    {factorAnalysis.slice(0, 8).map((colFactor) => {
                      const correlation = Math.random() * 0.8 - 0.4 // Mock data
                      return (
                        <td key={colFactor.factor} className="py-2 px-2 text-center">
                          <div
                            className={cn(
                              'font-semibold',
                              Math.abs(correlation) > 0.6
                                ? 'text-emerald-300'
                                : Math.abs(correlation) > 0.3
                                  ? 'text-amber-300'
                                  : 'text-slate-400'
                            )}
                          >
                            {correlation > 0 ? '+' : ''}
                            {correlation.toFixed(2)}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Factor backtests */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Factor Backtests</CardTitle>
        </CardHeader>
        <CardContent>
          {factorBacktests.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">
                No backtests available. Select a factor and run a backtest to see results.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {factorBacktests.map((backtest) => (
                  <div
                    key={`${backtest.factor}-${backtest.period}`}
                    className="p-4 rounded border border-slate-800 bg-slate-950/50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium text-slate-200">{backtest.factor}</div>
                      <Badge
                        variant="outline"
                        className="border-slate-700 text-slate-300 text-[10px]"
                      >
                        {backtest.period}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-slate-500">Return</div>
                        <div
                          className={cn(
                            'font-semibold',
                            backtest.return > 0 ? 'text-emerald-300' : 'text-red-300'
                          )}
                        >
                          {backtest.return > 0 ? '+' : ''}
                          {backtest.return.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Sharpe</div>
                        <div className="font-semibold text-blue-300">
                          {backtest.sharpe.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Win Rate</div>
                        <div className="font-semibold text-amber-300">
                          {backtest.winRate.toFixed(0)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Max DD</div>
                        <div className="font-semibold text-red-300">
                          -{backtest.maxDrawdown.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Factor recommendations */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">AI Factor Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded border border-emerald-800 bg-emerald-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-emerald-600 text-emerald-100">Recommended</Badge>
                  <span className="text-sm font-medium text-emerald-200">
                    High Conviction Factors
                  </span>
                </div>
                <ul className="text-xs text-emerald-300 space-y-1">
                  <li>• ROIC (20% weight) - Strong predictive power</li>
                  <li>• FCF Yield (15% weight) - Stable returns</li>
                  <li>• Insider Ownership (10% weight) - Governance signal</li>
                </ul>
              </div>
              <div className="p-4 rounded border border-amber-800 bg-amber-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-amber-600 text-amber-100">Monitor</Badge>
                  <span className="text-sm font-medium text-amber-200">Watchlist Factors</span>
                </div>
                <ul className="text-xs text-amber-300 space-y-1">
                  <li>• Growth Durability - Improving signals</li>
                  <li>• Pricing Power - Mixed results</li>
                  <li>• Capital Allocation - Case-by-case basis</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
