import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { HomeDailyBrief } from '@/components/workbench/stages/HomeDailyBrief'
import { MemoComposer } from '@/components/workbench/stages/MemoComposer'
import { IntakeOnePagerDraft } from '@/components/workbench/stages/IntakeOnePagerDraft'
import { ValuationWorkbench } from '@/components/workbench/stages/ValuationWorkbench'
import { workflowStages } from '@/lib/workflow'

// Mock React hooks for testing
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    useMemo: (fn: any) => fn(),
    useCallback: (fn: any) => fn,
    useState: (initial: any) => [initial, vi.fn()],
    useEffect: vi.fn()
  }
})

// Mock the hooks and dependencies
vi.mock('@/hooks/useWorkflow', () => ({
  useWorkflow: () => ({
    stages: workflowStages,
    activeStage: workflowStages[0],
    stageStatuses: { home: 'in-progress', intake: 'locked' },
    researchLog: [
      {
        id: '1',
        timestamp: '2024-01-01T10:30:00Z',
        stageTitle: 'Home',
        action: 'Submitted prompt',
        details: 'Test research log entry'
      }
    ],
    checklistState: {},
    presenceLabel: 'Solo analyst'
  })
}))

// Mock the useMemoComposer hook
vi.mock('@/hooks/useMemoComposer', () => ({
  useMemoComposer: () => ({
    sections: [
      {
        id: 'section-1',
        title: 'Executive Summary',
        wordTarget: 100,
        placeholder: 'Write executive summary...'
      },
      {
        id: 'section-2',
        title: 'Investment Thesis',
        wordTarget: 200,
        placeholder: 'Describe investment thesis...'
      }
    ],
    reviewPrompts: [
      {
        id: 'prompt-1',
        question: 'Is the business model sustainable?',
        helper: 'Evaluate long-term viability'
      }
    ],
    state: {
      sections: {
        'section-1': 'Test section content',
        'section-2': 'Test thesis content'
      },
      reviewChecklist: { 'prompt-1': true }
    },
    updateSection: vi.fn(),
    toggleReview: vi.fn(),
    exhibits: [],
    toggleExhibit: vi.fn(),
    updateExhibitCaption: vi.fn(),
    commentThreads: [],
    addComment: vi.fn(),
    setCommentStatus: vi.fn(),
    wordCounts: { 'section-1': 50, 'section-2': 150 },
    overallCompletion: 60,
    openCommentCount: 0,
    compiledMemo: '# Test Memo\n\nContent here...',
    htmlPreview: '<h1>Test Memo</h1><p>Content here...</p>',
    syncStatus: {
      error: null,
      isSyncing: false,
      hydrated: true,
      lastSavedAt: '2024-01-01T10:30:00Z'
    }
  })
}))

describe('Stage Component Snapshots', () => {
  it('renders HomeDailyBrief with stage overview', () => {
    const { container } = render(<HomeDailyBrief />)
    expect(container).toMatchSnapshot()
  })

  it('renders MemoComposer with sections and progress', () => {
    const { container } = render(<MemoComposer />)
    expect(container).toMatchSnapshot()
  })

  it('renders IntakeOnePagerDraft component', () => {
    const { container } = render(<IntakeOnePagerDraft />)
    expect(container).toMatchSnapshot()
  })

  it('renders ValuationWorkbench component', () => {
    const { container } = render(<ValuationWorkbench />)
    expect(container).toMatchSnapshot()
  })

  it('renders MemoComposer with different completion states', () => {
    // Mock different completion states
    vi.mocked(vi.importActual('@/hooks/useMemoComposer')).useMemoComposer.mockReturnValueOnce({
      sections: [
        {
          id: 'section-1',
          title: 'Executive Summary',
          wordTarget: 100,
          placeholder: 'Write executive summary...'
        }
      ],
      reviewPrompts: [],
      state: { sections: {}, reviewChecklist: {} },
      updateSection: vi.fn(),
      toggleReview: vi.fn(),
      exhibits: [],
      toggleExhibit: vi.fn(),
      updateExhibitCaption: vi.fn(),
      commentThreads: [],
      addComment: vi.fn(),
      setCommentStatus: vi.fn(),
      wordCounts: {},
      overallCompletion: 0,
      openCommentCount: 0,
      compiledMemo: '',
      htmlPreview: '',
      syncStatus: { error: null, isSyncing: false, hydrated: true, lastSavedAt: null }
    })

    const { container } = render(<MemoComposer />)
    expect(container).toMatchSnapshot()
  })

  it('renders MemoComposer with sync error state', () => {
    // Mock error state
    vi.mocked(vi.importActual('@/hooks/useMemoComposer')).useMemoComposer.mockReturnValueOnce({
      sections: [],
      reviewPrompts: [],
      state: { sections: {}, reviewChecklist: {} },
      updateSection: vi.fn(),
      toggleReview: vi.fn(),
      exhibits: [],
      toggleExhibit: vi.fn(),
      updateExhibitCaption: vi.fn(),
      commentThreads: [],
      addComment: vi.fn(),
      setCommentStatus: vi.fn(),
      wordCounts: {},
      overallCompletion: 0,
      openCommentCount: 0,
      compiledMemo: '',
      htmlPreview: '',
      syncStatus: { error: 'Sync failed', isSyncing: false, hydrated: true, lastSavedAt: null }
    })

    const { container } = render(<MemoComposer />)
    expect(container).toMatchSnapshot()
  })
})
