import { describe, expect, it } from 'vitest'
import { workflowStages } from '@/lib/workflow'
import { buildStageTabs } from '@/components/workbench/stage-tabs'

describe('buildStageTabs', () => {
  it('creates custom tabs for the home stage', () => {
    const homeStage = workflowStages.find((stage) => stage.slug === 'home')
    expect(homeStage).toBeDefined()
    const tabs = buildStageTabs(homeStage!)
    expect(tabs[0]?.id).toBe('daily-brief')
    expect(tabs).toHaveLength(2)
  })

  it('falls back to default when stage has no overrides', () => {
    const stage = workflowStages.find((item) => item.slug === 'portfolio')
    expect(stage).toBeDefined()
    const tabs = buildStageTabs(stage!)
    expect(tabs.length).toBeGreaterThan(0)
    expect(tabs[0]?.content).toBeTruthy()
  })
})
