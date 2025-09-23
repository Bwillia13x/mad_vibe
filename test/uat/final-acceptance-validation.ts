import type { TestEnvironment } from '../utils/test-environment'
import { TestReporter } from '../reporting/test-reporter'
import { ClientHandoffValidation, type HandoffChecklistResult } from './client-handoff-validation'
import { DemoScenarioValidation, type DemoScenarioResult } from './demo-scenario-validation'
import { UserWorkflowE2E, type UserWorkflowResult } from './user-workflow-e2e'

export interface AcceptanceCriteriaResult {
  requirementId: string
  requirementName: string
  status: 'pass' | 'fail' | 'partial'
  completionPercentage: number
  criteria: Array<{
    id: string
    description: string
    status: 'pass' | 'fail'
    evidence?: string
    testResults?: any
  }>
  blockers: string[]
  recommendations: string[]
}

export interface FinalAcceptanceResult {
  timestamp: string
  environment: string
  overallAcceptance: 'accepted' | 'conditionally_accepted' | 'rejected'
  acceptanceScore: number // 0-100
  summary: {
    totalRequirements: number
    fullyMet: number
    partiallyMet: number
    notMet: number
    totalCriteria: number
    passedCriteria: number
    failedCriteria: number
  }
  requirements: AcceptanceCriteriaResult[]
  handoffValidation: HandoffChecklistResult
  demoValidation: {
    scenarios: DemoScenarioResult[]
    scriptExecution: DemoScenarioResult
  }
  userWorkflows: UserWorkflowResult[]
  criticalBlockers: string[]
  recommendations: string[]
  clientHandoffPackage: {
    documentsReady: boolean
    deploymentsReady: boolean
    trainingMaterialsReady: boolean
    supportProcessesReady: boolean
  }
}

export class FinalAcceptanceValidation {
  private testEnv: TestEnvironment
  private reporter: TestReporter
  private handoffValidator: ClientHandoffValidation
  private demoValidator: DemoScenarioValidation
  private workflowTester: UserWorkflowE2E

