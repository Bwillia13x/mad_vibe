import { useState } from 'react'
import { HelpCircle, X, Lightbulb, Keyboard, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface HelpItem {
  icon: React.ReactNode
  title: string
  description: string
  shortcuts?: string[]
}

export function ContextualHelp({ stageName }: { stageName: string }) {
  const [isOpen, setIsOpen] = useState(false)

  const helpContent: Record<string, HelpItem[]> = {
    home: [
      {
        icon: <Lightbulb className="w-4 h-4" />,
        title: 'Idea Workspace',
        description:
          'View real-time market data, news, and AI-generated investment opportunities synthesized from multiple data streams.'
      },
      {
        icon: <Keyboard className="w-4 h-4" />,
        title: 'Quick Navigation',
        description:
          'Press Cmd/Ctrl + K to open the command palette and jump to any stage instantly.'
      }
    ],
    screener: [
      {
        icon: <Lightbulb className="w-4 h-4" />,
        title: 'Natural Language Screening',
        description:
          'Use plain English to describe what you\'re looking for: "tech companies with ROIC > 15%, low debt, and growing revenue"',
        shortcuts: ['⌘K', 'Enter']
      },
      {
        icon: <BookOpen className="w-4 h-4" />,
        title: 'Factor Analysis',
        description:
          'Switch to the Factor Analysis tab to backtest different screening criteria and see historical performance.'
      }
    ],
    financials: [
      {
        icon: <Lightbulb className="w-4 h-4" />,
        title: 'Owner Earnings Bridge',
        description:
          'Normalize reported earnings by adjusting for one-time items, stock-based comp, and maintenance capex.'
      },
      {
        icon: <BookOpen className="w-4 h-4" />,
        title: 'Ask AI for Help',
        description:
          'Click the AI assistant to get help identifying unusual items or validating your normalization adjustments.'
      }
    ],
    valuation: [
      {
        icon: <Lightbulb className="w-4 h-4" />,
        title: 'Multiple Methods',
        description:
          'Use EPV for asset-light businesses, DCF for growth stories, and Relative for market context. The Aggregate view combines all three.'
      },
      {
        icon: <BookOpen className="w-4 h-4" />,
        title: 'Sensitivity Analysis',
        description:
          'Switch to the Scenario Lab to stress-test your assumptions and see how valuation changes under different conditions.'
      }
    ]
  }

  const content = helpContent[stageName] || []

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed top-20 right-6 z-40',
          'w-10 h-10 rounded-full',
          'bg-slate-800 border border-slate-700',
          'hover:bg-slate-700 hover:border-violet-500',
          'transition-all duration-200',
          'flex items-center justify-center',
          'group'
        )}
        aria-label="Show contextual help"
      >
        <HelpCircle className="w-5 h-5 text-slate-400 group-hover:text-violet-400 transition-colors" />
      </button>
    )
  }

  return (
    <div
      className={cn(
        'fixed top-20 right-6 z-40',
        'w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl',
        'animate-in fade-in slide-in-from-right-4 duration-300'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-slate-100">Quick Help</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-slate-800 rounded transition-colors"
          aria-label="Close help"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {content.length > 0 ? (
          content.map((item, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-600/10 flex items-center justify-center text-violet-400">
                  {item.icon}
                </div>
                <h4 className="text-sm font-semibold text-slate-100">{item.title}</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-10">{item.description}</p>
              {item.shortcuts && (
                <div className="flex gap-2 pl-10">
                  {item.shortcuts.map((shortcut, i) => (
                    <kbd
                      key={i}
                      className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300"
                    >
                      {shortcut}
                    </kbd>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-slate-500 text-sm">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Context-specific help will appear here as you navigate</p>
          </div>
        )}

        <div className="pt-4 border-t border-slate-800">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs border-slate-700 text-slate-300"
            onClick={() => {
              // Open AI assistant
              setIsOpen(false)
            }}
          >
            <Lightbulb className="w-3 h-3 mr-2" />
            Ask AI for More Help
          </Button>
        </div>
      </div>
    </div>
  )
}
