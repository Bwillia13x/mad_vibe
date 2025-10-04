/**
 * Agent Orchestrator
 * Manages autonomous multi-step workflows for investment analysis
 *
 * Capabilities:
 * - "Analyze this 10-K" → Auto-populate stages
 * - Multi-step task planning and execution
 * - Background research automation
 * - Progress tracking and user oversight
 */

import { EventEmitter } from 'events'

export type AgentTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused'

export interface AgentTask {
  id: string
  workspaceId: number
  type: AgentTaskType
  description: string
  status: AgentTaskStatus
  steps: AgentStep[]
  currentStepIndex: number
  startedAt: Date | null
  completedAt: Date | null
  error: string | null
  result: Record<string, unknown> | null
  telemetry: TaskTelemetry
}

export interface TaskTelemetry {
  taskDurationMs: number | null
  stepRetries: Record<string, number>
  errorTags: string[]
  lastHeartbeat: Date | null
}

export interface AgentStep {
  id: string
  name: string
  description: string
  status: AgentTaskStatus
  action: string
  params: Record<string, unknown>
  result: unknown | null
  error: string | null
  startedAt: Date | null
  completedAt: Date | null
  retryCount: number
  durationMs: number | null
}

export type AgentTaskType =
  | 'analyze-10k' // Full 10-K analysis workflow
  | 'build-dcf-model' // DCF model construction
  | 'competitive-analysis' // Compare competitors
  | 'thesis-validation' // Validate investment thesis
  | 'risk-assessment' // Identify and analyze risks
  | 'quarterly-update' // Process earnings update

/**
 * Agent Orchestrator
 * Coordinates autonomous task execution
 */
export class AgentOrchestrator extends EventEmitter {
  private tasks: Map<string, AgentTask> = new Map()
  private running = false

  /**
   * Create a new autonomous task
   */
  async createTask(
    workspaceId: number,
    type: AgentTaskType,
    params: Record<string, unknown> = {}
  ): Promise<AgentTask> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const steps = this.planSteps(type, params)

    const task: AgentTask = {
      id: taskId,
      workspaceId,
      type,
      description: this.getTaskDescription(type, params),
      status: 'pending',
      steps,
      currentStepIndex: 0,
      startedAt: null,
      completedAt: null,
      error: null,
      result: null,
      telemetry: {
        taskDurationMs: null,
        stepRetries: {},
        errorTags: [],
        lastHeartbeat: new Date()
      }
    }

    this.tasks.set(taskId, task)
    this.emit('task:created', task)