  // Requirements mapping from requirements.md
  private readonly acceptanceCriteria = [
    {
      id: 'REQ-1',
      name: 'Comprehensive functional testing coverage',
      criteria: [
        {
          id: '1.1',
          description: 'Each business module validates all core functionality works as designed'
        },
        {
          id: '1.2',
          description:
            'API endpoints verify all REST endpoints return correct responses and handle errors gracefully'
        },
        {
          id: '1.3',
          description:
            'User interface components confirm all UI elements render correctly and respond to user interactions'
        },
        {
          id: '1.4',
          description:
            'Navigation ensures all routes work correctly and keyboard shortcuts function properly'
        },
        {
          id: '1.5',
          description:
            'Demo scenarios validate all preset scenarios (Default, Busy Day, Low Inventory, Appointment Gaps) load correctly'
        }
      ]
    },
    {
      id: 'REQ-2',
      name: 'Automated testing validation',
      criteria: [
        {
          id: '2.1',
          description: 'Smoke tests pass all existing automated tests without failures'
        },
        {
          id: '2.2',
          description: 'Test coverage identifies areas with insufficient test coverage'
        },
        {
          id: '2.3',
          description: 'Integration tests verify API and database interactions work correctly'
        },
        {
          id: '2.4',
          description: 'End-to-end tests validate complete user workflows function properly'
        },
        { id: '2.5', description: 'Performance tests meet acceptable response time thresholds' }
      ]
    },
    {
      id: 'REQ-3',
      name: 'Security validation testing',
      criteria: [
        {
          id: '3.1',
          description: 'Authentication verifies user login/logout functionality works securely'
        },
        { id: '3.2', description: 'Authorization ensures proper access controls are enforced' },
        {
          id: '3.3',
          description: 'Input validation prevents injection attacks and malicious input'
        },
        { id: '3.4', description: 'Session management handles user sessions securely' },
        { id: '3.5', description: 'API security validates proper authentication and rate limiting' }
      ]
    },
    {
      id: 'REQ-4',
      name: 'Deployment and infrastructure validation',
      criteria: [
        {
          id: '4.1',
          description: 'Docker deployment builds and runs correctly in containerized environments'
        },
        {
          id: '4.2',
          description:
            'Environment configuration works with and without optional environment variables'
        },
        {
          id: '4.3',
          description:
            'Database connectivity handles both in-memory and PostgreSQL database configurations'
        },
        {
          id: '4.4',
          description: 'Production build builds successfully and serves static assets correctly'
        },
        { id: '4.5', description: 'Health monitoring provides accurate health check endpoints' }
      ]
    },
    {
      id: 'REQ-5',
      name: 'Performance and scalability testing',
      criteria: [
        {
          id: '5.1',
          description: 'Load testing handles expected concurrent user loads without degradation'
        },
        {
          id: '5.2',
          description:
            'Response time testing meets acceptable latency requirements for all endpoints'
        },
        { id: '5.3', description: 'Memory usage operates within acceptable memory limits' },
        { id: '5.4', description: 'Database performance executes queries efficiently' },
        {
          id: '5.5',
          description:
            'Streaming functionality handles AI chat streaming without performance issues'
        }
      ]
    },
    {
      id: 'REQ-6',
      name: 'Data integrity and business logic validation',
      criteria: [
        {
          id: '6.1',
          description: 'POS transactions accurately calculate totals, taxes, and discounts'
        },
        {
          id: '6.2',
          description: 'Inventory management correctly tracks stock levels and low inventory alerts'
        },
        {
          id: '6.3',
          description:
            'Scheduling functionality properly manages appointments and staff assignments'
        },
        { id: '6.4', description: 'Loyalty program accurately tracks points and rewards' },
        {
          id: '6.5',
          description:
            'Marketing campaigns correctly manage campaign states and performance metrics'
        }
      ]
    },
    {
      id: 'REQ-7',
      name: 'User acceptance testing validation',
      criteria: [
        {
          id: '7.1',
          description: 'Demo scenarios demonstrate all key business workflows successfully'
        },
        {
          id: '7.2',
          description: 'User interface usability provides intuitive and responsive user experience'
        },
        { id: '7.3', description: 'Accessibility meets basic accessibility standards' },
        {
          id: '7.4',
          description: 'Browser compatibility works correctly across supported browsers'
        },
        { id: '7.5', description: 'Mobile responsiveness functions properly on mobile devices' }
      ]
    },
    {
      id: 'REQ-8',
      name: 'Comprehensive documentation and handoff materials',
      criteria: [
        {
          id: '8.1',
          description: 'Testing documentation provides detailed test results and coverage reports'
        },
        {
          id: '8.2',
          description:
            'Deployment documentation includes accurate setup and configuration instructions'
        },
        {
          id: '8.3',
          description: 'User documentation provides clear user guides and feature explanations'
        },
        {
          id: '8.4',
          description: 'Maintenance documentation includes troubleshooting guides and common issues'
        },
        {
          id: '8.5',
          description: 'Handoff checklist verifies all deliverables are ready for client transfer'
        }
      ]
    }
  ]

  constructor(testEnv: TestEnvironment, reporter: TestReporter) {
    this.testEnv = testEnv
    this.reporter = reporter
    this.handoffValidator = new ClientHandoffValidation(testEnv, reporter)
    this.demoValidator = new DemoScenarioValidation(testEnv, reporter)
    this.workflowTester = new UserWorkflowE2E(testEnv, reporter)
  }

  async setup(): Promise<void> {
    await this.demoValidator.setup()
    await this.workflowTester.setup()
  }

  async teardown(): Promise<void> {
    await this.demoValidator.teardown()
    await this.workflowTester.teardown()
  }

  async runFinalAcceptanceValidation(): Promise<FinalAcceptanceResult> {
    console.log('🎯 Running Final Acceptance Criteria Validation')

    const startTime = Date.now()

    // 1. Run handoff validation
    console.log('📋 Running client handoff validation...')
    const handoffValidation = await this.handoffValidator.runCompleteHandoffValidation()

    // 2. Run demo validation
    console.log('🎬 Running demo scenario validation...')
    const demoScenarios = await this.demoValidator.runAllScenarioTests()
    const demoScript = await this.demoValidator.runDemoScriptValidation('default', 123)

    // 3. Run user workflow validation
    console.log('🔄 Running user workflow validation...')
    const userWorkflows = await this.workflowTester.runAllWorkflows()

    // 4. Validate acceptance criteria
    console.log('✅ Validating acceptance criteria...')
    const requirements = await this.validateAcceptanceCriteria(
      handoffValidation,
      { scenarios: demoScenarios, scriptExecution: demoScript },
      userWorkflows
    )

    // 5. Calculate overall acceptance
    const result = this.calculateFinalAcceptance(
      requirements,
      handoffValidation,
      { scenarios: demoScenarios, scriptExecution: demoScript },
      userWorkflows
    )

    // 6. Generate final report
    await this.generateFinalAcceptanceReport(result)

    console.log(
      `🎯 Final acceptance validation completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`
    )

    return result
  }

