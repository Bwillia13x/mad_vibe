// MadLab / Valor‑IVX — Valuation Workbench (Production Render v1)
// IDE layout: Left Method Selector & Scenarios • Center Assumptions & Outputs • Right Inspector (Drivers, Citations, Diffs)
// Notes: No external libs. Escape raw '>' characters in JSX text (use \u003e or ≥). Icons wrapped as components.

import React, { useMemo, useState } from 'react'

// ---------------- helpers ----------------
const cls = (...s) => s.filter(Boolean).join(' ')
const fmt = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 1 })
const fmt2 = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })

function Card({ title, subtitle, right, children }) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-slate-100 font-semibold leading-tight">{title}</h3>
          {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function Tag({ tone = 'slate', children }) {
  const palette = {
    slate: 'bg-slate-800/60 text-slate-200 ring-slate-700/80',
    violet: 'bg-violet-800/40 text-violet-100 ring-violet-700/70',
    emerald: 'bg-emerald-800/40 text-emerald-100 ring-emerald-700/70',
    amber: 'bg-amber-800/40 text-amber-100 ring-amber-700/70',
    rose: 'bg-rose-800/40 text-rose-100 ring-rose-700/70',
    blue: 'bg-sky-800/40 text-sky-100 ring-sky-700/70'
  }
  return (
    <span className={cls('px-2 py-0.5 rounded-full text-xs font-medium ring-1', palette[tone])}>
      {children}
    </span>
  )
}

function Row({ left, right, badge }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        {badge}
        <div className="truncate text-sm text-slate-200">{left}</div>
      </div>
      <div className="text-sm text-slate-300">{right}</div>
    </div>
  )
}

