export const IDEA_INTAKE_DISQUALIFIERS = [
  'Customer concentration',
  'Regulatory overhang',
  'Leverage/solvency',
  'Aggressive accounting',
  'No pricing power'
] as const

export const TRIAGE_DECISIONS = ['Advance', 'Park', 'Reject'] as const

export const QUALITY_HINTS = [
  '10y ROIC > 12% & low reinvestment needs',
  'Recurring revenue or switching costs',
  'Clean accounting; low accruals'
] as const

export const KEYBOARD_SHORTCUTS = [
  { key: '⌘K', description: 'Omni-Prompt' },
  { key: 'G then I', description: 'Go to Intake' },
  { key: 'J', description: 'Next Stage' }
] as const