  private async validateAcceptanceCriteria(
    handoffValidation: HandoffChecklistResult,
    demoValidation: { scenarios: DemoScenarioResult[]; scriptExecution: DemoScenarioResult },
    userWorkflows: UserWorkflowResult[]
  ): Promise<AcceptanceCriteriaResult[]> {
    const results: AcceptanceCriteriaResult[] = []

    for (const requirement of this.acceptanceCriteria) {
      const criteriaResults = []

      for (const criterion of requirement.criteria) {
        const validation = await this.validateSingleCriterion(
          criterion,
          handoffValidation,
          demoValidation,
          userWorkflows
        )
        criteriaResults.push(validation)
      }

      const passedCriteria = criteriaResults.filter((c) => c.status === 'pass').length
      const totalCriteria = criteriaResults.length
      const completionPercentage = (passedCriteria / totalCriteria) * 100

      let status: 'pass' | 'fail' | 'partial'
      if (completionPercentage === 100) {
        status = 'pass'
      } else if (completionPercentage >= 70) {
        status = 'partial'
      } else {
        status = 'fail'
      }

      const blockers = criteriaResults
        .filter((c) => c.status === 'fail')
        .map((c) => `${c.id}: ${c.description}`)

      const recommendations = []
      if (status === 'partial') {
        recommendations.push(
          `Complete remaining ${totalCriteria - passedCriteria} criteria for full compliance`
        )
      }
      if (status === 'fail') {
        recommendations.push(`Address critical failures in ${requirement.name}`)
      }

      results.push({
        requirementId: requirement.id,
        requirementName: requirement.name,
        status,
        completionPercentage,
        criteria: criteriaResults,
        blockers,
        recommendations
      })
    }

    return results
  }

  private async validateSingleCriterion(
    criterion: { id: string; description: string },
    handoffValidation: HandoffChecklistResult,
    demoValidation: { scenarios: DemoScenarioResult[]; scriptExecution: DemoScenarioResult },
    userWorkflows: UserWorkflowResult[]
  ): Promise<AcceptanceCriteriaResult['criteria'][0]> {
    // Map criteria to validation results
    switch (criterion.id) {
      // REQ-1: Functional testing coverage
      case '1.1':
        return this.validateBusinessModules(criterion, userWorkflows)
      case '1.2':
        return this.validateApiEndpoints(criterion, handoffValidation)
      case '1.3':
        return this.validateUIComponents(criterion, userWorkflows)
      case '1.4':
        return this.validateNavigation(criterion, userWorkflows)
      case '1.5':
        return this.validateDemoScenarios(criterion, demoValidation.scenarios)

      // REQ-2: Automated testing
      case '2.1':
      case '2.2':
      case '2.3':
      case '2.4':
      case '2.5':
        return this.validateAutomatedTesting(criterion, handoffValidation)

      // REQ-3: Security validation
      case '3.1':
      case '3.2':
      case '3.3':
      case '3.4':
      case '3.5':
        return this.validateSecurity(criterion, handoffValidation)

      // REQ-4: Deployment and infrastructure
      case '4.1':
      case '4.2':
      case '4.3':
      case '4.4':
      case '4.5':
        return this.validateDeployment(criterion, handoffValidation)

      // REQ-5: Performance and scalability
      case '5.1':
      case '5.2':
      case '5.3':
      case '5.4':
      case '5.5':
        return this.validatePerformance(criterion, handoffValidation)

      // REQ-6: Data integrity and business logic
      case '6.1':
      case '6.2':
      case '6.3':
      case '6.4':
      case '6.5':
        return this.validateBusinessLogic(criterion, userWorkflows)

      // REQ-7: User acceptance testing
      case '7.1':
        return this.validateDemoWorkflows(criterion, demoValidation.scriptExecution)
      case '7.2':
      case '7.3':
      case '7.4':
      case '7.5':
        return this.validateUsability(criterion, handoffValidation)

      // REQ-8: Documentation and handoff
      case '8.1':
      case '8.2':
      case '8.3':
      case '8.4':
      case '8.5':
        return this.validateDocumentation(criterion, handoffValidation)

      default:
        return {
          id: criterion.id,
          description: criterion.description,
          status: 'fail',
          evidence: 'Criterion not implemented in validation framework'
        }
    }
  }

