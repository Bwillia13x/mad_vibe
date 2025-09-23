// MadLab / Valor‑IVX — Intake One-Pager Draft Stage
// Basic implementation for intake one-pager draft workbench stage

import React from 'react'
import { MemoizedCard } from '@/lib/workbench-ui.tsx'

export function IntakeOnePagerDraft() {
  return (
    <div className="w-full min-h-[calc(100vh-16px)] bg-slate-950 text-slate-100 rounded-xl overflow-hidden ring-1 ring-slate-800">
      <MemoizedCard title="Intake One-Pager Draft" subtitle="Draft initial investment memo">
        <div className="text-sm text-slate-300">
          <p>Intake one-pager draft stage coming soon...</p>
        </div>
      </MemoizedCard>
    </div>
  )
}
