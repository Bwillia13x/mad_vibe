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
import { useValuation } from '@/hooks/useValuation'
import { formatCurrency, formatPercentage, calculatePercentage } from '@/lib/financial-utils'
import { MetricCard } from '@/components/ui/metric-card'
import { DataTable } from '@/components/ui/data-table'
import { REITProperty, PeerCompany } from '@/types/valuation'
import { cn } from '@/lib/utils'

export function REITNavModel() {
  const { state, updateAssumption } = useValuation()
  const [properties, setProperties] = useState<REITProperty[]>([
    {
      id: '1',
      name: 'Downtown Office Tower',
      type: 'office',
      location: 'New York, NY',
      squareFeet: 500000,
      occupancy: 92,
      noi: 15000000,
      capRate: 6.5,
      appraisedValue: 230769231
    },
    {
      id: '2',
      name: 'Regional Shopping Center',
      type: 'retail',
      location: 'Chicago, IL',
      squareFeet: 800000,
      occupancy: 88,
      noi: 12000000,
      capRate: 7.2,
      appraisedValue: 166666667
    },
    {
      id: '3',
      name: 'Distribution Warehouse',
      type: 'industrial',
      location: 'Atlanta, GA',
      squareFeet: 1200000,
      occupancy: 96,
      noi: 18000000,
      capRate: 5.8,
      appraisedValue: 310344828
    }
  ])

  const calculateNAV = () => {
    const totalAppraisedValue = properties.reduce((sum, prop) => sum + prop.appraisedValue, 0)
    const totalSquareFeet = properties.reduce((sum, prop) => sum + prop.squareFeet, 0)
    const weightedOccupancy =
      properties.reduce((sum, prop) => sum + prop.occupancy * prop.squareFeet, 0) / totalSquareFeet
    const weightedCapRate =
      properties.reduce((sum, prop) => sum + prop.capRate * prop.squareFeet, 0) / totalSquareFeet

    return {
      totalNAV: totalAppraisedValue,
      navPerShare: totalAppraisedValue / 100000000, // Assuming 100M shares outstanding
      weightedOccupancy,
      weightedCapRate,
      propertyCount: properties.length
    }
  }

  const nav = calculateNAV()

  return (
    <div className="space-y-6">
      {/* NAV Summary */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">REIT NAV Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard title="Total NAV" value={formatCurrency(nav.totalNAV)} size="md" />
            <MetricCard
              title="NAV per Share"
              value={formatCurrency(nav.navPerShare, { maximumFractionDigits: 2 })}
              size="md"
            />
            <MetricCard
              title="Weighted Occupancy"
              value={formatPercentage(nav.weightedOccupancy, 1)}
              size="md"
            />
            <MetricCard
              title="Weighted Cap Rate"
              value={formatPercentage(nav.weightedCapRate, 1)}
              size="md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Property Portfolio */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Property Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={properties}
            columns={[
              {
                key: 'name' as keyof REITProperty,
                title: 'Property',
                align: 'left',
                render: (value, record) => <div className="font-medium text-slate-200">{value}</div>
              },
              {
                key: 'type' as keyof REITProperty,
                title: 'Type',
                align: 'left',
                render: (value) => (
                  <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">
                    {value}
                  </Badge>
                )
              },
              {
                key: 'location' as keyof REITProperty,
                title: 'Location',
                align: 'left',
                render: (value) => <span className="text-slate-400">{value}</span>
              },
              {
                key: 'squareFeet' as keyof REITProperty,
                title: 'Sq Ft',
                align: 'right',
                render: (value) => value.toLocaleString()
              },
              {
                key: 'occupancy' as keyof REITProperty,
                title: 'Occupancy',
                align: 'right',
                render: (value) => `${value}%`
              },
              {
                key: 'noi' as keyof REITProperty,
                title: 'NOI',
                align: 'right',
                render: (value) => formatCurrency(value)
              },
              {
                key: 'capRate' as keyof REITProperty,
                title: 'Cap Rate',
                align: 'right',
                render: (value) => formatPercentage(value, 1)
              },
              {
                key: 'appraisedValue' as keyof REITProperty,
                title: 'Value',
                align: 'right',
                render: (value) => formatCurrency(value)
              }
            ]}
            rowKey="id"
            emptyText="No properties available"
          />
        </CardContent>
      </Card>

      {/* NAV Components */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">NAV Components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
                <div className="text-sm font-medium text-slate-200 mb-3">Real Estate Assets</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Operating Properties</span>
                    <span className="text-slate-200">
                      ${(nav.totalNAV * 0.85).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Development Pipeline</span>
                    <span className="text-slate-200">
                      ${(nav.totalNAV * 0.12).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Land Bank</span>
                    <span className="text-slate-200">
                      ${(nav.totalNAV * 0.03).toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-slate-700 pt-2 flex justify-between font-medium">
                    <span className="text-slate-300">Subtotal</span>
                    <span className="text-emerald-300">${nav.totalNAV.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
                <div className="text-sm font-medium text-slate-200 mb-3">Liabilities</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mortgage Debt</span>
                    <span className="text-red-300">
                      -$ {(nav.totalNAV * 0.45).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Unsecured Debt</span>
                    <span className="text-red-300">
                      -$ {(nav.totalNAV * 0.15).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Other Liabilities</span>
                    <span className="text-red-300">
                      -$ {(nav.totalNAV * 0.08).toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-slate-700 pt-2 flex justify-between font-medium">
                    <span className="text-slate-300">Subtotal</span>
                    <span className="text-red-300">
                      -$ {(nav.totalNAV * 0.68).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
                <div className="text-sm font-medium text-slate-200 mb-3">
                  Other Assets/Liabilities
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cash & Equivalents</span>
                    <span className="text-emerald-300">
                      $ {(nav.totalNAV * 0.05).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Working Capital</span>
                    <span className="text-emerald-300">
                      $ {(nav.totalNAV * 0.02).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Management Fees</span>
                    <span className="text-red-300">
                      -$ {(nav.totalNAV * 0.03).toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-slate-700 pt-2 flex justify-between font-medium">
                    <span className="text-slate-300">Subtotal</span>
                    <span className="text-emerald-300">
                      $ {(nav.totalNAV * 0.04).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded border border-emerald-800 bg-emerald-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-emerald-200 mb-1">Net Asset Value</div>
                  <div className="text-xs text-emerald-300">
                    Real Estate Assets + Other Assets - Liabilities
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-300">
                    ${nav.navPerShare.toFixed(2)}
                  </div>
                  <div className="text-xs text-emerald-400">per share</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Comparison */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-sm text-slate-200">Market Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-sm font-medium text-slate-200 mb-3">Current Trading</div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Share Price</span>
                  <span className="text-slate-200">$38.50</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">NAV Premium/Discount</span>
                  <span
                    className={cn(
                      'font-semibold',
                      nav.navPerShare > 38.5 ? 'text-red-300' : 'text-emerald-300'
                    )}
                  >
                    {((38.5 / nav.navPerShare - 1) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">52W Premium/Discount</span>
                  <span className="text-amber-300">-8.5%</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-sm font-medium text-slate-200 mb-3">Peer Comparison</div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Sector Average NAV</span>
                  <span className="text-slate-200">$42.15</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Sector Premium/Discount</span>
                  <span className="text-blue-300">-2.1%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Quality Rank</span>
                  <span className="text-emerald-300">Top 25%</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded border border-slate-800 bg-slate-950/50">
              <div className="text-sm font-medium text-slate-200 mb-3">Investment Signal</div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">NAV Discount</span>
                  <span className="text-emerald-300">-8.6%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Quality Premium</span>
                  <span className="text-blue-300">+6.5%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Net Signal</span>
                  <span className="text-emerald-300">BUY</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
