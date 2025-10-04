import { useState, useEffect } from 'react'
import { GlassCard } from '@/components/layout/GlassCard'
import { Button } from '@/components/ui/button'
import { useWorkflow } from '@/hooks/useWorkflow'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { createArtifact } from '@/lib/workspace-api'
import { pushCanvasCard } from '@/lib/studio-canvas'

interface FormulaAssistantProps {
  className?: string
}

type TargetApp = 'excel' | 'sheets'

export function FormulaAssistant({ className = '' }: FormulaAssistantProps) {
  const { activeStage } = useWorkflow()
  const { currentWorkspace, updateWorkspace } = useWorkspaceContext()

  const [targetApp, setTargetApp] = useState<TargetApp>('excel')
  const [assumptions, setAssumptions] = useState('')
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastLabel, setLastLabel] = useState<string>('')

  // Load preferred target app from workspace settings
  useEffect(() => {
    if (currentWorkspace?.settings?.preferredTargetApp) {
      setTargetApp(currentWorkspace.settings.preferredTargetApp)
    }
  }, [currentWorkspace?.id, currentWorkspace?.settings?.preferredTargetApp])

  // Save target app preference when it changes
  const onTargetAppChange = async (newTarget: TargetApp) => {
    setTargetApp(newTarget)
    if (currentWorkspace?.id) {
      await updateWorkspace(currentWorkspace.id, {
        settings: {
          ...currentWorkspace.settings,
          preferredTargetApp: newTarget
        }
      })
    }
  }

  const workspaceName = currentWorkspace?.name || 'Workspace'
  const ticker = currentWorkspace?.ticker || ''

  const sendPrompt = async (label: string, prompt: string) => {
    if (!currentWorkspace?.id) return
    setIsLoading(true)
    setLastLabel(label)
    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          capability: 'generate',
          workspaceId: currentWorkspace.id,
          context: {
            stageSlug: activeStage.slug,
            stageTitle: activeStage.title,
            workspaceName,
            ticker,
            currentData: {
              targetApp,
              assumptions: assumptions || undefined
            }
          }
        })
      })
      const data = await res.json()
      const text = typeof data.response === 'string' ? data.response : 'No response returned.'
      setOutput(text)
    } catch (_e) {
      setOutput('Failed to reach AI copilot. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const buildPrompt = (label: string): string => {
    const intro = `You are a financial modeling assistant. Output ${
      targetApp === 'excel' ? 'Excel' : 'Google Sheets'
    } formulas with short explanations.`
    const baseContext = `Company: ${workspaceName}${ticker ? ` (${ticker})` : ''}. Stage: Studio.`
    const extra = assumptions ? `User assumptions / notes: ${assumptions}` : ''

    switch (label) {
      case 'Owner Earnings':
        return `${intro}\n${baseContext}\n${extra}\nGenerate an Owner Earnings formula using common lines (Net Income, Depreciation & Amortization, Maintenance Capex, Working Capital changes). Return: (1) The core formula, (2) brief explanation, (3) simple example referencing generic cell ranges.`
      case 'WACC':
        return `${intro}\n${baseContext}\n${extra}\nProvide a WACC formula referencing RF (risk-free), ERP (equity risk premium), Beta, Cost of Debt, and Tax Rate. Return (1) the formula (2) variable definitions and where to put them (3) a short example with cell refs.`
      case 'DCF NPV':
        return `${intro}\n${baseContext}\n${extra}\nProvide a DCF formula to compute equity value from a series of forecast FCFs, a discount rate, shares outstanding, and a terminal value (Gordon Growth). Return (1) the formula (2) explanation (3) example with ranges.`
      default:
        return `${intro}\n${baseContext}\n${extra}`
    }
  }

  const onGenerate = async (label: string) => {
    const prompt = buildPrompt(label)
    await sendPrompt(label, prompt)
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(output)
    } catch (_e) {
      // ignore
    }
  }

  const onSave = async () => {
    if (!currentWorkspace?.id || !output) return
    try {
      await createArtifact(currentWorkspace.id, {
        workflowId: currentWorkspace.id,
        stageSlug: 'studio',
        type: 'model',
        name: `Formula: ${lastLabel || 'Generated'} (${new Date().toLocaleString()})`,
        data: {
          targetApp,
          assumptions: assumptions || undefined,
          output
        },
        metadata: {
          stageTitle: activeStage.title,
          workspaceName,
          ticker
        }
      })
    } catch (_e) {
      // swallow, UI is best-effort
    }
  }

  const exportCsv = () => {
    if (!output) return
    const csv = `"Formula","Target","Output"\n"${lastLabel}","${targetApp}","${output.replaceAll('"', '""').replaceAll('\n', ' ')}"`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `formula-${lastLabel}-${Date.now()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const sendToCanvas = () => {
    if (!output) return
    pushCanvasCard({
      title: lastLabel || 'Formula output',
      body: output,
      source: 'formula'
    })
  }

  return (
    <GlassCard
      title="Formula Assistant"
      subtitle="Generate Excel/Sheets formulas"
      className={className}
    >
      <div className="flex h-full flex-col">
        <div className="mb-3 flex items-center gap-2">
          <label className="text-xs text-slate-300">Target</label>
          <select
            value={targetApp}
            onChange={(e) => onTargetAppChange(e.target.value as TargetApp)}
            className="text-xs bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
            aria-label="Target application"
          >
            <option value="excel">Excel</option>
            <option value="sheets">Sheets</option>
          </select>
        </div>

        <textarea
          value={assumptions}
          onChange={(e) => setAssumptions(e.target.value)}
          placeholder="Optional assumptions (e.g., rf=4.2%, ERP=5.0%, beta from Yahoo, tax=21%)"
          className="min-h-[72px] max-h-40 bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-slate-100 placeholder-slate-500"
        />

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white"
            disabled={isLoading}
            onClick={() => onGenerate('Owner Earnings')}
          >
            Owner Earnings
          </Button>
          <Button
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white"
            disabled={isLoading}
            onClick={() => onGenerate('WACC')}
          >
            WACC
          </Button>
          <Button
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white"
            disabled={isLoading}
            onClick={() => onGenerate('DCF NPV')}
          >
            DCF NPV
          </Button>
        </div>

        <div className="mt-3 flex-1 min-h-0">
          <div className="h-full overflow-y-auto bg-slate-900/60 border border-slate-800 rounded-lg p-2">
            {isLoading ? (
              <div className="text-xs text-slate-400">Generating…</div>
            ) : output ? (
              <pre className="whitespace-pre-wrap text-xs text-slate-100">{output}</pre>
            ) : (
              <div className="text-xs text-slate-500">Output will appear here.</div>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={onCopy} disabled={!output} title="Copy to clipboard">
            Copy
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!output} title="Export as CSV">
            Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={sendToCanvas} disabled={!output} title="Send summary card to canvas">
            Send to Canvas
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={!output}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            title="Save to workspace artifacts"
          >
            Save as Artifact
          </Button>
        </div>
      </div>
    </GlassCard>
  )
}