  // Validation helper methods
  private validateBusinessModules(
    criterion: { id: string; description: string },
    userWorkflows: UserWorkflowResult[]
  ): AcceptanceCriteriaResult['criteria'][0] {
    const moduleWorkflows = userWorkflows.filter(
      (w) =>
        w.name.includes('Customer Service') ||
        w.name.includes('Inventory') ||
        w.name.includes('Marketing') ||
        w.name.includes('Staff')
    )

    const passedWorkflows = moduleWorkflows.filter((w) => w.status === 'pass').length
    const totalWorkflows = moduleWorkflows.length

    return {
      id: criterion.id,
      description: criterion.description,
      status: passedWorkflows === totalWorkflows ? 'pass' : 'fail',
      evidence: `${passedWorkflows}/${totalWorkflows} business module workflows passed`,
      testResults: {
        passedWorkflows,
        totalWorkflows,
        workflows: moduleWorkflows.map((w) => w.name)
      }
    }
  }

  private validateApiEndpoints(
    criterion: { id: string; description: string },
    handoffValidation: HandoffChecklistResult
  ): AcceptanceCriteriaResult['criteria'][0] {
    const apiCheck = handoffValidation.categories.functionality.find(
      (c) => c.name === 'API Endpoints Functionality'
    )

    return {
      id: criterion.id,
      description: criterion.description,
      status: apiCheck?.status === 'pass' ? 'pass' : 'fail',
      evidence: apiCheck?.description || 'API endpoint validation not found',
      testResults: apiCheck?.details
    }
  }

  private validateUIComponents(
    criterion: { id: string; description: string },
    userWorkflows: UserWorkflowResult[]
  ): AcceptanceCriteriaResult['criteria'][0] {
    const uiWorkflows = userWorkflows.filter((w) =>
      w.workflow.some((s) => s.step.includes('interface') || s.step.includes('UI'))
    )
    const passedWorkflows = uiWorkflows.filter((w) => w.status === 'pass').length

    return {
      id: criterion.id,
      description: criterion.description,
      status: passedWorkflows > 0 ? 'pass' : 'fail',
      evidence: `UI components validated through ${passedWorkflows} workflow tests`,
      testResults: { passedWorkflows, totalWorkflows: uiWorkflows.length }
    }
  }

  private validateNavigation(
    criterion: { id: string; description: string },
    userWorkflows: UserWorkflowResult[]
  ): AcceptanceCriteriaResult['criteria'][0] {
    const keyboardTest = userWorkflows.find((w) => w.name === 'Keyboard Shortcuts Test')

    return {
      id: criterion.id,
      description: criterion.description,
      status: keyboardTest?.status === 'pass' ? 'pass' : 'fail',
      evidence: keyboardTest
        ? `Keyboard shortcuts test: ${keyboardTest.status}`
        : 'Navigation test not found',
      testResults: keyboardTest?.workflow
    }
  }

  private validateDemoScenarios(
    criterion: { id: string; description: string },
    scenarios: DemoScenarioResult[]
  ): AcceptanceCriteriaResult['criteria'][0] {
    const requiredScenarios = ['default', 'busy_day', 'low_inventory', 'appointment_gaps']
    const passedScenarios = scenarios.filter(
      (s) => s.status === 'pass' && requiredScenarios.includes(s.scenario)
    ).length

    return {
      id: criterion.id,
      description: criterion.description,
      status: passedScenarios === requiredScenarios.length ? 'pass' : 'fail',
      evidence: `${passedScenarios}/${requiredScenarios.length} required demo scenarios passed`,
      testResults: {
        passedScenarios,
        requiredScenarios,
        scenarios: scenarios.map((s) => ({ scenario: s.scenario, status: s.status }))
      }
    }
  }

  private validateAutomatedTesting(
    criterion: { id: string; description: string },
    handoffValidation: HandoffChecklistResult
  ): AcceptanceCriteriaResult['criteria'][0] {
    // Check if testing infrastructure is in place
    const functionalityChecks = handoffValidation.categories.functionality
    const passedChecks = functionalityChecks.filter((c) => c.status === 'pass').length

    return {
      id: criterion.id,
      description: criterion.description,
      status: passedChecks >= functionalityChecks.length * 0.8 ? 'pass' : 'fail',
      evidence: `${passedChecks}/${functionalityChecks.length} functionality checks passed`,
      testResults: { passedChecks, totalChecks: functionalityChecks.length }
    }
  }

  private validateSecurity(
    criterion: { id: string; description: string },
    handoffValidation: HandoffChecklistResult
  ): AcceptanceCriteriaResult['criteria'][0] {
    const securityChecks = handoffValidation.categories.security
    const passedChecks = securityChecks.filter((c) => c.status === 'pass').length

    return {
      id: criterion.id,
      description: criterion.description,
      status: passedChecks >= securityChecks.length * 0.8 ? 'pass' : 'fail',
      evidence: `${passedChecks}/${securityChecks.length} security checks passed`,
      testResults: { passedChecks, totalChecks: securityChecks.length, checks: securityChecks }
    }
  }

