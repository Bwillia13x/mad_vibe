import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Calendar, FileText, Newspaper, Sparkles, X, ChevronRight, RefreshCw } from 'lucide-react'
import { useHomeDashboard } from '@/hooks/useDataStreams'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { IdeaSpark } from '@/services/data-streams'

const cardClasses = 'bg-slate-900/60 border-slate-800 transition-all hover:bg-slate-900/80'

function IdeaSparkCard({ spark, onDismiss, onExplore }: { 
  spark: IdeaSpark
  onDismiss: () => void
  onExplore: () => void
}) {
  const priorityColors = {
    high: 'border-l-violet-500 bg-violet-500/5',
    medium: 'border-l-blue-500 bg-blue-500/5',
    low: 'border-l-slate-600 bg-slate-800/5'
  }

  return (
    <div className={cn(
      'relative rounded-lg border border-slate-800 border-l-2 p-4',
      priorityColors[spark.priority]
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400 flex-shrink-0" />
            <h4 className="font-semibold text-slate-100 text-sm">{spark.title}</h4>
          </div>
          
          <p className="text-xs text-slate-400 leading-relaxed">{spark.description}</p>
          
          <div className="flex flex-wrap items-center gap-2">
            {spark.tickers.map(ticker => (
              <Badge key={ticker} variant="outline" className="text-xs border-violet-600/50 text-violet-300">
                {ticker}
              </Badge>
            ))}
            {spark.tags.slice(0, 2).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs border-slate-700 text-slate-400">
                {tag}
              </Badge>
            ))}
            <span className="text-xs text-slate-500">
              {Math.round(spark.confidence * 100)}% confidence
            </span>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-slate-500 hover:text-slate-300 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-violet-600/50 text-violet-300 hover:bg-violet-600/20"
          onClick={onExplore}
        >
          <ChevronRight className="h-3 w-3 mr-1" />
          Start Analysis
        </Button>
      </div>
    </div>
  )
}

export function HomeIdeaWorkspace() {
  const {
    marketMovers,
    earnings,
    filings,
    news,
    ideaSparks,
    refreshAll
  } = useHomeDashboard()

  const [selectedView, setSelectedView] = useState<'sparks' | 'movers' | 'calendar' | 'filings' | 'news'>('sparks')

  const highPrioritySparks = useMemo(
    () => ideaSparks.sparks.filter(s => s.priority === 'high'),
    [ideaSparks.sparks]
  )

  const isLoading = marketMovers.loading || earnings.loading || filings.loading || news.loading || ideaSparks.loading

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Idea Workspace</h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time market signals and investment opportunities
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshAll}
          disabled={isLoading}
          className="border-slate-700 text-slate-300"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={cardClasses}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">High Priority Ideas</p>
                <p className="text-2xl font-bold text-violet-400">{highPrioritySparks.length}</p>
              </div>
              <Sparkles className="h-8 w-8 text-violet-400/40" />
            </div>
          </CardContent>
        </Card>

        <Card className={cardClasses}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Market Movers</p>
                <p className="text-2xl font-bold text-blue-400">{marketMovers.data.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400/40" />
            </div>
          </CardContent>
        </Card>

        <Card className={cardClasses}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Upcoming Earnings</p>
                <p className="text-2xl font-bold text-emerald-400">{earnings.data.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-emerald-400/40" />
            </div>
          </CardContent>
        </Card>

        <Card className={cardClasses}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Recent Filings</p>
                <p className="text-2xl font-bold text-amber-400">{filings.data.length}</p>
              </div>
              <FileText className="h-8 w-8 text-amber-400/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'sparks', label: 'Idea Sparks', icon: Sparkles },
          { id: 'movers', label: 'Market Movers', icon: TrendingUp },
          { id: 'calendar', label: 'Earnings Calendar', icon: Calendar },
          { id: 'filings', label: 'SEC Filings', icon: FileText },
          { id: 'news', label: 'News Feed', icon: Newspaper }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSelectedView(id as typeof selectedView)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              selectedView === id
                ? 'bg-violet-600/20 text-violet-300 border border-violet-600/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {selectedView === 'sparks' && (
          <div className="space-y-3">
            {ideaSparks.sparks.length === 0 ? (
              <Card className={cardClasses}>
                <CardContent className="py-12 text-center">
                  <Sparkles className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No idea sparks generated yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Refresh to synthesize opportunities from market data
                  </p>
                </CardContent>
              </Card>
            ) : (
              ideaSparks.sparks.map(spark => (
                <IdeaSparkCard
                  key={spark.id}
                  spark={spark}
                  onDismiss={() => ideaSparks.dismissSpark(spark.id)}
                  onExplore={() => {
                    // TODO: Navigate to screener or intake with pre-filled data
                    console.log('Exploring:', spark)
                  }}
                />
              ))
            )}
          </div>
        )}

        {selectedView === 'movers' && (
          <Card className={cardClasses}>
            <CardHeader>
              <CardTitle className="text-sm text-slate-200">Top Market Movers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {marketMovers.data.map(mover => (
                <div key={mover.ticker} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100">{mover.ticker}</span>
                      <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                        {mover.sector}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{mover.reason}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-lg font-bold text-slate-100">${mover.price.toFixed(2)}</div>
                    <div className={cn(
                      "flex items-center gap-1 text-sm font-semibold",
                      mover.changePercent > 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {mover.changePercent > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {mover.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {selectedView === 'calendar' && (
          <Card className={cardClasses}>
            <CardHeader>
              <CardTitle className="text-sm text-slate-200">Upcoming Earnings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {earnings.data.map(event => (
                <div key={event.ticker} className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100">{event.ticker}</span>
                        <Badge variant="outline" className="text-xs">
                          {event.time}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{event.company}</p>
                      <div className="mt-2 text-xs text-slate-500">
                        Consensus: ${event.consensus.eps} EPS • ${(event.consensus.revenue / 1e9).toFixed(1)}B Rev
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(event.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {selectedView === 'filings' && (
          <Card className={cardClasses}>
            <CardHeader>
              <CardTitle className="text-sm text-slate-200">Recent SEC Filings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filings.data.map(filing => (
                <div key={`${filing.ticker}-${filing.formType}`} className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100">{filing.ticker}</span>
                        <Badge variant="outline" className="text-xs">
                          {filing.formType}
                        </Badge>
                        {filing.significance === 'high' && (
                          <Badge className="text-xs bg-violet-600/20 text-violet-300 border-violet-600/50">
                            High Impact
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{filing.description}</p>
                      <div className="text-xs text-slate-500 mt-1">
                        Filed {new Date(filing.filedDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {selectedView === 'news' && (
          <Card className={cardClasses}>
            <CardHeader>
              <CardTitle className="text-sm text-slate-200">Market News</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {news.data.map(item => (
                <div key={item.id} className="p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                  <div className="flex items-start gap-3">
                    <Newspaper className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-100 text-sm">{item.headline}</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.summary}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-500">{item.source}</span>
                        {item.tickers.map(ticker => (
                          <Badge key={ticker} variant="outline" className="text-xs">
                            {ticker}
                          </Badge>
                        ))}
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            item.sentiment === 'positive' && "border-emerald-600/50 text-emerald-400",
                            item.sentiment === 'negative' && "border-rose-600/50 text-rose-400",
                            item.sentiment === 'neutral' && "border-slate-700 text-slate-400"
                          )}
                        >
                          {item.sentiment}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
