import React from 'react'
import { cn } from '@/lib/utils'

export interface Column<T = any> {
  key: keyof T
  title: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (value: any, record: T) => React.ReactNode
  sortable?: boolean
}

interface DataTableProps<T = any> {
  data: T[]
  columns: Column<T>[]
  rowKey: keyof T
  className?: string
  emptyText?: string
  loading?: boolean
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  className,
  emptyText = 'No data available',
  loading = false
}: DataTableProps<T>) {
  const getAlignmentClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center'
      case 'right':
        return 'text-right'
      default:
        return 'text-left'
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-800/50 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p className="text-sm">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className={cn('min-w-full divide-y divide-slate-800 text-xs', className)}>
        <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn(
                  'px-3 py-2',
                  getAlignmentClass(column.align),
                  column.width && `w-[${column.width}]`
                )}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 text-slate-300">
          {data.map((record) => (
            <tr key={String(record[rowKey])} className="hover:bg-slate-900/30">
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className={cn('px-3 py-2', getAlignmentClass(column.align))}
                >
                  {column.render
                    ? column.render(record[column.key], record)
                    : String(record[column.key] || '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