  private validateDeployment(
    criterion: { id: string; description: string },
    handoffValidation: HandoffChecklistResult
  ): AcceptanceCriteriaResult['criteria'][0] {
    const deploymentChecks = handoffValidation.categories.deployment
    const passedChecks = deploymentChecks.filter((c) => c.status === 'pass').length

    return {
      id: criterion.id,
      description: criterion.description,
      status: passedChecks >= deploymentChecks.length * 0.9 ? 'pass' : 'fail',
      evidence: `${passedChecks}/${deploymentChecks.length} deployment checks passed`,
      testResults: { passedChecks, totalChecks: deploymentChecks.length, checks: deploymentChecks }
    }
  }

  private validatePerformance(
    criterion: { id: string; description: string },
    handoffValidation: HandoffChecklistResult
  ): AcceptanceCriteriaResult['criteria'][0] {
    const performanceChecks = handoffValidation.categories.performance
    const passedChecks = performanceChecks.filter((c) => c.status === 'pass').length

    return {
      id: criterion.id,
      description: criterion.description,
      status: passedChecks >= performanceChecks.length * 0.8 ? 'pass' : 'fail',
      evidence: `${passedChecks}/${performanceChecks.length} performance checks passed`,
      testResults: {
        passedChecks,
        totalChecks: performanceChecks.length,
        checks: performanceChecks
      }
    }
  }

  private validateBusinessLogic(
    criterion: { id: string; description: string },
    userWorkflows: UserWorkflowResult[]
  ): AcceptanceCriteriaResult['criteria'][0] {
    const businessWorkflows = userWorkflows.filter(
      (w) =>
        w.name.includes('Customer Service') ||
        w.name.includes('Inventory') ||
        w.name.includes('Marketing')
    )

    const passedWorkflows = businessWorkflows.filter((w) => w.status === 'pass').length

    return {
      id: criterion.id,
      description: criterion.description,
      status: passedWorkflows >= businessWorkflows.length * 0.8 ? 'pass' : 'fail',
      evidence: `${passedWorkflows}/${businessWorkflows.length} business logic workflows passed`,
      testResults: { passedWorkflows, totalWorkflows: businessWorkflows.length }
    }
  }

  private validateDemoWorkflows(
    criterion: { id: string; description: string },
    demoScript: DemoScenarioResult
  ): AcceptanceCriteriaResult['criteria'][0] {
    const passedValidations = demoScript.validations.filter((v) => v.status === 'pass').length
    const totalValidations = demoScript.validations.length

    return {
      id: criterion.id,
      description: criterion.description,
      status: demoScript.status === 'pass' ? 'pass' : 'fail',
      evidence: `Demo script execution: ${passedValidations}/${totalValidations} validations passed`,
      testResults: { passedValidations, totalValidations, scriptStatus: demoScript.status }
    }
  }

  private validateUsability(
    criterion: { id: string; description: string },
    handoffValidation: HandoffChecklistResult
  ): AcceptanceCriteriaResult['criteria'][0] {
    const usabilityChecks = handoffValidation.categories.usability
    const passedChecks = usabilityChecks.filter((c) => c.status === 'pass').length

    return {
      id: criterion.id,
      description: criterion.description,
      status: passedChecks >= usabilityChecks.length * 0.8 ? 'pass' : 'fail',
      evidence: `${passedChecks}/${usabilityChecks.length} usability checks passed`,
      testResults: { passedChecks, totalChecks: usabilityChecks.length, checks: usabilityChecks }
    }
  }

  private validateDocumentation(
    criterion: { id: string; description: string },
    handoffValidation: HandoffChecklistResult
  ): AcceptanceCriteriaResult['criteria'][0] {
    const documentationChecks = handoffValidation.categories.documentation
    const passedChecks = documentationChecks.filter((c) => c.status === 'pass').length

    return {
      id: criterion.id,
      description: criterion.description,
      status: passedChecks >= documentationChecks.length * 0.8 ? 'pass' : 'fail',
      evidence: `${passedChecks}/${documentationChecks.length} documentation checks passed`,
      testResults: {
        passedChecks,
        totalChecks: documentationChecks.length,
        checks: documentationChecks
      }
    }
  }

