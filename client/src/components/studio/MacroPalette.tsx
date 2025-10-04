import { useState, useEffect } from 'react'
import { GlassCard } from '@/components/layout/GlassCard'
import { Button } from '@/components/ui/button'
import { useWorkflow } from '@/hooks/useWorkflow'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { createArtifact } from '@/lib/workspace-api'
import { pushCanvasCard } from '@/lib/studio-canvas'

interface MacroPaletteProps {
  className?: string
}

type TargetApp = 'excel' | 'sheets'

type MacroKind = 'wacc' | 'owner-earnings' | 'sensitivity'

export function MacroPalette({ className = '' }: MacroPaletteProps) {
  const { activeStage } = useWorkflow()
  const { currentWorkspace, updateWorkspace } = useWorkspaceContext()

  const [kind, setKind] = useState<MacroKind>('wacc')
  const [targetApp, setTargetApp] = useState<TargetApp>('excel')
  const [isLoading, setIsLoading] = useState(false)
  const [output, setOutput] = useState('')

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

  // Inputs
  const [rf, setRf] = useState('')
  const [erp, setErp] = useState('')
  const [beta, setBeta] = useState('')
  const [costDebt, setCostDebt] = useState('')
  const [taxRate, setTaxRate] = useState('')
  const [equity, setEquity] = useState('')
  const [debt, setDebt] = useState('')

  const [ni, setNi] = useState('')
  const [da, setDa] = useState('')
  const [maint, setMaint] = useState('')
  const [dwc, setDwc] = useState('')

  const [varName, setVarName] = useState('WACC')
  const [base, setBase] = useState('')
  const [low, setLow] = useState('')
  const [high, setHigh] = useState('')
  const [step, setStep] = useState('')

  const workspaceName = currentWorkspace?.name || 'Workspace'
  const ticker = currentWorkspace?.ticker || ''

  const buildPrompt = (): string => {
    const target = targetApp === 'excel' ? 'Excel' : 'Google Sheets'
    const baseCtx = `You are a valuation macro assistant. Output ${target} formulas with brief explanations.`
    const ideaCtx = `Company: ${workspaceName}${ticker ? ` (${ticker})` : ''}. Stage: Studio.`

    if (kind === 'wacc') {
      return `${baseCtx}\n${ideaCtx}\nInputs: RF=${rf}, ERP=${erp}, Beta=${beta}, CostOfDebt=${costDebt}, TaxRate=${taxRate}, Equity=${equity}, Debt=${debt}.\nReturn: (1) WACC formula with cell references (2) brief explanation (3) example.`
    }
    if (kind === 'owner-earnings') {
      return `${baseCtx}\n${ideaCtx}\nInputs: NetIncome=${ni}, D&A=${da}, MaintenanceCapex=${maint}, DeltaWC=${dwc}.\nReturn: (1) Owner Earnings formula with ranges (2) short rationale (3) example.`
    }
    // sensitivity
    return `${baseCtx}\n${ideaCtx}\nCreate a ${varName} sensitivity table around Base=${base}, Low=${low}, High=${high}, Step=${step}. Return (1) Table setup instructions with ${target} formulas (2) short how-to.`
  }

  const onRun = async () => {
    if (!currentWorkspace?.id) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: buildPrompt(),
          capability: 'calculate',
          workspaceId: currentWorkspace.id,
          context: {
            stageSlug: activeStage.slug,
            stageTitle: activeStage.title,
            workspaceName,
            ticker,
            currentData: {
              macro: kind,
              targetApp
            }
          }
        })
      })
      const data = await res.json()
      setOutput(typeof data.response === 'string' ? data.response : 'No response returned.')
    } catch (_e) {
      setOutput('Failed to reach AI copilot. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const onSave = async () => {
    if (!currentWorkspace?.id || !output) return
    await createArtifact(currentWorkspace.id, {
      workflowId: currentWorkspace.id,
      stageSlug: 'studio',
      type: 'analysis',
      name: `Macro: ${kind} (${new Date().toLocaleString()})`,
      data: { macro: kind, targetApp, output },
      metadata: { stageTitle: activeStage.title, workspaceName, ticker }
    })
  }

  const exportCsv = () => {
    if (!output) return
    const csv = `"Type","Output"\n"${kind}","${output.replaceAll('"', '""').replaceAll('\n', ' ')}"`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `macro-${kind}-${Date.now()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const sendToCanvas = () => {
    if (!output) return
    pushCanvasCard({
      title: `Macro: ${kind}`,
      body: output,
      source: 'macro'
    })
  }

  return (
    <GlassCard
      title="Macro Palette"
      subtitle="WACC, Owner Earnings, Sensitivity"
      className={className}
    >
      <div className="flex h-full flex-col">
        <div className="mb-2 flex items-center gap-2">
          <label className="text-xs text-slate-300">Macro</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as MacroKind)}
            className="text-xs bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
            aria-label="Macro kind"
          >
            <option value="wacc">WACC</option>
            <option value="owner-earnings">Owner Earnings</option>
            <option value="sensitivity">Sensitivity</option>
          </select>
          <label className="text-xs text-slate-300 ml-2">Target</label>
          <select
            value={targetApp}
            onChange={(e) => onTargetAppChange(e.target.value as TargetApp)}
            className="text-xs bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
            aria-label="Target app"
          >
            <option value="excel">Excel</option>
            <option value="sheets">Sheets</option>
          </select>
        </div>

        {kind === 'wacc' && (
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input-xs"
              placeholder="RF %"
              value={rf}
              onChange={(e) => setRf(e.target.value)}
              title="Risk-free rate (e.g., 10-year Treasury yield)"
            />
            <input
              className="input-xs"
              placeholder="ERP %"
              value={erp}
              onChange={(e) => setErp(e.target.value)}
              title="Equity risk premium (historical: 5-6%)"
            />
            <input
              className="input-xs"
              placeholder="Beta"
              value={beta}
              onChange={(e) => setBeta(e.target.value)}
              title="Beta (from Bloomberg, Yahoo Finance, etc.)"
            />
            <input
              className="input-xs"
              placeholder="Cost of Debt %"
              value={costDebt}
              onChange={(e) => setCostDebt(e.target.value)}
              title="After-tax cost of debt"
            />
            <input
              className="input-xs"
              placeholder="Tax Rate %"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              title="Corporate tax rate (U.S.: 21%)"
            />
            <input
              className="input-xs"
              placeholder="Equity (E)"
              value={equity}
              onChange={(e) => setEquity(e.target.value)}
            />
            <input
              className="input-xs"
              placeholder="Debt (D)"
              value={debt}
              onChange={(e) => setDebt(e.target.value)}
            />
          </div>
        )}

        {kind === 'owner-earnings' && (
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input-xs"
              placeholder="Net Income"
              value={ni}
              onChange={(e) => setNi(e.target.value)}
            />
            <input
              className="input-xs"
              placeholder="D&A"
              value={da}
              onChange={(e) => setDa(e.target.value)}
            />
            <input
              className="input-xs"
              placeholder="Maint. Capex"
              value={maint}
              onChange={(e) => setMaint(e.target.value)}
            />
            <input
              className="input-xs"
              placeholder="Delta WC"
              value={dwc}
              onChange={(e) => setDwc(e.target.value)}
            />
          </div>
        )}

        {kind === 'sensitivity' && (
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input-xs"
              placeholder="Variable Name"
              value={varName}
              onChange={(e) => setVarName(e.target.value)}
            />
            <input
              className="input-xs"
              placeholder="Base"
              value={base}
              onChange={(e) => setBase(e.target.value)}
            />
            <input
              className="input-xs"
              placeholder="Low"
              value={low}
              onChange={(e) => setLow(e.target.value)}
            />
            <input
              className="input-xs"
              placeholder="High"
              value={high}
              onChange={(e) => setHigh(e.target.value)}
            />
            <input
              className="input-xs"
              placeholder="Step"
              value={step}
              onChange={(e) => setStep(e.target.value)}
            />
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white"
            disabled={isLoading}
            onClick={onRun}
            title="Generate macro with AI"
          >
            Generate
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!output}
            onClick={() => navigator.clipboard.writeText(output)}
            title="Copy to clipboard"
          >
            Copy
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!output}
            onClick={exportCsv}
            title="Export as CSV"
          >
            Export CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!output}
            onClick={sendToCanvas}
            title="Send summary card to canvas"
          >
            Send to Canvas
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!output}
            onClick={onSave}
            title="Save to workspace artifacts"
          >
            Save as Artifact
          </Button>
        </div>

        <div className="mt-3 flex-1 min-h-0">
          <div className="h-full overflow-y-auto bg-slate-900/60 border border-slate-800 rounded-lg p-2">
            {isLoading ? (
              <div className="text-xs text-slate-400">Working…</div>
            ) : output ? (
              <pre className="whitespace-pre-wrap text-xs text-slate-100">{output}</pre>
            ) : (
              <div className="text-xs text-slate-500">Output will appear here.</div>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

// Lightweight input styling via global app styles/tailwind
// .input-xs is not a Tailwind default; using inline classes here for clarity
// If you prefer, replace with the app's Input component.
// Using small input styling consistent with Studio palette.