function Sparkline({ points = [], height = 40 }) {
  const w = 160
  const h = height
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = Math.max(1, max - min)
  const d = points
    .map((y, i) => {
      const xPos = (i / (points.length - 1 || 1)) * w
      const yPos = h - ((y - min) / span) * h
      return `${i === 0 ? 'M' : 'L'}${xPos.toFixed(1)},${yPos.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" className="text-slate-400" strokeWidth="1.6" />
    </svg>
  )
}

// ---------------- icons ----------------
function IconCalc() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 7h8" />
        <path d="M8 11h8" />
        <path d="M8 15h2" />
        <path d="M12 15h4" />
      </svg>
    </span>
  )
}
function IconMethod() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 3h7v7H3z" />
        <path d="M14 3h7v7h-7z" />
        <path d="M14 14h7v7h-7z" />
        <path d="M3 14h7v7H3z" />
      </svg>
    </span>
  )
}
function IconNext() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </span>
  )
}
function IconBolt() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
      </svg>
    </span>
  )
}
function IconCheck() {
  return (
    <span aria-hidden className="inline-block">
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m20 6-11 11L4 12" />
      </svg>
    </span>
  )
}

// ---------------- demo state ----------------
const BASE = {
  price: 41.2, // current price per share
  shares: 85, // millions
  netDebt: -50, // $m (negative = net cash)
  ownerEarnings: 120, // $m (steady-state OE)
  wacc: 10.0, // %
  termG: 2.0, // % for DCF terminal
  capRate: 10.0, // % for EPV (if using OE / r)
  ebit: 150, // $m for relatives
  peerEVEBIT: 12.0,
  peerPFCF: 16.0,
  fcf: 115 // $m
}

export function ValuationWorkbench() {
  const [method, setMethod] = useState('EPV')
  const [state, setState] = useState({ ...BASE, g1: 6.0, g2: 3.0 }) // 1–5y, 6–10y growth (% per year)
  const [scenario, setScenario] = useState('Base') // Base, Bull, Bear

  // scenario nudges
  const adj = useMemo(() => {
    if (scenario === 'Bull')
      return { wacc: state.wacc - 1.0, g1: state.g1 + 2.0, g2: state.g2 + 1.0 }
    if (scenario === 'Bear')
      return {
        wacc: state.wacc + 1.5,
        g1: Math.max(0, state.g1 - 3.0),
        g2: Math.max(0, state.g2 - 2.0)
      }
    return { wacc: state.wacc, g1: state.g1, g2: state.g2 }
  }, [scenario, state])

  // -------- calculations --------
  // EPV: EV = OE / r
  const epvEV = useMemo(
    () => state.ownerEarnings / (Math.max(0.01, state.capRate) / 100),
    [state.ownerEarnings, state.capRate]
  )
  const epvEquity = useMemo(() => epvEV - state.netDebt, [epvEV, state.netDebt]) // netDebt negative means +cash
  const epvPS = useMemo(() => epvEquity / state.shares, [epvEquity, state.shares])

  // DCF 10y + terminal (simple two-stage growth on OE approximated to FCF)
  const dcf = useMemo(() => {
    const r = Math.max(0.01, adj.wacc / 100)
    const g1 = adj.g1 / 100,
      g2 = adj.g2 / 100,
      gT = Math.max(0.0, state.termG / 100)
    let cf = state.ownerEarnings // start from OE as FCF proxy
    let pv = 0
    for (let y = 1; y <= 10; y++) {
      cf = cf * (1 + (y <= 5 ? g1 : g2))
      pv += cf / Math.pow(1 + r, y)
    }
    const tv = (cf * (1 + gT)) / (r - gT)
    pv += tv / Math.pow(1 + r, 11)
    const ev = pv // enterprise value
    const equity = ev - state.netDebt
    const ps = equity / state.shares
    return { ev, equity, ps, r: adj.wacc, g1: adj.g1, g2: adj.g2, gT: state.termG }
  }, [state.ownerEarnings, state.termG, state.netDebt, state.shares, adj])

  // Relatives: EV from EV/EBIT and Equity from P/FCF
  const rel = useMemo(() => {
    const evFromEbit = state.ebit * state.peerEVEBIT // $m
    const eqFromFcf = state.fcf * state.peerPFCF // $m
    const psEV = (evFromEbit - state.netDebt) / state.shares
    const psEQ = eqFromFcf / state.shares
    const ps = (psEV + psEQ) / 2
    return {
      evFromEbit,
      eqFromFcf,
      psEV,
      psEQ,
      ps,
      ebit: state.ebit,
      peerEVEBIT: state.peerEVEBIT,
      fcf: state.fcf,
      peerPFCF: state.peerPFCF
    }
  }, [state.ebit, state.peerEVEBIT, state.fcf, state.peerPFCF, state.netDebt, state.shares])

  // Aggregate value range
  const agg = useMemo(() => {
    const values = [epvPS, dcf.ps, rel.ps].filter((v) => Number.isFinite(v))
    const low = Math.min(...values)
    const high = Math.max(...values)
    const mid = values.sort((a, b) => a - b)[Math.floor(values.length / 2)]
    const mos = (1 - state.price / mid) * 100
    return { low, mid, high, mos, price: state.price }
  }, [epvPS, dcf.ps, rel.ps, state.price])

  const drivers = [
    { k: 'WACC', w: 0.35, note: 'Discount rate drives DCF/EPV most' },
    { k: 'OE baseline', w: 0.25, note: 'Normalization & adjustments' },
    { k: 'Growth (1–5y)', w: 0.2, note: 'Near-term compounding' },
    { k: 'Terminal g', w: 0.1, note: 'Long-run assumptions' },
    { k: 'Net debt / shares', w: 0.1, note: 'Capital structure' }
  ]

  function setNum(key, val) {
    setState((s) => ({ ...s, [key]: isNaN(val) ? s[key] : val }))
  }

  // ---------------- render ----------------
  return (
    <div className="w-full min-h-[calc(100vh-16px)] bg-slate-950 text-slate-100 rounded-xl overflow-hidden ring-1 ring-slate-800">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/70 backdrop-blur px-4 py-3 flex items-center gap-3">
        <div className="text-sm text-slate-300 min-w-[260px] inline-flex items-center gap-2">
          <IconMethod /> Valuation Workbench
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Tag tone="slate">Price ${fmt2(state.price)}</Tag>
          <Tag tone="slate">Shares {fmt(state.shares)}m</Tag>
          <Tag tone={state.netDebt < 0 ? 'emerald' : 'rose'}>
            {state.netDebt < 0
              ? `Net cash $${fmt(Math.abs(state.netDebt))}m`
              : `Net debt $${fmt(state.netDebt)}m`}
          </Tag>
          <Tag tone="violet">Owner Earnings ${fmt(state.ownerEarnings)}m</Tag>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 grid grid-cols-12 gap-4">
        {/* Left: Method & Scenarios */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <Card
            title="Methods"
            subtitle="Choose a lens"
            right={
              <Tag tone="violet">
                <IconCalc /> Calc
              </Tag>
            }
          >
            <div className="grid grid-cols-2 gap-2 text-sm">
              {['EPV', 'DCF', 'Relatives', 'Special'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={cls(
                    'px-2 py-1.5 rounded-md border',
                    method === m
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Start with **EPV** (Greenwald), then DCF as a cross‑check, and Relatives for sanity.
            </div>
          </Card>

          <Card title="Scenario" subtitle="Assumption envelopes">
            <div className="flex items-center gap-2">
              {['Bear', 'Base', 'Bull'].map((s) => (
                <button
                  key={s}
                  onClick={() => setScenario(s)}
                  className={cls(
                    'px-2 py-1.5 rounded-md text-sm border',
                    scenario === s
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                <div className="text-xs text-slate-400">WACC %</div>
                <input
                  type="number"
                  step="0.1"
                  value={state.wacc}
                  onChange={(e) => setNum('wacc', parseFloat(e.target.value))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1"
                />
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                <div className="text-xs text-slate-400">Owner Earnings ($m)</div>
                <input
                  type="number"
                  step="1"
                  value={state.ownerEarnings}
                  onChange={(e) => setNum('ownerEarnings', parseFloat(e.target.value))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1"
                />
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                <div className="text-xs text-slate-400">Growth 1–5y %</div>
                <input
                  type="number"
                  step="0.1"
                  value={state.g1}
                  onChange={(e) => setNum('g1', parseFloat(e.target.value))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1"
                />
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                <div className="text-xs text-slate-400">Growth 6–10y %</div>
                <input
                  type="number"
                  step="0.1"
                  value={state.g2}
                  onChange={(e) => setNum('g2', parseFloat(e.target.value))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1"
                />
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                <div className="text-xs text-slate-400">Terminal g % (DCF)</div>
                <input
                  type="number"
                  step="0.1"
                  value={state.termG}
                  onChange={(e) => setNum('termG', parseFloat(e.target.value))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1"
                />
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                <div className="text-xs text-slate-400">Cap rate % (EPV)</div>
                <input
                  type="number"
                  step="0.1"
                  value={state.capRate}
                  onChange={(e) => setNum('capRate', parseFloat(e.target.value))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1"
                />
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                <div className="text-xs text-slate-400">Net Debt ($m)</div>
                <input
                  type="number"
                  step="1"
                  value={state.netDebt}
                  onChange={(e) => setNum('netDebt', parseFloat(e.target.value))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1"
                />
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                <div className="text-xs text-slate-400">Shares (m)</div>
                <input
                  type="number"
                  step="1"
                  value={state.shares}
                  onChange={(e) => setNum('shares', parseFloat(e.target.value))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1"
                />
              </div>
            </div>
          </Card>

          <Card title="Relatives Inputs" subtitle="Peer sanity check">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                <div className="text-xs text-slate-400">EBIT ($m)</div>
                <input
                  type="number"
                  step="1"
                  value={state.ebit}
                  onChange={(e) => setNum('ebit', parseFloat(e.target.value))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1"
                />
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                <div className="text-xs text-slate-400">Peer EV/EBIT (×)</div>
                <input
                  type="number"
                  step="0.1"
                  value={state.peerEVEBIT}
                  onChange={(e) => setNum('peerEVEBIT', parseFloat(e.target.value))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1"
                />
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                <div className="text-xs text-slate-400">FCF ($m)</div>
                <input
                  type="number"
                  step="1"
                  value={state.fcf}
                  onChange={(e) => setNum('fcf', parseFloat(e.target.value))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1"
                />
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                <div className="text-xs text-slate-400">Peer P/FCF (×)</div>
                <input
                  type="number"
                  step="0.1"
                  value={state.peerPFCF}
                  onChange={(e) => setNum('peerPFCF', parseFloat(e.target.value))}
                  className="mt-1 w-full bg-slate-950/60 border border-slate-800 rounded-md px-2 py-1"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Center: Method panel & outputs */}
        <div className="col-span-12 xl:col-span-6 space-y-4">
          {/* EPV */}
          {method === 'EPV' && (
            <Card title="Earnings Power Value (EPV)" subtitle="Steady‑state value (no growth)">
              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">Owner Earnings ($m)</div>
                  <div className="text-xl font-semibold text-slate-100">
                    {fmt(state.ownerEarnings)}
                  </div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">Cap rate %</div>
                  <div className="text-xl font-semibold text-slate-100">{fmt2(state.capRate)}</div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">EV (OE / r) $m</div>
                  <div className="text-xl font-semibold text-slate-100">{fmt(epvEV)}</div>
                </div>
              </div>
              <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">Equity $m</div>
                  <div className="text-xl font-semibold">{fmt(epvEquity)}</div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">Per share ($)</div>
                  <div className="text-xl font-semibold">{fmt2(epvPS)}</div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">Upside vs price</div>
                  <div
                    className={cls(
                      'text-xl font-semibold',
                      epvPS > state.price ? 'text-emerald-300' : 'text-rose-300'
                    )}
                  >
                    {fmt2((epvPS / state.price - 1) * 100)}%
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* DCF */}
          {method === 'DCF' && (
            <Card title="Discounted Cash Flow (10y)" subtitle="Two‑stage growth + terminal">
              <div className="grid md:grid-cols-4 gap-3 text-sm">
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">WACC %</div>
                  <div className="text-xl font-semibold">{fmt2(adj.wacc)}</div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">g 1–5y %</div>
                  <div className="text-xl font-semibold">{fmt2(adj.g1)}</div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">g 6–10y %</div>
                  <div className="text-xl font-semibold">{fmt2(adj.g2)}</div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">g Terminal %</div>
                  <div className="text-xl font-semibold">{fmt2(state.termG)}</div>
                </div>
              </div>
              <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">EV $m</div>
                  <div className="text-xl font-semibold">{fmt(dcf.ev)}</div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">Equity $m</div>
                  <div className="text-xl font-semibold">{fmt(dcf.equity)}</div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">Per share ($)</div>
                  <div className="text-xl font-semibold">{fmt2(dcf.ps)}</div>
                </div>
              </div>
            </Card>
          )}

          {/* Relatives */}
          {method === 'Relatives' && (
            <Card title="Relatives (Multiples)" subtitle="Peer / history sanity">
              <div className="grid md:grid-cols-4 gap-3 text-sm">
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">EV/EBIT peers</div>
                  <div className="text-xl font-semibold">{fmt2(state.peerEVEBIT)}×</div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">EBIT $m</div>
                  <div className="text-xl font-semibold">{fmt(state.ebit)}</div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">P/FCF peers</div>
                  <div className="text-xl font-semibold">{fmt2(state.peerPFCF)}×</div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">FCF $m</div>
                  <div className="text-xl font-semibold">{fmt(state.fcf)}</div>
                </div>
              </div>
              <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">Implied (EV/EBIT) $/sh</div>
                  <div className="text-xl font-semibold">{fmt2(rel.psEV)}</div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">Implied (P/FCF) $/sh</div>
                  <div className="text-xl font-semibold">{fmt2(rel.psEQ)}</div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3">
                  <div className="text-xs text-slate-400">Blend $/sh</div>
                  <div className="text-xl font-semibold">{fmt2(rel.ps)}</div>
                </div>
              </div>
            </Card>
          )}

          {/* Special (industry modules placeholder) */}
          {method === 'Special' && (
            <Card title="Specialized Modules" subtitle="Industry‑aware valuation">
              <ul className="text-sm text-slate-300 space-y-2">
                <li className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                  REIT NAV: cap rates, rent roll, LTV, AFFO.
                </li>
                <li className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                  Banks: NIM driver tree, losses, CET1, LCR.
                </li>
                <li className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                  Insurance: combined ratio, RBC, reserve triangles.
                </li>
                <li className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                  E\u0026P: PV‑10, reserve life, lifting costs.
                </li>
                <li className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                  Software: cohort EPV, NRR, CAC payback.
                </li>
              </ul>
            </Card>
          )}

          {/* Aggregator */}
          <Card
            title="Value Range & MOS"
            subtitle="Aggregate across methods"
            right={
              <Tag tone={agg.mos > 0 ? 'emerald' : 'rose'}>
                {agg.mos > 0 ? 'Discount' : 'Premium'}
              </Tag>
            }
          >
            <div className="grid md:grid-cols-4 gap-3 text-sm">
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3 text-center">
                <div className="text-xs text-slate-400">EPV $/sh</div>
                <div className="text-xl font-semibold">{fmt2(epvPS)}</div>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3 text-center">
                <div className="text-xs text-slate-400">DCF $/sh</div>
                <div className="text-xl font-semibold">{fmt2(dcf.ps)}</div>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3 text-center">
                <div className="text-xs text-slate-400">Relatives $/sh</div>
                <div className="text-xl font-semibold">{fmt2(rel.ps)}</div>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-md p-3 text-center">
                <div className="text-xs text-slate-400">MOS vs Price</div>
                <div
                  className={cls(
                    'text-xl font-semibold',
                    agg.mos > 0 ? 'text-emerald-300' : 'text-rose-300'
                  )}
                >
                  {fmt2(agg.mos)}%
                </div>
              </div>
            </div>
            <div className="mt-3 text-sm text-slate-300">
              Range: <Tag tone="slate">${fmt2(agg.low)}</Tag> →{' '}
              <Tag tone="slate">${fmt2(agg.high)}</Tag> • Mid:{' '}
              <Tag tone="violet">${fmt2(agg.mid)}</Tag> • Price:{' '}
              <Tag tone="blue">${fmt2(state.price)}</Tag>
            </div>
          </Card>
        </div>

        {/* Right: Inspector */}
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <Card
            title="Key Drivers"
            subtitle="What moves value most"
            right={
              <Tag tone="violet">
                <IconBolt /> rank
              </Tag>
            }
          >
            <ul className="text-sm text-slate-300 space-y-1">
              {drivers.map((d, i) => (
                <li
                  key={i}
                  className="bg-slate-950/50 border border-slate-800 rounded-md p-2 flex items-center justify-between"
                >
                  <div className="mr-2">{d.k}</div>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-amber-500"
                      style={{ width: `${Math.round(d.w * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="text-xs text-slate-500 mt-2">
              Use Scenarios to feel the sensitivity. WACC and OE normalization dominate.
            </div>
          </Card>

          <Card title="Evidence & Citations" subtitle="Tie assumptions to sources">
            <ul className="text-sm text-slate-300 space-y-1">
              <li className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                10‑K 2024 — MD\u0026A owner‑earnings bridge
              </li>
              <li className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                Q2 2025 transcript — guidance on margins
              </li>
              <li className="bg-slate-950/50 border border-slate-800 rounded-md p-2">
                Investor Day 2025 — long‑term growth targets
              </li>
            </ul>
            <div className="text-xs text-slate-500 mt-2">
              In prod, click to open exact page/timecode.
            </div>
          </Card>

          <Card title="Assumption Diff" subtitle="What changed since last run?">
            <div className="text-sm text-slate-300">
              Diff view placeholder — will highlight changed inputs (e.g., WACC +0.5pp, OE +$5m) and
              recalc impact per driver.
            </div>
          </Card>

          <Card
            title="Gate to Scenarios"
            subtitle="Proceed when ready"
            right={
              <Tag tone="emerald">
                <IconCheck /> Ready
              </Tag>
            }
          >
            <div className="text-sm text-slate-300">
              When EPV, DCF, and Relatives tell a consistent story (and assumptions are cited),
              proceed to **Scenario & Stress**.
            </div>
            <button className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border bg-violet-600 hover:bg-violet-500 text-white border-violet-500">
              Next: Scenario & Stress <IconNext />
            </button>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="h-28 border-t border-slate-800 bg-slate-950/80 p-2 flex gap-2">
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 overflow-y-auto">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Notes</div>
          <div className="text-sm text-slate-300">
            EPV anchors on durable economics; DCF cross‑checks growth path; Relatives ensure sanity
            vs peers/history. Keep **assumptions evidence‑bound** and prefer conservative caps
            (e.g., terminal g \u2264 real GDP).
          </div>
        </div>
        <div className="w-80 bg-slate-900 border border-slate-800 rounded-lg p-2">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Keyboard</div>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>
              <span className="text-slate-500">⌘P</span> Open objects
            </li>
            <li>
              <span className="text-slate-500">⌘/</span> Toggle Inspector
            </li>
            <li>
              <span className="text-slate-500">⌘J</span> Next Stage
            </li>
          </ul>
        </div>
      </div>

      {/* Dev Test (parser for symbols) */}
      <div className="hidden">
        <Card title={'Parser Test'} subtitle={'Ensure symbols render'}>
          <div className="text-sm text-slate-300">
            Terminal g constraint: {'g \u003c r'} and {'g \u2264 3% typical'}
          </div>
        </Card>
      </div>
    </div>
  )
}