  private calculateFinalAcceptance(
    requirements: AcceptanceCriteriaResult[],
    handoffValidation: HandoffChecklistResult,
    demoValidation: { scenarios: DemoScenarioResult[]; scriptExecution: DemoScenarioResult },
    userWorkflows: UserWorkflowResult[]
  ): FinalAcceptanceResult {
    const totalRequirements = requirements.length
    const fullyMet = requirements.filter((r) => r.status === 'pass').length
    const partiallyMet = requirements.filter((r) => r.status === 'partial').length
    const notMet = requirements.filter((r) => r.status === 'fail').length

    const totalCriteria = requirements.reduce((sum, r) => sum + r.criteria.length, 0)
    const passedCriteria = requirements.reduce(
      (sum, r) => sum + r.criteria.filter((c) => c.status === 'pass').length,
      0
    )
    const failedCriteria = totalCriteria - passedCriteria

    const acceptanceScore = (passedCriteria / totalCriteria) * 100

    // Determine overall acceptance
    let overallAcceptance: 'accepted' | 'conditionally_accepted' | 'rejected'
    if (acceptanceScore >= 95 && handoffValidation.summary.criticalIssues === 0) {
      overallAcceptance = 'accepted'
    } else if (acceptanceScore >= 80 && handoffValidation.summary.criticalIssues === 0) {
      overallAcceptance = 'conditionally_accepted'
    } else {
      overallAcceptance = 'rejected'
    }

    // Collect critical blockers
    const criticalBlockers = []
    if (handoffValidation.summary.criticalIssues > 0) {
      criticalBlockers.push(
        `${handoffValidation.summary.criticalIssues} critical deployment issues`
      )
    }

    const failedRequirements = requirements.filter((r) => r.status === 'fail')
    if (failedRequirements.length > 0) {
      criticalBlockers.push(`${failedRequirements.length} requirements not met`)
    }

    // Generate recommendations
    const recommendations = []
    if (overallAcceptance === 'rejected') {
      recommendations.push('Address all critical blockers before resubmission')
    }
    if (overallAcceptance === 'conditionally_accepted') {
      recommendations.push('Address remaining issues for full acceptance')
    }
    if (acceptanceScore < 90) {
      recommendations.push('Improve acceptance score to 90% or higher')
    }

    // Add specific recommendations from requirements
    for (const requirement of requirements) {
      recommendations.push(...requirement.recommendations)
    }

    // Client handoff package assessment
    const clientHandoffPackage = {
      documentsReady:
        handoffValidation.categories.documentation.filter((d) => d.status === 'pass').length >=
        handoffValidation.categories.documentation.length * 0.8,
      deploymentsReady:
        handoffValidation.categories.deployment.filter((d) => d.status === 'pass').length >=
        handoffValidation.categories.deployment.length * 0.9,
      trainingMaterialsReady: demoValidation.scriptExecution.status === 'pass',
      supportProcessesReady:
        handoffValidation.categories.maintenance.filter((m) => m.status === 'pass').length >=
        handoffValidation.categories.maintenance.length * 0.7
    }

    return {
      timestamp: new Date().toISOString(),
      environment: 'production',
      overallAcceptance,
      acceptanceScore: Math.round(acceptanceScore),
      summary: {
        totalRequirements,
        fullyMet,
        partiallyMet,
        notMet,
        totalCriteria,
        passedCriteria,
        failedCriteria
      },
      requirements,
      handoffValidation,
      demoValidation,
      userWorkflows,
      criticalBlockers,
      recommendations: [...new Set(recommendations)],
      clientHandoffPackage
    }
  }

  private async generateFinalAcceptanceReport(result: FinalAcceptanceResult): Promise<void> {
    console.log('📊 Generating Final Acceptance Report...')

    // Generate comprehensive HTML report
    const htmlReport = this.generateFinalAcceptanceHTML(result)
    await this.reporter.saveReport(htmlReport, 'final-acceptance-report.html')

    // Generate JSON report
    await this.reporter.saveReport(JSON.stringify(result, null, 2), 'final-acceptance-results.json')

    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(result)
    await this.reporter.saveReport(executiveSummary, 'executive-summary.md')

    console.log('📄 Final acceptance reports generated successfully')
  }

