import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { fetchWorkflowHistory, type WorkflowHistoryEvent } from '@/lib/workflow-api'

export function MemoHistoryTimeline() {
  const [events, setEvents] = useState<WorkflowHistoryEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchWorkflowHistory('memo', 20)
      setEvents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadHistory()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Memo Timeline</h3>
          <p className="text-xs text-slate-500">
            Latest memo state revisions with actor IDs and versions.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-700 text-xs"
          onClick={() => void loadHistory()}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>
      {error && <p className="text-xs text-amber-300">{error}</p>}
      <ScrollArea className="h-[420px] rounded border border-slate-800 bg-slate-950/60">
        <div className="divide-y divide-slate-800">
          {events.length === 0 ? (
            <div className="p-4 text-xs text-slate-500">No history recorded yet.</div>
          ) : (
            events.map((event) => (
              <Card key={event.id} className="rounded-none border-0 bg-transparent">
                <CardHeader className="flex flex-row items-center justify-between px-4 py-3">
                  <CardTitle className="text-xs font-medium text-slate-300">
                    v{event.version}
                  </CardTitle>
                  <div className="text-right text-[11px] text-slate-500">
                    <div>Actor {event.actorId.slice(-6)}</div>
                    <div>{new Date(event.createdAt).toLocaleString()}</div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950/70 p-3 text-[11px] leading-relaxed text-slate-200">
{JSON.stringify(event.state, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
