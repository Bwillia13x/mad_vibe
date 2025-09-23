// MadLab / Valor‑IVX — Dossier Business Canvas Stage
// Basic implementation for dossier business canvas workbench stage

import React from 'react'
import { MemoizedCard } from '@/lib/workbench-ui.tsx'

export function DossierBusinessCanvas() {
  return (
    <div className="w-full min-h-[calc(100vh-16px)] bg-slate-950 text-slate-100 rounded-xl overflow-hidden ring-1 ring-slate-800">
      <MemoizedCard title="Dossier Business Canvas" subtitle="Map business model and moat">
        <div className="text-sm text-slate-300">
          <p>Dossier business canvas stage coming soon...</p>
        </div>
      </MemoizedCard>
    </div>
  )
}
