import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Workbench, Explorer, Inspector, Console, TopBar } from '@/components/workbench/panels'
import type { WorkbenchTab, PromptHistoryEntry } from '@/components/workbench/WorkbenchLayout'

// Mock React hooks for testing
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    useMemo: (fn: any) => fn(),
    useCallback: (fn: any) => fn
  }
})

describe('Workbench', () => {
  const mockTabs: WorkbenchTab[] = [
    {
      id: 'overview',
      label: 'Overview',
      content: <div>Overview content</div>
    },
    {
      id: 'details',
      label: 'Details',
      content: <div>Details content</div>
    }
  ]

  it('renders tabs and active tab content', () => {
    render(
      <Workbench
        tabs={mockTabs}
        activeTab="overview"
        onTabChange={() => {}}
        stageTitle="Test Stage"
        stageGoal="Test goal"
      />
    )

    expect(screen.getByText('Overview content')).toBeInTheDocument()
    expect(screen.queryByText('Details content')).not.toBeInTheDocument()
  })

  it('allows keyboard navigation between tabs', () => {
    const onTabChange = vi.fn()
    render(
      <Workbench
        tabs={mockTabs}
        activeTab="overview"
        onTabChange={onTabChange}
        stageTitle="Test Stage"
        stageGoal="Test goal"
      />
    )

    const workbench = screen.getByLabelText('Workbench content')

    // Right arrow should switch to next tab
    fireEvent.keyDown(workbench, { key: 'ArrowRight' })
    expect(onTabChange).toHaveBeenCalledWith('details')

    // Left arrow should switch back
    fireEvent.keyDown(workbench, { key: 'ArrowLeft' })
    expect(onTabChange).toHaveBeenCalledWith('overview')
  })

  it('renders proper ARIA attributes for tabs', () => {
    render(
      <Workbench
        tabs={mockTabs}
        activeTab="overview"
        onTabChange={() => {}}
        stageTitle="Test Stage"
        stageGoal="Test goal"
      />
    )

    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false')

    const tabpanel = screen.getByRole('tabpanel')
    expect(tabpanel).toHaveAttribute('id', 'tabpanel-overview')
  })
})

describe('Explorer', () => {
  const mockStages = [
    {
      slug: 'home',
      title: 'Home',
      shortTitle: 'Home',
      goal: 'Overview stage'
    },
    {
      slug: 'intake',
      title: 'Intake',
      shortTitle: 'Intake',
      goal: 'Data intake'
    }
  ]

  it('renders pipeline stages', () => {
    render(
      <Explorer
        stages={mockStages}
        activeStage="home"
        stageStatuses={{ home: 'in-progress', intake: 'locked' }}
        onSelectStage={() => {}}
        supplementalSections={[]}
      />
    )

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Intake')).toBeInTheDocument()
  })

  it('allows keyboard navigation between stages', () => {
    const onSelectStage = vi.fn()
    render(
      <Explorer
        stages={mockStages}
        activeStage="home"
        stageStatuses={{ home: 'in-progress', intake: 'locked' }}
        onSelectStage={onSelectStage}
        supplementalSections={[]}
      />
    )

    const explorer = screen.getByLabelText('Explorer navigation')

    // Down arrow should select next stage
    fireEvent.keyDown(explorer, { key: 'ArrowDown' })
    expect(onSelectStage).toHaveBeenCalledWith('intake')

    // Up arrow should select previous stage
    fireEvent.keyDown(explorer, { key: 'ArrowUp' })
    expect(onSelectStage).toHaveBeenCalledWith('home')
  })

  it('shows current stage as active', () => {
    render(
      <Explorer
        stages={mockStages}
        activeStage="home"
        stageStatuses={{ home: 'in-progress', intake: 'locked' }}
        onSelectStage={() => {}}
        supplementalSections={[]}
      />
    )

    const activeStage = screen.getByText('Home').closest('button')
    expect(activeStage).toHaveAttribute('aria-current', 'page')
  })
})