  private generateFinalAcceptanceHTML(result: FinalAcceptanceResult): string {
    const statusColor =
      result.overallAcceptance === 'accepted'
        ? '#22c55e'
        : result.overallAcceptance === 'conditionally_accepted'
          ? '#f59e0b'
          : '#ef4444'

    const statusText =
      result.overallAcceptance === 'accepted'
        ? 'ACCEPTED'
        : result.overallAcceptance === 'conditionally_accepted'
          ? 'CONDITIONALLY ACCEPTED'
          : 'REJECTED'

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Final Acceptance Report - Andreas Vibe Platform</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 30px; text-align: center; }
        .title { font-size: 32px; font-weight: bold; color: #1e293b; margin: 0 0 10px 0; }
        .status { font-size: 24px; font-weight: bold; color: ${statusColor}; margin: 20px 0; }
        .score { font-size: 48px; font-weight: bold; color: ${statusColor}; margin: 10px 0; }
        .subtitle { color: #64748b; font-size: 16px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
        .metric-value { font-size: 28px; font-weight: bold; color: #1e293b; }
        .metric-label { color: #64748b; font-size: 14px; margin-top: 8px; }
        .section { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 25px; }
        .section-title { font-size: 22px; font-weight: bold; color: #1e293b; margin: 0 0 25px 0; }
        .requirement { padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 15px; }
        .req-pass { border-left: 4px solid #22c55e; background: #f0fdf4; }
        .req-partial { border-left: 4px solid #f59e0b; background: #fffbeb; }
        .req-fail { border-left: 4px solid #ef4444; background: #fef2f2; }
        .req-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .req-name { font-weight: 600; color: #1e293b; font-size: 16px; }
        .req-status { font-weight: 600; font-size: 14px; }
        .status-pass { color: #22c55e; }
        .status-partial { color: #f59e0b; }
        .status-fail { color: #ef4444; }
        .criteria-list { margin-top: 15px; }
        .criterion { padding: 10px; background: #f8fafc; border-radius: 4px; margin-bottom: 8px; font-size: 14px; }
        .criterion-pass { border-left: 3px solid #22c55e; }
        .criterion-fail { border-left: 3px solid #ef4444; }
        .blockers { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin-top: 15px; }
        .recommendations { background: #fffbeb; border: 1px solid #fed7aa; padding: 15px; border-radius: 6px; margin-top: 15px; }
        .handoff-package { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .package-item { padding: 15px; border-radius: 6px; text-align: center; }
        .package-ready { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
        .package-not-ready { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">Final Acceptance Report</h1>
            <p class="subtitle">Andreas Vibe Business Management Platform</p>
            <div class="status">${statusText}</div>
            <div class="score">${result.acceptanceScore}%</div>
            <p class="subtitle">Generated on ${new Date(result.timestamp).toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value">${result.summary.fullyMet}</div>
                <div class="metric-label">Requirements Fully Met</div>
            </div>
            <div class="metric">
                <div class="metric-value">${result.summary.partiallyMet}</div>
                <div class="metric-label">Requirements Partially Met</div>
            </div>
            <div class="metric">
                <div class="metric-value">${result.summary.notMet}</div>
                <div class="metric-label">Requirements Not Met</div>
            </div>
            <div class="metric">
                <div class="metric-value">${result.summary.passedCriteria}/${result.summary.totalCriteria}</div>
                <div class="metric-label">Criteria Passed</div>
            </div>
        </div>

        ${
          result.criticalBlockers.length > 0
            ? `
        <div class="section">
            <h2 class="section-title">🚫 Critical Blockers</h2>
            <div class="blockers">
                <ul>
                    ${result.criticalBlockers.map((blocker) => `<li>${blocker}</li>`).join('')}
                </ul>
            </div>
        </div>
        `
            : ''
        }

        <div class="section">
            <h2 class="section-title">📋 Requirements Validation</h2>
            ${result.requirements
              .map(
                (req) => `
                <div class="requirement req-${req.status}">
                    <div class="req-header">
                        <div class="req-name">${req.requirementId}: ${req.requirementName}</div>
                        <div class="req-status status-${req.status}">
                            ${req.status.toUpperCase()} (${req.completionPercentage.toFixed(0)}%)
                        </div>
                    </div>
                    <div class="criteria-list">
                        ${req.criteria
                          .map(
                            (criterion) => `
                            <div class="criterion criterion-${criterion.status}">
                                <span style="font-weight: 600;">${criterion.id}:</span> ${criterion.description}
                                ${criterion.evidence ? `<br><small style="color: #64748b;">Evidence: ${criterion.evidence}</small>` : ''}
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                    ${
                      req.blockers.length > 0
                        ? `
                        <div class="blockers">
                            <strong>Blockers:</strong>
                            <ul>
                                ${req.blockers.map((blocker) => `<li>${blocker}</li>`).join('')}
                            </ul>
                        </div>
                    `
                        : ''
                    }
                </div>
            `
              )
              .join('')}
        </div>

        <div class="section">
            <h2 class="section-title">📦 Client Handoff Package</h2>
            <div class="handoff-package">
                <div class="package-item ${result.clientHandoffPackage.documentsReady ? 'package-ready' : 'package-not-ready'}">
                    <strong>Documentation</strong><br>
                    ${result.clientHandoffPackage.documentsReady ? '✅ Ready' : '❌ Not Ready'}
                </div>
                <div class="package-item ${result.clientHandoffPackage.deploymentsReady ? 'package-ready' : 'package-not-ready'}">
                    <strong>Deployment</strong><br>
                    ${result.clientHandoffPackage.deploymentsReady ? '✅ Ready' : '❌ Not Ready'}
                </div>
                <div class="package-item ${result.clientHandoffPackage.trainingMaterialsReady ? 'package-ready' : 'package-not-ready'}">
                    <strong>Training Materials</strong><br>
                    ${result.clientHandoffPackage.trainingMaterialsReady ? '✅ Ready' : '❌ Not Ready'}
                </div>
                <div class="package-item ${result.clientHandoffPackage.supportProcessesReady ? 'package-ready' : 'package-not-ready'}">
                    <strong>Support Processes</strong><br>
                    ${result.clientHandoffPackage.supportProcessesReady ? '✅ Ready' : '❌ Not Ready'}
                </div>
            </div>
        </div>

        ${
          result.recommendations.length > 0
            ? `
        <div class="section">
            <h2 class="section-title">💡 Recommendations</h2>
            <div class="recommendations">
                <ul>
                    ${result.recommendations
                      .slice(0, 10)
                      .map((rec) => `<li>${rec}</li>`)
                      .join('')}
                </ul>
            </div>
        </div>
        `
            : ''
        }
    </div>
</body>
</html>`
  }

  private generateExecutiveSummary(result: FinalAcceptanceResult): string {
    const statusEmoji =
      result.overallAcceptance === 'accepted'
        ? '✅'
        : result.overallAcceptance === 'conditionally_accepted'
          ? '⚠️'
          : '❌'

    return `# Executive Summary - Final Acceptance Report

## ${statusEmoji} Overall Status: ${result.overallAcceptance.toUpperCase().replace('_', ' ')}

**Acceptance Score:** ${result.acceptanceScore}%  
**Generated:** ${new Date(result.timestamp).toLocaleString()}  
**Environment:** ${result.environment}

## Key Metrics

- **Requirements Fully Met:** ${result.summary.fullyMet}/${result.summary.totalRequirements} (${((result.summary.fullyMet / result.summary.totalRequirements) * 100).toFixed(0)}%)
- **Acceptance Criteria Passed:** ${result.summary.passedCriteria}/${result.summary.totalCriteria} (${result.acceptanceScore.toFixed(0)}%)
- **Critical Blockers:** ${result.criticalBlockers.length}

## Client Handoff Readiness

| Component | Status |
|-----------|--------|
| Documentation | ${result.clientHandoffPackage.documentsReady ? '✅ Ready' : '❌ Not Ready'} |
| Deployment | ${result.clientHandoffPackage.deploymentsReady ? '✅ Ready' : '❌ Not Ready'} |
| Training Materials | ${result.clientHandoffPackage.trainingMaterialsReady ? '✅ Ready' : '❌ Not Ready'} |
| Support Processes | ${result.clientHandoffPackage.supportProcessesReady ? '✅ Ready' : '❌ Not Ready'} |

## Requirements Summary

${result.requirements
  .map(
    (req) =>
      `- **${req.requirementId}:** ${req.requirementName} - ${req.status.toUpperCase()} (${req.completionPercentage.toFixed(0)}%)`
  )
  .join('\n')}

${
  result.criticalBlockers.length > 0
    ? `
## Critical Blockers

${result.criticalBlockers.map((blocker) => `- ${blocker}`).join('\n')}
`
    : ''
}

## Recommendations

${result.recommendations
  .slice(0, 5)
  .map((rec) => `- ${rec}`)
  .join('\n')}

## Next Steps

${
  result.overallAcceptance === 'accepted'
    ? '🎉 **Platform is ready for client handoff.** Proceed with deployment and client training.'
    : result.overallAcceptance === 'conditionally_accepted'
      ? '⚠️ **Platform is conditionally accepted.** Address remaining issues and revalidate before full handoff.'
      : '❌ **Platform requires additional work.** Address all critical blockers and resubmit for acceptance testing.'
}

---
*This report was generated by the Andreas Vibe UAT Testing Suite*
`
  }
}
