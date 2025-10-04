import { useState, useEffect } from 'react'
import { useWorkspaceContext } from '@/hooks/useWorkspaceContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, X, CheckCircle, AlertCircle, Loader2, Sparkles, RefreshCw, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentTask {
  id: string
  workspaceId: number
  type: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused'
  steps: AgentStep[]
  currentStepIndex: number
  error: string | null
  startedAt: string | null
  completedAt: string | null
}

interface AgentStep {
  id: string
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  error: string | null
}

const TASK_TYPES = [
  {
    value: 'analyze-10k',
    label: 'Analyze 10-K Filing',
    description: 'Full 10-K analysis with financial extraction and insights',
    icon: '📄'
  },
  {
    value: 'build-dcf-model',
    label: 'Build DCF Model',
    description: 'Automated DCF valuation with projections',
    icon: '💰'
  },
  {
    value: 'competitive-analysis',
    label: 'Competitive Analysis',
    description: 'Compare against competitors in same industry',
    icon: '📊'
  },
  {
    value: 'thesis-validation',
    label: 'Validate Thesis',
    description: 'Test investment thesis with evidence',
    icon: '🔍'
  },
  {
    value: 'risk-assessment',
    label: 'Risk Assessment',
    description: 'Identify and quantify investment risks',
    icon: '⚠️'
  },
  {
    value: 'quarterly-update',
    label: 'Quarterly Update',
    description: 'Process latest 10-Q and update analysis',
    icon: '📈'
  }
]

