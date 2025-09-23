import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WorkbenchLayout } from '@/components/workbench/WorkbenchLayout'
import { workflowStages } from '@/lib/workflow'

// Mock React to avoid useMemo issues
vi.mock('react', () => ({
  ...vi.importActual('react'),
  useMemo: (fn: any) => fn(),
  useCallback: (fn: any) => fn
}))

// Mock the hooks and dependencies
vi.mock('@/hooks/useWorkflow', () => ({
  useWorkflow: () => ({
    stages: workflowStages,
    activeStage: workflowStages[0],
    stageStatuses: { home: 'in-progress' },
    researchLog: [],
    checklistState: {},
    presenceLabel: 'Solo analyst'
  })
}))

vi.mock('@/hooks/usePresence', () => ({
  usePresence: () => ({
    actorId: 'test-user',
    peers: []
  })
}))

// Mock the useMemoComposer hook
vi.mock('@/hooks/useMemoComposer', () => ({
  useMemoComposer: () => ({
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
    syncStatus: { error: null, isSyncing: false, hydrated: true, lastSavedAt: null }
  })
}))

describe('WorkbenchLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the workbench layout with all main components', () => {
    render(<WorkbenchLayout />)

    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByText('TopBar')).toBeInTheDocument()
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByText('Prompt History')).toBeInTheDocument()
  })

  it('renders tabs based on active stage', () => {
    render(<WorkbenchLayout />)

    // Should have tabs for home stage (daily-brief, alerts)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    expect(tabs[0]).toHaveTextContent('Daily Brief')
    expect(tabs[1]).toHaveTextContent('Alerts')
  })

  it('allows keyboard navigation between tabs', () => {
    render(<WorkbenchLayout />)

    const workbench = screen.getByRole('main')
    const firstTab = screen.getAllByRole('tab')[0]

    // Focus should be on first tab initially
    expect(firstTab).toHaveAttribute('tabindex', '0')

    // Simulate right arrow key
    fireEvent.keyDown(workbench, { key: 'ArrowRight' })

    // Second tab should now have focus
    const secondTab = screen.getAllByRole('tab')[1]
    expect(secondTab).toHaveAttribute('tabindex', '0')
  })

  it('shows console when not collapsed', () => {
    render(<WorkbenchLayout />)

    expect(screen.getByText('Prompt History')).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
  })

  it('renders stage content in workbench area', () => {
    render(<WorkbenchLayout />)

    // Should render the HomeDailyBrief component
    expect(screen.getByText('Current Stage')).toBeInTheDocument()
    expect(screen.getByText('Daily Brief')).toBeInTheDocument()
  })

  it('displays proper ARIA attributes for accessibility', () => {
    render(<WorkbenchLayout />)

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('aria-label', 'Workbench content')

    const console = screen.getByLabelText('Console')
    expect(console).toBeInTheDocument()

    const tabs = screen.getAllByRole('tab')
    tabs.forEach((tab) => {
      expect(tab).toHaveAttribute('aria-selected')
      expect(tab).toHaveAttribute('aria-controls')
    })
  })

  it('handles prompt submission', () => {
    render(<WorkbenchLayout />)

    const promptInput = screen.getByPlaceholderText('Ask anything…')
    const submitButton = screen.getByText('Next')

    fireEvent.change(promptInput, { target: { value: 'Test prompt' } })
    fireEvent.click(submitButton)

    // Should trigger prompt submission logic
    expect(promptInput).toHaveValue('')
  })
})
