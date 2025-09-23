import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useValuation } from '@/hooks/useValuation'
import { cn } from '@/lib/utils'

interface BankAsset {
  category: string
  balance: number
  riskWeight: number
  rwa: number
  capitalRequired: number
}

interface BankLiability {
  category: string
  balance: number
  tier: 'CET1' | 'AT1' | 'Tier2' | 'None'
  amount: number
}

export function BankCET1Model() {
  const { state, updateAssumption } = useValuation()
  const [stressScenario, setStressScenario] = useState<'baseline' | 'adverse' | 'severely-adverse'>(
    'baseline'
  )

  // Mock bank balance sheet data
  const [assets] = useState<BankAsset[]>([
    {
      category: 'Cash & Equivalents',
      balance: 45000000,
      riskWeight: 0,
      rwa: 0,
      capitalRequired: 0
    },
    {
      category: 'Treasury Securities',
      balance: 120000000,
      riskWeight: 0,
      rwa: 0,
      capitalRequired: 0
    },
    {
      category: 'Agency MBS',
      balance: 80000000,
      riskWeight: 20,
      rwa: 16000000,
      capitalRequired: 1280000
    },
    {
      category: 'Residential Mortgages',
      balance: 250000000,
      riskWeight: 50,
      rwa: 125000000,
      capitalRequired: 10000000
    },
    {
      category: 'Commercial Loans',
      balance: 180000000,
      riskWeight: 100,
      rwa: 180000000,
      capitalRequired: 14400000
    },
    {
      category: 'Corporate Bonds',
      balance: 95000000,
      riskWeight: 100,
      rwa: 95000000,
      capitalRequired: 7600000
    },
    {
      category: 'Derivatives',
      balance: 30000000,
      riskWeight: 50,
      rwa: 15000000,
      capitalRequired: 1200000
    }
  ])

  const [liabilities] = useState<BankLiability[]>([
    { category: 'Common Equity Tier 1', balance: 0, tier: 'CET1', amount: 28000000 },
    { category: 'Additional Tier 1', balance: 0, tier: 'AT1', amount: 8000000 },
    { category: 'Tier 2 Capital', balance: 0, tier: 'Tier2', amount: 12000000 },
    { category: 'Deposits', balance: 520000000, tier: 'None', amount: 0 },
    { category: 'Wholesale Funding', balance: 180000000, tier: 'None', amount: 0 },
    { category: 'Long-term Debt', balance: 50000000, tier: 'None', amount: 0 }
  ])

  const calculateCET1 = () => {
    const totalRWA = assets.reduce((sum, asset) => sum + asset.rwa, 0)
    const cet1Capital = liabilities.find((l) => l.tier === 'CET1')?.amount || 0
    const totalCapital = liabilities.reduce((sum, l) => sum + l.amount, 0)

    const cet1Ratio = (cet1Capital / totalRWA) * 100
    const totalCapitalRatio = (totalCapital / totalRWA) * 100

    // Stress test adjustments
    const stressMultipliers = {
      baseline: 1.0,
      adverse: 0.85,
      'severely-adverse': 0.75
    }

    const stressedCET1 = cet1Ratio * stressMultipliers[stressScenario]
    const stressedTotalCapital = totalCapitalRatio * stressMultipliers[stressScenario]

    return {
      totalRWA,
      cet1Capital,
      totalCapital,
      cet1Ratio,
      totalCapitalRatio,
      stressedCET1,
      stressedTotalCapital,
      requiredCET1: 7.0, // Basel III minimum
      requiredTotalCapital: 10.5
    }
  }

  const cet1Data = calculateCET1()

  const getRatioStatus = (ratio: number, required: number) => {
    if (ratio >= required * 1.2)
      return {
        status: 'Excellent',
        color: 'text-emerald-300',
        bg: 'bg-emerald-900/20',
        border: 'border-emerald-800'
      }
    if (ratio >= required)
      return {
        status: 'Adequate',
        color: 'text-amber-300',
        bg: 'bg-amber-900/20',
        border: 'border-amber-800'
      }
    return {
      status: 'Below Minimum',
      color: 'text-red-300',
      bg: 'bg-red-900/20',
      border: 'border-red-800'
    }
  }

  const cet1Status = getRatioStatus(cet1Data.stressedCET1, cet1Data.requiredCET1)
  const totalCapitalStatus = getRatioStatus(
    cet1Data.stressedTotalCapital,
    cet1Data.requiredTotalCapital
  )

  return (
    <div className="space-y-6">
      {/* CET1 Summary */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">CET1 Capital Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">CET1 Ratio</div>
              <div className={cn('text-2xl font-bold', cet1Status.color)}>
                {cet1Data.cet1Ratio.toFixed(2)}%
              </div>
              <div className="text-xs text-slate-500 mt-1">{stressScenario} scenario</div>
            </div>
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">Total Capital Ratio</div>
              <div className={cn('text-2xl font-bold', totalCapitalStatus.color)}>
                {cet1Data.totalCapitalRatio.toFixed(2)}%
              </div>
              <div className="text-xs text-slate-500 mt-1">{stressScenario} scenario</div>
            </div>
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">Risk-Weighted Assets</div>
              <div className="text-lg font-semibold text-slate-100">
                ${(cet1Data.totalRWA / 1000000).toFixed(0)}M
              </div>
            </div>
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">CET1 Capital</div>
              <div className="text-lg font-semibold text-emerald-300">
                ${(cet1Data.cet1Capital / 1000000).toFixed(0)}M
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stress Test Scenarios */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Stress Test Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button
              variant={stressScenario === 'baseline' ? 'default' : 'outline'}
              onClick={() => setStressScenario('baseline')}
              className="justify-start"
            >
              Baseline Scenario
            </Button>
            <Button
              variant={stressScenario === 'adverse' ? 'default' : 'outline'}
              onClick={() => setStressScenario('adverse')}
              className="justify-start"
            >
              Adverse Scenario
            </Button>
            <Button
              variant={stressScenario === 'severely-adverse' ? 'default' : 'outline'}
              onClick={() => setStressScenario('severely-adverse')}
              className="justify-start"
            >
              Severely Adverse
            </Button>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className={cn('p-4 rounded border', cet1Status.border, cet1Status.bg)}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-slate-200">CET1 Ratio</div>
                <Badge className={cn('text-xs', cet1Status.color)}>{cet1Status.status}</Badge>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Current</span>
                  <span className="text-slate-200">{cet1Data.cet1Ratio.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Stressed</span>
                  <span className={cet1Status.color}>{cet1Data.stressedCET1.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Minimum Required</span>
                  <span className="text-slate-200">{cet1Data.requiredCET1}%</span>
                </div>
                <Progress
                  value={(cet1Data.stressedCET1 / cet1Data.requiredCET1) * 100}
                  className="h-2 mt-2"
                />
              </div>
            </div>

            <div
              className={cn('p-4 rounded border', totalCapitalStatus.border, totalCapitalStatus.bg)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-slate-200">Total Capital Ratio</div>
                <Badge className={cn('text-xs', totalCapitalStatus.color)}>
                  {totalCapitalStatus.status}
                </Badge>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Current</span>
                  <span className="text-slate-200">{cet1Data.totalCapitalRatio.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Stressed</span>
                  <span className={totalCapitalStatus.color}>
                    {cet1Data.stressedTotalCapital.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Minimum Required</span>
                  <span className="text-slate-200">{cet1Data.requiredTotalCapital}%</span>
                </div>
                <Progress
                  value={(cet1Data.stressedTotalCapital / cet1Data.requiredTotalCapital) * 100}
                  className="h-2 mt-2"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk-Weighted Assets */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Risk-Weighted Assets Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-xs">
              <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Asset Category</th>
                  <th className="px-3 py-2 text-right">Balance ($M)</th>
                  <th className="px-3 py-2 text-right">Risk Weight</th>
                  <th className="px-3 py-2 text-right">RWA ($M)</th>
                  <th className="px-3 py-2 text-right">Capital Required ($M)</th>
                  <th className="px-3 py-2 text-center">Risk Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {assets.map((asset) => (
                  <tr key={asset.category} className="hover:bg-slate-900/30">
                    <td className="px-3 py-2 text-slate-200 font-medium">{asset.category}</td>
                    <td className="px-3 py-2 text-right">{(asset.balance / 1000000).toFixed(0)}</td>
                    <td className="px-3 py-2 text-right">{asset.riskWeight}%</td>
                    <td className="px-3 py-2 text-right">{(asset.rwa / 1000000).toFixed(0)}</td>
                    <td className="px-3 py-2 text-right">
                      {(asset.capitalRequired / 1000000).toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="w-full h-2 bg-slate-800 rounded-full">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-300 rounded-full"
                          style={{ width: `${(asset.rwa / cet1Data.totalRWA) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-950/60">
                <tr>
                  <td className="px-3 py-2 text-slate-200 font-semibold">Total</td>
                  <td className="px-3 py-2 text-right text-slate-200 font-semibold">
                    {(assets.reduce((sum, a) => sum + a.balance, 0) / 1000000).toFixed(0)}M
                  </td>
                  <td className="px-3 py-2 text-right"></td>
                  <td className="px-3 py-2 text-right text-slate-200 font-semibold">
                    {(cet1Data.totalRWA / 1000000).toFixed(0)}M
                  </td>
                  <td className="px-3 py-2 text-right text-slate-200 font-semibold">
                    {(assets.reduce((sum, a) => sum + a.capitalRequired, 0) / 1000000).toFixed(1)}M
                  </td>
                  <td className="px-3 py-2 text-center">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Capital Structure */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Capital Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-sm font-medium text-slate-200 mb-3">Regulatory Capital</div>
              <div className="space-y-3">
                {liabilities
                  .filter((l) => l.tier !== 'None')
                  .map((capital) => (
                    <div key={capital.category} className="flex justify-between text-xs">
                      <span className="text-slate-400">{capital.category}</span>
                      <span className="text-slate-200">
                        ${(capital.amount / 1000000).toFixed(1)}M
                      </span>
                    </div>
                  ))}
                <div className="border-t border-slate-700 pt-2 flex justify-between font-medium">
                  <span className="text-slate-300">Total Regulatory Capital</span>
                  <span className="text-emerald-300">
                    ${(cet1Data.totalCapital / 1000000).toFixed(1)}M
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-sm font-medium text-slate-200 mb-3">Liability Structure</div>
              <div className="space-y-3">
                {liabilities
                  .filter((l) => l.tier === 'None')
                  .map((liability) => (
                    <div key={liability.category} className="flex justify-between text-xs">
                      <span className="text-slate-400">{liability.category}</span>
                      <span className="text-slate-200">
                        ${(liability.balance / 1000000).toFixed(0)}M
                      </span>
                    </div>
                  ))}
                <div className="border-t border-slate-700 pt-2 flex justify-between font-medium">
                  <span className="text-slate-300">Total Liabilities</span>
                  <span className="text-red-300">
                    ${(liabilities.reduce((sum, l) => sum + l.balance, 0) / 1000000).toFixed(0)}M
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
