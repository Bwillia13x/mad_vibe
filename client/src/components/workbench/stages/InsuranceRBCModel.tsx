import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useValuation } from '@/hooks/useValuation'
import { cn } from '@/lib/utils'

interface RBCComponent {
  category: string
  risk: string
  capitalRequired: number
  totalAdjustedCapital: number
}

export function InsuranceRBCModel() {
  const { state, updateAssumption } = useValuation()

  const rbcComponents: RBCComponent[] = [
    {
      category: 'Asset Risk',
      risk: 'C-1',
      capitalRequired: 12500000,
      totalAdjustedCapital: 45000000
    },
    {
      category: 'Insurance Risk',
      risk: 'C-2',
      capitalRequired: 18000000,
      totalAdjustedCapital: 65000000
    },
    {
      category: 'Interest Rate Risk',
      risk: 'C-3',
      capitalRequired: 8500000,
      totalAdjustedCapital: 32000000
    },
    {
      category: 'Business Risk',
      risk: 'C-4',
      capitalRequired: 4200000,
      totalAdjustedCapital: 18000000
    },
    {
      category: 'Operational Risk',
      risk: 'C-5',
      capitalRequired: 6800000,
      totalAdjustedCapital: 25000000
    }
  ]

  const calculateRBC = () => {
    const totalCapitalRequired = rbcComponents.reduce((sum, c) => sum + c.capitalRequired, 0)
    const totalAdjustedCapital = rbcComponents.reduce((sum, c) => sum + c.totalAdjustedCapital, 0)
    const rbcRatio = (totalAdjustedCapital / totalCapitalRequired) * 100

    return {
      totalCapitalRequired,
      totalAdjustedCapital,
      rbcRatio,
      requiredMinimum: 200, // 200% minimum
      companyActionLevel: 150,
      regulatoryActionLevel: 100,
      mandatoryControlLevel: 70
    }
  }

  const rbc = calculateRBC()

  const getRBCStatus = (ratio: number) => {
    if (ratio >= 300)
      return {
        status: 'Excellent',
        color: 'text-emerald-300',
        bg: 'bg-emerald-900/20',
        border: 'border-emerald-800'
      }
    if (ratio >= 200)
      return {
        status: 'Adequate',
        color: 'text-amber-300',
        bg: 'bg-amber-900/20',
        border: 'border-amber-800'
      }
    if (ratio >= 150)
      return {
        status: 'Company Action',
        color: 'text-orange-300',
        bg: 'bg-orange-900/20',
        border: 'border-orange-800'
      }
    if (ratio >= 100)
      return {
        status: 'Regulatory Action',
        color: 'text-red-400',
        bg: 'bg-red-900/20',
        border: 'border-red-800'
      }
    return {
      status: 'Mandatory Control',
      color: 'text-red-600',
      bg: 'bg-red-900/40',
      border: 'border-red-900'
    }
  }

  const rbcStatus = getRBCStatus(rbc.rbcRatio)

  return (
    <div className="space-y-6">
      {/* RBC Summary */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Risk-Based Capital Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">RBC Ratio</div>
              <div className={cn('text-2xl font-bold', rbcStatus.color)}>
                {rbc.rbcRatio.toFixed(0)}%
              </div>
              <div className="text-xs text-slate-500 mt-1">Authorized Control Level</div>
            </div>
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">Total Adjusted Capital</div>
              <div className="text-lg font-semibold text-emerald-300">
                ${(rbc.totalAdjustedCapital / 1000000).toFixed(1)}M
              </div>
            </div>
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">Capital Required</div>
              <div className="text-lg font-semibold text-red-300">
                ${(rbc.totalCapitalRequired / 1000000).toFixed(1)}M
              </div>
            </div>
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-xs text-slate-500 mb-1">Surplus</div>
              <div className="text-lg font-semibold text-blue-300">
                ${((rbc.totalAdjustedCapital - rbc.totalCapitalRequired) / 1000000).toFixed(1)}M
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RBC Components */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">RBC Components Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rbcComponents.map((component, index) => {
              const percentage = (component.capitalRequired / rbc.totalCapitalRequired) * 100
              return (
                <div
                  key={component.category}
                  className="p-4 rounded border border-slate-800 bg-slate-950/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className="border-slate-700 text-slate-300 text-[10px]"
                      >
                        {component.risk}
                      </Badge>
                      <span className="text-sm font-medium text-slate-200">
                        {component.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-100">
                        ${component.capitalRequired.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500">
                        {percentage.toFixed(1)}% of total
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-slate-500 mb-1">Capital Required</div>
                      <div className="text-slate-200">
                        ${(component.capitalRequired / 1000000).toFixed(1)}M
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">Total Adjusted Capital</div>
                      <div className="text-slate-200">
                        ${(component.totalAdjustedCapital / 1000000).toFixed(1)}M
                      </div>
                    </div>
                  </div>

                  <Progress value={percentage} className="h-2 mt-3" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* RBC Ratio Analysis */}
      <Card className={cn('border-slate-800 bg-slate-900/60', rbcStatus.border, rbcStatus.bg)}>
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">RBC Ratio Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
                <div className="text-sm font-medium text-slate-200 mb-3">Current Position</div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">RBC Ratio</span>
                    <span className={rbcStatus.color}>{rbc.rbcRatio.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Minimum Required</span>
                    <span className="text-slate-200">{rbc.requiredMinimum}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Surplus Above Minimum</span>
                    <span className="text-emerald-300">
                      $
                      {((rbc.totalAdjustedCapital - rbc.totalCapitalRequired) / 1000000).toFixed(1)}
                      M
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
                <div className="text-sm font-medium text-slate-200 mb-3">Action Levels</div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Company Action Level</span>
                    <span className="text-slate-200">{rbc.companyActionLevel}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Regulatory Action Level</span>
                    <span className="text-slate-200">{rbc.regulatoryActionLevel}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Mandatory Control Level</span>
                    <span className="text-slate-200">{rbc.mandatoryControlLevel}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-sm font-medium text-slate-200 mb-3">Regulatory Status</div>
              <div className="flex items-center justify-between">
                <div>
                  <Badge className={cn('mb-2', rbcStatus.color)}>{rbcStatus.status}</Badge>
                  <div className="text-xs text-slate-400">
                    {rbc.rbcRatio >= 200
                      ? 'No regulatory action required'
                      : rbc.rbcRatio >= 150
                        ? 'Company action plan required'
                        : rbc.rbcRatio >= 100
                          ? 'Regulatory oversight triggered'
                          : 'Mandatory control level - rehabilitation required'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-200">Next Action</div>
                  <div className="text-xs text-slate-500">
                    {rbc.rbcRatio >= 200
                      ? 'Maintain capital levels'
                      : rbc.rbcRatio >= 150
                        ? 'Submit corrective plan'
                        : 'Regulatory intervention'}
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
