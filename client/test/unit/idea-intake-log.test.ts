import { describe, expect, it } from 'vitest'
import { classifyLogActor } from '@/hooks/useIdeaIntake'

describe('classifyLogActor', () => {
  it('labels copilot actions as AI', () => {
    expect(classifyLogActor('Copilot Prompt')).toBe('ai')
    expect(classifyLogActor('Notes updated', 'Synced from copilot response')).toBe('ai')
  })

  it('labels non-copilot activity as analyst', () => {
    expect(classifyLogActor('Analyst Note Added')).toBe('analyst')
    expect(classifyLogActor('Checklist toggled', 'Analyst toggled triage checklist')).toBe(
      'analyst'
    )
  })
})
