// MadLab / Valor‑IVX — Data Normalization Stage
// Basic implementation for data normalization workbench stage

import React from 'react'
import { MemoizedCard } from '@/lib/workbench-ui.tsx'

export function DataNormalization() {
  return (
    <div className="w-full min-h-[calc(100vh-16px)] bg-slate-950 text-slate-100 rounded-xl overflow-hidden ring-1 ring-slate-800">
      <MemoizedCard title="Data Normalization" subtitle="Standardize inputs for analysis">
        <div className="text-sm text-slate-300">
          <p>Data normalization stage coming soon...</p>
        </div>
      </MemoizedCard>
    </div>
  )
}
