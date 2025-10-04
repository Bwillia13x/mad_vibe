import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Eye, Code, Split } from 'lucide-react'

/**
 * Markdown Editor with Live Preview
 * Professional markdown editing for investment memos
 */

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

type ViewMode = 'edit' | 'preview' | 'split'

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write your investment memo in Markdown...',
  className
}: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split')

  // Simple markdown to HTML converter (basic implementation)
  const renderMarkdown = (text: string): string => {
    let html = text

    // Headers
    html = html.replace(
      /^### (.*$)/gim,
      '<h3 class="text-lg font-semibold text-slate-100 mt-4 mb-2">$1</h3>'
    )
    html = html.replace(
      /^## (.*$)/gim,
      '<h2 class="text-xl font-semibold text-slate-100 mt-6 mb-3">$1</h2>'
    )
    html = html.replace(
      /^# (.*$)/gim,
      '<h1 class="text-2xl font-bold text-slate-100 mt-8 mb-4">$1</h1>'
    )

    // Bold
    html = html.replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="font-semibold text-slate-100">$1</strong>'
    )

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-slate-300">$1</em>')

    // Lists
    html = html.replace(/^\* (.*$)/gim, '<li class="ml-4 text-slate-300">$1</li>')
    html = html.replace(/^- (.*$)/gim, '<li class="ml-4 text-slate-300">$1</li>')

    // Links
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-violet-400 hover:underline">$1</a>'
    )

    // Code blocks
    html = html.replace(
      /```(.*?)```/gs,
      '<pre class="bg-slate-900 border border-slate-800 rounded p-3 my-2 overflow-x-auto"><code class="text-sm font-mono text-slate-300">$1</code></pre>'
    )

    // Inline code
    html = html.replace(
      /`([^`]+)`/g,
      '<code class="px-1.5 py-0.5 bg-slate-800 rounded text-sm font-mono text-violet-300">$1</code>'
    )

    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p class="text-slate-300 leading-relaxed mb-4">')
    html = '<p class="text-slate-300 leading-relaxed mb-4">' + html + '</p>'

    return html
  }

  // Toolbar actions
  const insertBold = () => {
    onChange(value + '**bold text**')
  }

  const insertItalic = () => {
    onChange(value + '*italic text*')
  }

  const insertHeading = (level: number) => {
    const prefix = '#'.repeat(level)
    onChange(value + `\n${prefix} Heading ${level}\n`)
  }

  const insertList = () => {
    onChange(value + '\n- List item\n- List item\n')
  }

  const insertCode = () => {
    onChange(value + '\n```\ncode block\n```\n')
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-slate-900 border-b border-slate-800 rounded-t-lg">
        <div className="flex items-center gap-1 border-r border-slate-700 pr-2">
          <Button
            variant={viewMode === 'edit' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('edit')}
            className="h-8"
          >
            <Code className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'split' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('split')}
            className="h-8"
          >
            <Split className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'preview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('preview')}
            className="h-8"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>

        {viewMode !== 'preview' && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={insertBold} className="h-8 px-2 font-bold">
              B
            </Button>
            <Button variant="ghost" size="sm" onClick={insertItalic} className="h-8 px-2 italic">
              I
            </Button>
            <Button variant="ghost" size="sm" onClick={() => insertHeading(1)} className="h-8 px-2">
              H1
            </Button>
            <Button variant="ghost" size="sm" onClick={() => insertHeading(2)} className="h-8 px-2">
              H2
            </Button>
            <Button variant="ghost" size="sm" onClick={insertList} className="h-8 px-2">
              List
            </Button>
            <Button variant="ghost" size="sm" onClick={insertCode} className="h-8 px-2">
              Code
            </Button>
          </div>
        )}

        <div className="ml-auto text-xs text-slate-500">{value.length} characters</div>
      </div>

      {/* Editor/Preview Area */}
      <div className={cn('flex', viewMode === 'split' ? 'flex-row' : 'flex-col')}>
        {/* Editor */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={cn('flex-1', viewMode === 'split' && 'border-r border-slate-800')}>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className={cn(
                'w-full h-[500px] p-4',
                'bg-slate-950 border-0',
                'text-slate-100 text-sm leading-relaxed',
                'placeholder:text-slate-600',
                'focus:outline-none',
                'resize-none font-mono',
                viewMode === 'edit' && 'rounded-b-lg',
                viewMode === 'split' && 'rounded-bl-lg'
              )}
              spellCheck={true}
            />
          </div>
        )}

        {/* Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={cn('flex-1 h-[500px] overflow-y-auto')}>
            <div
              className={cn(
                'p-4 prose prose-invert prose-slate max-w-none',
                'bg-slate-900/50',
                viewMode === 'preview' && 'rounded-b-lg',
                viewMode === 'split' && 'rounded-br-lg'
              )}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Memo template examples
 */
export const MEMO_TEMPLATES = {
  investment: `# Investment Memo: [Company Name]

## Executive Summary
*Brief 2-3 sentence thesis*

## Business Overview
- **Industry**: 
- **Founded**: 
- **Key Products**: 

## Investment Thesis
1. **Competitive Advantage**: 
2. **Growth Drivers**: 
3. **Downside Protection**: 

## Valuation
- **Current Price**: $XX.XX
- **Intrinsic Value**: $XX.XX
- **Margin of Safety**: XX%

## Risks
- **Key Risk 1**: 
- **Key Risk 2**: 
- **Key Risk 3**: 

## Conclusion
**Recommendation**: [BUY / HOLD / PASS]
`,

  quarterly: `# Quarterly Update: [Company Name]

## Quarter: [Q# YYYY]

### Financial Performance
- **Revenue**: $XXM (YY% YoY)
- **Net Income**: $XXM (YY% YoY)
- **FCF**: $XXM (YY% YoY)

### Key Developments
- 

### Updated Thesis
*Any changes to investment thesis*

### Action Items
- [ ] Update valuation model
- [ ] Review guidance
- [ ] Monitor competitors
`,

  diligence: `# Due Diligence Checklist: [Company Name]

## Financial Analysis
- [ ] 10-K review complete
- [ ] 5-year financial trends analyzed
- [ ] Owner earnings calculated
- [ ] ROIC validated

## Qualitative Factors
- [ ] Management integrity assessed
- [ ] Competitive moat identified
- [ ] Industry dynamics understood
- [ ] Customer concentration checked

## Valuation
- [ ] DCF model built
- [ ] Comparable analysis done
- [ ] Sensitivity analysis complete
- [ ] Margin of safety confirmed

## Risk Assessment
- [ ] Key risks identified
- [ ] Scenario analysis done
- [ ] Downside case modeled
- [ ] Exit strategy defined
`
}
