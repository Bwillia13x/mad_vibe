import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

/**
 * Formula Editor Component
 * Professional code editor for Excel-like formulas and financial calculations
 * Uses simple textarea for now - can be upgraded to Monaco later
 */

interface FormulaEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  onValidate?: (errors: string[]) => void
  language?: 'excel' | 'python' | 'javascript'
}

// Common Excel functions for autocomplete
const EXCEL_FUNCTIONS = [
  'SUM',
  'AVERAGE',
  'IF',
  'VLOOKUP',
  'HLOOKUP',
  'INDEX',
  'MATCH',
  'NPV',
  'IRR',
  'XIRR',
  'PMT',
  'PV',
  'FV',
  'RATE',
  'MAX',
  'MIN',
  'COUNT',
  'COUNTA',
  'COUNTIF',
  'SUMIF',
  'ROUND',
  'ROUNDUP',
  'ROUNDDOWN',
  'ABS',
  'SQRT',
  'POWER',
  'AND',
  'OR',
  'NOT',
  'IFERROR',
  'IFNA'
]

// Financial modeling cell references (common patterns)
const COMMON_REFERENCES = [
  'Revenue',
  'COGS',
  'GrossProfit',
  'OpEx',
  'EBIT',
  'EBITDA',
  'Taxes',
  'NetIncome',
  'CapEx',
  'Depreciation',
  'Amortization',
  'ChangeInWC',
  'FCF',
  'TerminalValue',
  'WACC',
  'DiscountRate'
]

export function FormulaEditor({
  value,
  onChange,
  placeholder = 'Enter formula (e.g., =NPV(WACC, FCF1:FCF10) + TerminalValue)',
  className,
  onValidate,
  language = 'excel'
}: FormulaEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Basic syntax validation
  useEffect(() => {
    if (!onValidate || !value) return

    const errors: string[] = []

    // Check for balanced parentheses
    let parenCount = 0
    for (const char of value) {
      if (char === '(') parenCount++
      if (char === ')') parenCount--
      if (parenCount < 0) {
        errors.push('Unbalanced parentheses: too many closing parentheses')
        break
      }
    }
    if (parenCount > 0) {
      errors.push('Unbalanced parentheses: missing closing parenthesis')
    }

    // Check for valid formula start (if Excel mode)
    if (language === 'excel' && value.trim() && !value.trim().startsWith('=')) {
      errors.push('Excel formulas should start with =')
    }

    onValidate(errors)
  }, [value, onValidate, language])

  // Handle tab key for indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = value.substring(0, start) + '  ' + value.substring(end)

      onChange(newValue)

      // Set cursor position after the inserted spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      }, 0)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'w-full min-h-[120px] p-4 rounded-lg',
          'bg-slate-950 border border-slate-800',
          'text-slate-100 font-mono text-sm leading-relaxed',
          'placeholder:text-slate-600',
          'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent',
          'resize-y'
        )}
        spellCheck={false}
      />

      {/* Function hints */}
      {language === 'excel' && (
        <div className="mt-2 p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
          <p className="text-xs text-slate-400 mb-2 font-medium">Common Functions:</p>
          <div className="flex flex-wrap gap-2">
            {EXCEL_FUNCTIONS.slice(0, 12).map((func) => (
              <button
                key={func}
                onClick={() => onChange(value + func + '()')}
                className={cn(
                  'px-2 py-1 text-xs rounded',
                  'bg-slate-800 text-slate-300',
                  'hover:bg-violet-600 hover:text-white',
                  'transition-colors font-mono'
                )}
              >
                {func}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Helper component for displaying formula results
 */
interface FormulaResultProps {
  result: number | string | null
  error?: string
}

export function FormulaResult({ result, error }: FormulaResultProps) {
  if (error) {
    return (
      <div className="mt-2 p-3 bg-red-950/30 border border-red-900 rounded-lg">
        <p className="text-sm text-red-400">
          <span className="font-semibold">Error:</span> {error}
        </p>
      </div>
    )
  }

  if (result === null || result === undefined) {
    return null
  }

  const formattedResult =
    typeof result === 'number'
      ? result.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : result

  return (
    <div className="mt-2 p-3 bg-violet-950/30 border border-violet-900 rounded-lg">
      <p className="text-sm text-slate-300">
        <span className="font-semibold text-violet-400">Result:</span>{' '}
        <span className="font-mono">{formattedResult}</span>
      </p>
    </div>
  )
}

/**
 * Example formulas for users
 */
export const EXAMPLE_FORMULAS = {
  dcf: '=NPV(WACC, FCF1:FCF10) + TerminalValue/(1+WACC)^10',
  terminalValue: '=LastYearFCF * (1 + TerminalGrowth) / (WACC - TerminalGrowth)',
  wacc: '=(E/V * CostOfEquity) + (D/V * CostOfDebt * (1 - TaxRate))',
  ownerEarnings: '=NetIncome + DA - MaintenanceCapEx - DeltaWC',
  roic: '=NOPAT / InvestedCapital',
  fcfYield: '=FCF / MarketCap',
  evToEbitda: '=(MarketCap + NetDebt) / EBITDA'
}