describe('Console', () => {
  const mockHistory: PromptHistoryEntry[] = [
    {
      id: '1',
      question: 'Test prompt 1',
      stageTitle: 'Home',
      timestamp: '10:30'
    },
    {
      id: '2',
      question: 'Test prompt 2',
      stageTitle: 'Intake',
      timestamp: '10:31'
    }
  ]

  it('renders prompt history', () => {
    render(<Console history={mockHistory} tasks={[]} onClearHistory={() => {}} />)

    expect(screen.getByText('Test prompt 1')).toBeInTheDocument()
    expect(screen.getByText('Test prompt 2')).toBeInTheDocument()
  })

  it('filters prompts based on search query', () => {
    render(<Console history={mockHistory} tasks={[]} onClearHistory={() => {}} />)

    const filterInput = screen.getByLabelText('Filter prompt history')
    fireEvent.change(filterInput, { target: { value: 'Home' } })

    expect(screen.getByText('Test prompt 1')).toBeInTheDocument()
    expect(screen.queryByText('Test prompt 2')).not.toBeInTheDocument()
  })

  it('allows keyboard navigation in prompt history', () => {
    const onTogglePin = vi.fn()
    render(
      <Console
        history={mockHistory}
        tasks={[]}
        onClearHistory={() => {}}
        onTogglePin={onTogglePin}
      />
    )

    const console = screen.getByLabelText('Console')

    // Down arrow to select second item
    fireEvent.keyDown(console, { key: 'ArrowDown' })
    fireEvent.keyDown(console, { key: 'Enter' })

    expect(onTogglePin).toHaveBeenCalledWith('2')
  })

  it('exports prompt history as CSV', () => {
    // Mock URL.createObjectURL and document methods
    const mockCreateObjectURL = vi.fn(() => 'blob:url')
    const mockClick = vi.fn()
    const mockRevokeObjectURL = vi.fn()

    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL

    // Mock document.createElement
    const mockAnchor = { href: '', download: '', click: mockClick }
    const mockCreateElement = vi.fn(() => mockAnchor)
    document.createElement = mockCreateElement

    render(<Console history={mockHistory} tasks={[]} onClearHistory={() => {}} />)

    const exportButton = screen.getByLabelText('Export prompt history as CSV')
    fireEvent.click(exportButton)

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalled()
  })
})

describe('TopBar', () => {
  it('renders stage information and controls', () => {
    render(
      <TopBar
        stageTitle="Test Stage"
        stageGoal="Test goal"
        stageIndex={1}
        totalStages={5}
        presenceLabel="Collaborating with 2 analysts"
        onSubmitPrompt={() => {}}
        onNext={() => {}}
        disableNext={false}
        onOpenExplorer={() => {}}
        onOpenInspector={() => {}}
        onToggleExplorerCollapsed={() => {}}
        onToggleInspectorCollapsed={() => {}}
        explorerCollapsed={false}
        inspectorCollapsed={false}
      />
    )

    expect(screen.getByText('Stage 1 / 5')).toBeInTheDocument()
    expect(screen.getByText('Test Stage')).toBeInTheDocument()
    expect(screen.getByText('Test goal')).toBeInTheDocument()
  })

  it('shows prompt input and submit button', () => {
    const onSubmitPrompt = vi.fn()
    render(
      <TopBar
        stageTitle="Test Stage"
        stageGoal="Test goal"
        stageIndex={1}
        totalStages={5}
        presenceLabel="Solo analyst"
        onSubmitPrompt={onSubmitPrompt}
        onNext={() => {}}
        disableNext={false}
        onOpenExplorer={() => {}}
        onOpenInspector={() => {}}
        onToggleExplorerCollapsed={() => {}}
        onToggleInspectorCollapsed={() => {}}
        explorerCollapsed={false}
        inspectorCollapsed={false}
      />
    )

    const promptInput = screen.getByPlaceholderText('Ask anything…')
    const form = screen.getByRole('form')

    fireEvent.change(promptInput, { target: { value: 'Test prompt' } })
    fireEvent.submit(form)

    expect(onSubmitPrompt).toHaveBeenCalledWith('Test prompt')
  })
})