export function AgentTaskPanel() {
  const { currentWorkspace } = useWorkspaceContext()
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [selectedTaskType, setSelectedTaskType] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Load workspace tasks
  useEffect(() => {
    if (currentWorkspace) {
      loadTasks()
    }
  }, [currentWorkspace?.id])

  const loadTasks = async () => {
    if (!currentWorkspace) return

    try {
      const response = await fetch(`/api/agents/workspaces/${currentWorkspace.id}/tasks`)
      const data = await response.json()
      setTasks(data.tasks || [])
    } catch (error) {
      console.error('Failed to load tasks:', error)
    }
  }

  const createTask = async (taskType: string) => {
    if (!currentWorkspace) return

    setIsCreating(true)
    try {
      const response = await fetch('/api/agents/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
          type: taskType,
          params: {
            ticker: currentWorkspace.ticker
          }
        })
      })

      const task = await response.json()
      setTasks([task, ...tasks])

      // Auto-start the task
      await startTask(task.id)

      setSelectedTaskType(null)
    } catch (error) {
      console.error('Failed to create task:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const startTask = async (taskId: string) => {
    try {
      await fetch(`/api/agents/tasks/${taskId}/start`, {
        method: 'POST'
      })

      // Set up SSE connection for updates
      const eventSource = new EventSource(`/api/agents/tasks/${taskId}/stream`)

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'step:completed' || data.type === 'step:started') {
          // Refresh task list
          loadTasks()
        } else if (data.type === 'task:completed' || data.type === 'task:failed') {
          loadTasks()
          eventSource.close()
        }
      }
    } catch (error) {
      console.error('Failed to start task:', error)
    }
  }

  const pauseTask = async (taskId: string) => {
    try {
      await fetch(`/api/agents/tasks/${taskId}/pause`, {
        method: 'POST'
      })
      loadTasks()
    } catch (error) {
      console.error('Failed to pause task:', error)
    }
  }

  const cancelTask = async (taskId: string) => {
    try {
      await fetch(`/api/agents/tasks/${taskId}/cancel`, {
        method: 'POST'
      })
      loadTasks()
    } catch (error) {
      console.error('Failed to cancel task:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'in_progress':
        return <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
      case 'paused':
        return <Pause className="w-5 h-5 text-yellow-500" />
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-slate-600" />
    }
  }

  const getProgress = (task: AgentTask) => {
    const completed = task.steps.filter((s) => s.status === 'completed').length
    return (completed / task.steps.length) * 100
  }

  const getTaskStats = (task: AgentTask) => {
    const completed = task.steps.filter((s) => s.status === 'completed').length
    const failed = task.steps.filter((s) => s.status === 'failed').length
    const pending = task.steps.filter((s) => s.status === 'pending').length
    return { completed, failed, pending }
  }

  const formatDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt) return null
    const start = new Date(startedAt)
    const end = completedAt ? new Date(completedAt) : new Date()
    const durationMs = end.getTime() - start.getTime()
    const seconds = Math.floor(durationMs / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s`
  }

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <p>Select a workspace to use agent mode</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-violet-500" />
          Agent Mode
        </h2>
        <Button
          onClick={() => setSelectedTaskType(selectedTaskType ? null : 'menu')}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'New Agent Task'
          )}
        </Button>
      </div>

      {/* Task Type Selection */}
      {selectedTaskType === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TASK_TYPES.map((taskType) => (
            <Card
              key={taskType.value}
              className="p-4 cursor-pointer hover:border-violet-500 transition-colors"
              onClick={() => createTask(taskType.value)}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{taskType.icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-100">{taskType.label}</h3>
                  <p className="text-sm text-slate-400 mt-1">{taskType.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Active Tasks */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No agent tasks yet</p>
            <p className="text-sm mt-1">Create a task to automate multi-step analysis</p>
          </Card>
        ) : (
          tasks.map((task) => {
            const stats = getTaskStats(task)
            const duration = formatDuration(task.startedAt, task.completedAt)
            
            return (
            <Card key={task.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-100">{task.description}</h3>
                    {task.status === 'completed' && (
                      <Badge variant="outline" className="bg-green-950/30 text-green-400 border-green-900">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complete
                      </Badge>
                    )}
                    {task.status === 'failed' && (
                      <Badge variant="outline" className="bg-red-950/30 text-red-400 border-red-900">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>Step {task.currentStepIndex + 1} of {task.steps.length}</span>
                    {duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {duration}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    {stats.completed > 0 && (
                      <Badge variant="outline" className="bg-green-950/20 text-green-500 border-green-900 text-xs">
                        ✓ {stats.completed}
                      </Badge>
                    )}
                    {stats.failed > 0 && (
                      <Badge variant="outline" className="bg-red-950/20 text-red-500 border-red-900 text-xs">
                        ✕ {stats.failed}
                      </Badge>
                    )}
                    {stats.pending > 0 && (
                      <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-700 text-xs">
                        ⋯ {stats.pending}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {task.status === 'in_progress' && (
                    <Button size="sm" variant="ghost" onClick={() => pauseTask(task.id)} title="Pause task">
                      <Pause className="w-4 h-4" />
                    </Button>
                  )}
                  {task.status === 'paused' && (
                    <Button size="sm" variant="ghost" onClick={() => startTask(task.id)} title="Resume task">
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  {task.status === 'failed' && (
                    <Button size="sm" variant="ghost" onClick={() => startTask(task.id)} title="Retry task">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                  {(task.status === 'in_progress' || task.status === 'paused') && (
                    <Button size="sm" variant="ghost" onClick={() => cancelTask(task.id)} title="Cancel task">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <Progress value={getProgress(task)} className="mb-3" />

              {/* Steps */}
              <div className="space-y-2">
                {task.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded',
                      index === task.currentStepIndex &&
                        task.status === 'in_progress' &&
                        'bg-violet-950/30'
                    )}
                  >
                    {getStatusIcon(step.status)}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-200">{step.name}</p>
                      <p className="text-xs text-slate-500">{step.description}</p>
                      {step.error && (
                        <p className="text-xs text-red-400 mt-1">Error: {step.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {task.error && (
                <div className="mt-3 p-3 bg-red-950/30 border border-red-900 rounded">
                  <p className="text-sm text-red-400">Task failed: {task.error}</p>
                </div>
              )}
            </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
