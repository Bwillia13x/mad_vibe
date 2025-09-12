import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

export default function HealthWidget() {
  const { data } = useQuery<any>({ queryKey: ['/api/health'] })
  const [open, setOpen] = useState(false)
  return (
    <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-50 print:hidden safe-area-bottom">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-2 text-xs rounded-md bg-gray-900 text-white shadow hover:opacity-90"
          title="System Health"
          aria-label="Open system health panel"
        >
          Health: {data?.status || '…'}
        </button>
      ) : (
        <div className="w-64 sm:w-72 max-w-[90vw] rounded-lg border bg-white dark:bg-gray-800 shadow-lg p-3 text-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">System Health</div>
            <button aria-label="Close system health panel" className="text-xs opacity-70 hover:opacity-100" onClick={() => setOpen(false)}>Close</button>
          </div>
          <div className="space-y-1">
            <div><span className="opacity-70">Env:</span> {data?.env}</div>
            <div><span className="opacity-70">Time:</span> {data?.timestamp ? new Date(data.timestamp).toLocaleString() : '—'}</div>
            <div><span className="opacity-70">AI Demo:</span> {data?.aiDemoMode ? 'Yes' : 'No'}</div>
            <div><span className="opacity-70">Scenario:</span> {data?.scenario || 'default'}</div>
            <div><span className="opacity-70">Seed:</span> {typeof data?.seed !== 'undefined' ? String(data.seed) : '—'}</div>
            <div><span className="opacity-70">Freeze:</span> {data?.freeze?.frozen ? new Date(data.freeze.date).toLocaleString() : 'No'}</div>
          </div>
          <div className="mt-2 text-xs opacity-70">
            Endpoints: <a href="/api/health" className="underline" target="_blank" rel="noreferrer">/api/health</a>
          </div>
        </div>
      )}
    </div>
  )
}