    return task
  }

  /**
   * Start task execution
   */
  async startTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    if (task.status !== 'pending' && task.status !== 'paused') {
      throw new Error(`Task ${taskId} is already ${task.status}`)
    }

    task.status = 'in_progress'
    task.startedAt = new Date()
    this.emit('task:started', task)

    // Execute steps sequentially
    try {
      await this.executeSteps(task)

      task.status = 'completed'
      task.completedAt = new Date()

      // Calculate total duration
      if (task.startedAt) {
        task.telemetry.taskDurationMs = task.completedAt.getTime() - task.startedAt.getTime()
      }

      // Persist results to database
      await this.persistTaskResults(task)

      this.emit('task:completed', task)
    } catch (error) {
      task.status = 'failed'
      task.error = error instanceof Error ? error.message : String(error)

      // Record failure duration
      if (task.startedAt) {
        task.telemetry.taskDurationMs = Date.now() - task.startedAt.getTime()
      }

      // Persist failed task results
      await this.persistTaskResults(task)

      this.emit('task:failed', task)
    }
  }

  /**
   * Persist task results to database
   */
  private async persistTaskResults(task: AgentTask): Promise<void> {
    try {
      const { saveAgentTaskResult } = await import('./result-persistence')
      await saveAgentTaskResult(task)
    } catch (error) {
      console.error('Failed to persist task results:', error)
      // Don't throw - persistence failure shouldn't break task execution
    }
  }

  /**
   * Pause task execution
   */
  pauseTask(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    if (task.status === 'in_progress') {
      task.status = 'paused'
      this.emit('task:paused', task)
    }
  }

  /**
   * Cancel task
   */
  cancelTask(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    task.status = 'failed'
    task.error = 'Cancelled by user'
    this.emit('task:cancelled', task)
  }

  /**
   * Get task status
   */
  getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * Get all tasks for workspace
   */
  getWorkspaceTasks(workspaceId: number): AgentTask[] {
    return Array.from(this.tasks.values()).filter((task) => task.workspaceId === workspaceId)
  }

  /**
   * Helper to create step with telemetry fields
   */
  private createStep(
    id: string,
    name: string,
    description: string,
    action: string,
    params: Record<string, unknown> = {}
  ): AgentStep {
    return {
      id,
      name,
      description,
      status: 'pending',
      action,
      params,
      result: null,
      error: null,
      startedAt: null,
      completedAt: null,
      retryCount: 0,
      durationMs: null
    }
  }

  /**
   * Plan steps for a task type
   */
  private planSteps(type: AgentTaskType, params: Record<string, unknown>): AgentStep[] {
    const planners: Record<AgentTaskType, () => AgentStep[]> = {
      'analyze-10k': () => this.planAnalyze10K(params),
      'build-dcf-model': () => this.planBuildDCF(params),
      'competitive-analysis': () => this.planCompetitiveAnalysis(params),
      'thesis-validation': () => this.planThesisValidation(params),
      'risk-assessment': () => this.planRiskAssessment(params),
      'quarterly-update': () => this.planQuarterlyUpdate(params)
    }

    return planners[type]()
  }

  /**
   * Plan: Analyze 10-K workflow
   */
  private planAnalyze10K(params: Record<string, unknown>): AgentStep[] {
    const ticker = params.ticker as string

    return [
      this.createStep(
        'step_1',
        'Fetch Latest 10-K',
        `Download latest 10-K filing for ${ticker}`,
        'fetch_filing',
        { ticker, formType: '10-K' }
      ),
      this.createStep(
        'step_2',
        'Extract Financial Data',
        'Parse income statement, balance sheet, cash flows',
        'extract_financials',
        { sections: ['income_statement', 'balance_sheet', 'cash_flow'] }
      ),
      this.createStep(
        'step_3',
        'Calculate Owner Earnings',
        'Build owner earnings bridge with adjustments',
        'calculate_owner_earnings'
      ),
      this.createStep(
        'step_4',
        'Identify Key Metrics',
        'Calculate ROIC, FCF yield, margins',
        'calculate_metrics',
        { metrics: ['roic', 'fcf_yield', 'margins', 'growth_rates'] }
      ),
      this.createStep(
        'step_5',
        'Extract MD&A Insights',
        'Summarize management discussion and analysis',
        'extract_mda'
      ),
      this.createStep(
        'step_6',
        'Flag Red Flags',
        'Identify accounting concerns and risks',
        'identify_red_flags',
        { categories: ['accounting', 'governance', 'operations'] }
      ),
      this.createStep(
        'step_7',
        'Generate Summary',
        'Create comprehensive analysis summary',
        'generate_summary'
      )
    ]
  }

  /**
   * Plan: Build DCF model workflow
   */
  private planBuildDCF(_params: Record<string, unknown>): AgentStep[] {
    return [
      this.createStep(
        'step_1',
        'Load Historical Financials',
        'Gather 5 years of financial data',
        'load_financials',
        { years: 5 }
      ),
      this.createStep(
        'step_2',
        'Project Revenue',
        'Forecast revenue growth for 10 years',
        'project_revenue',
        { years: 10 }
      ),
      this.createStep(
        'step_3',
        'Project Margins',
        'Forecast operating and profit margins',
        'project_margins'
      ),
      this.createStep(
        'step_4',
        'Calculate WACC',
        'Determine weighted average cost of capital',
        'calculate_wacc'
      ),
      this.createStep(
        'step_5',
        'Calculate Terminal Value',
        'Determine terminal value using perpetuity growth',
        'calculate_terminal_value',
        { method: 'perpetuity_growth' }
      ),
      this.createStep(
        'step_6',
        'Discount Cash Flows',
        'Calculate present value of FCF and terminal value',
        'discount_cash_flows'
      ),
      this.createStep(
        'step_7',
        'Run Sensitivity Analysis',
        'Test valuation across WACC and growth assumptions',
        'sensitivity_analysis'
      )
    ]
  }

  /**
   * Plan: Competitive analysis workflow
   */
  private planCompetitiveAnalysis(params: Record<string, unknown>): AgentStep[] {
    const competitors = (params.competitors as string[]) || []

    return [
      this.createStep(
        'step_1',
        'Identify Competitors',
        'Find top 5 competitors in same industry',
        'identify_competitors',
        { count: 5 }
      ),
      this.createStep(
        'step_2',
        'Fetch Competitor Data',
        `Load financial data for ${competitors.length || 5} competitors`,
        'fetch_competitor_data',
        { competitors }
      ),
      this.createStep(
        'step_3',
        'Compare Metrics',
        'Compare ROIC, margins, growth rates',
        'compare_metrics',
        { metrics: ['roic', 'margins', 'growth', 'valuation'] }
      ),
      this.createStep(
        'step_4',
        'Analyze Competitive Position',
        'Assess competitive advantages and disadvantages',
        'analyze_position'
      ),
      this.createStep(
        'step_5',
        'Generate Report',
        'Create competitive analysis report',
        'generate_report'
      )
    ]
  }

  /**
   * Plan: Thesis validation workflow
   */
  private planThesisValidation(_params: Record<string, unknown>): AgentStep[] {
    return [
      this.createStep(
        'step_1',
        'Extract Current Thesis',
        'Load investment thesis from workspace',
        'extract_thesis'
      ),
      this.createStep(
        'step_2',
        'Gather Evidence',
        'Collect supporting and contradicting data',
        'gather_evidence'
      ),
      this.createStep(
        'step_3',
        'Challenge Assumptions',
        'Test key assumptions with data',
        'challenge_assumptions'
      ),
      this.createStep(
        'step_4',
        'Identify Weak Points',
        'Find vulnerabilities in thesis',
        'identify_weak_points'
      ),
      this.createStep(
        'step_5',
        'Generate Validation Report',
        'Create thesis strength assessment',
        'generate_validation'
      )
    ]
  }

  /**
   * Plan: Risk assessment workflow
   */
  private planRiskAssessment(_params: Record<string, unknown>): AgentStep[] {
    return [
      this.createStep(
        'step_1',
        'Identify Risk Categories',
        'Categorize operational, financial, market risks',
        'categorize_risks'
      ),
      this.createStep(
        'step_2',
        'Assess Probability',
        'Estimate likelihood of each risk',
        'assess_probability'
      ),
      this.createStep(
        'step_3',
        'Calculate Impact',
        'Quantify potential impact on value',
        'calculate_impact'
      ),
      this.createStep(
        'step_4',
        'Prioritize Risks',
        'Rank risks by probability × impact',
        'prioritize_risks'
      )
    ]
  }

  /**
   * Plan: Quarterly update workflow
   */
  private planQuarterlyUpdate(_params: Record<string, unknown>): AgentStep[] {
    return [
      this.createStep(
        'step_1',
        'Fetch Latest 10-Q',
        'Download most recent quarterly filing',
        'fetch_filing',
        { formType: '10-Q' }
      ),
      this.createStep(
        'step_2',
        'Compare to Expectations',
        'Check results vs guidance and estimates',
        'compare_expectations'
      ),
      this.createStep(
        'step_3',
        'Update Financial Model',
        'Revise projections based on actuals',
        'update_model'
      ),
      this.createStep(
        'step_4',
        'Reassess Thesis',
        'Determine if thesis still valid',
        'reassess_thesis'
      ),
      this.createStep(
        'step_5',
        'Generate Update Report',
        'Create quarterly update summary',
        'generate_update'
      )
    ]
  }

  /**
   * Execute task steps sequentially
   */
  private async executeSteps(task: AgentTask): Promise<void> {
    for (let i = task.currentStepIndex; i < task.steps.length; i++) {
      // Check if task is paused
      if (task.status === 'paused') {
        break
      }

      const step = task.steps[i]
      task.currentStepIndex = i

      await this.executeStep(task, step)

      // Check if step failed
      if (step.status === 'failed') {
        throw new Error(`Step ${step.name} failed: ${step.error}`)
      }
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(task: AgentTask, step: AgentStep): Promise<void> {
    step.status = 'in_progress'
    step.startedAt = new Date()
    const stepStartTime = Date.now()
    this.emit('step:started', { task, step })

    // Update telemetry heartbeat
    task.telemetry.lastHeartbeat = new Date()

    try {
      // Import executor dynamically
      const { executeAgentStep } = await import('./executor')

      // Build context from previous results
      const previousResults: Record<string, unknown> = {}
      for (let i = 0; i < task.currentStepIndex; i++) {
        const prevStep = task.steps[i]
        if (prevStep.result) {
          // Store result with a key based on step action
          const resultKey = prevStep.action.replace('_', '')
          previousResults[resultKey] = prevStep.result
        }
      }

      // Get workspace info
      const { db } = await import('../../lib/db/index')
      const { workflows } = await import('../../lib/db/schema')
      const { eq } = await import('drizzle-orm')

      let ticker: string | undefined = undefined
      if (db) {
        const results = await db
          .select()
          .from(workflows)
          .where(eq(workflows.id, task.workspaceId))
          .limit(1)
        const workspace = results[0]
        ticker = workspace?.ticker ?? undefined
      }

      // Execute actual step logic
      const result = await executeAgentStep(step, {
        workspaceId: task.workspaceId,
        ticker,
        previousResults
      })

      step.result = result
      step.status = 'completed'
      step.completedAt = new Date()
      step.durationMs = Date.now() - stepStartTime
      this.emit('step:completed', { task, step })
    } catch (error) {
      step.status = 'failed'
      step.error = error instanceof Error ? error.message : String(error)
      step.durationMs = Date.now() - stepStartTime

      // Track retry
      step.retryCount += 1
      task.telemetry.stepRetries[step.id] = step.retryCount

      // Tag error
      const errorTag = `step_${step.action}_failed`
      if (!task.telemetry.errorTags.includes(errorTag)) {
        task.telemetry.errorTags.push(errorTag)
      }

      this.emit('step:failed', { task, step })
      throw error
    }
  }

  /**
   * Get task description
   */
  private getTaskDescription(type: AgentTaskType, params: Record<string, unknown>): string {
    const descriptions: Record<AgentTaskType, string> = {
      'analyze-10k': `Analyze 10-K filing for ${params.ticker || 'company'}`,
      'build-dcf-model': `Build DCF valuation model`,
      'competitive-analysis': `Analyze competitive position`,
      'thesis-validation': `Validate investment thesis`,
      'risk-assessment': `Assess investment risks`,
      'quarterly-update': `Process quarterly earnings update`
    }

    return descriptions[type]
  }

  /**
   * Utility: delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const agentOrchestrator = new AgentOrchestrator()
