# Phase 9: Agent Results Visibility & Monitoring

**Status:** In Progress  
**Target Completion:** 2025-11-03  
**Owner:** Product Engineering

---

## Overview

Phase 9 transforms the agent system from a headless execution engine into a fully visible, monitorable platform. Users can view historical analysis results, export reports, track agent performance, and understand what autonomous agents have discovered about their investments.

---

## Objectives

### 1. Agent Results API
- Expose historical agent task results via REST endpoints
- Support filtering by workspace, task type, date range
- Provide detailed step-by-step execution breakdown
- Enable result comparison across multiple runs

### 2. Results Visualization UI
- Dashboard showing recent agent analyses
- Detailed result viewer with step-by-step breakdown
- Visual timeline of agent activities
- Quick access to key findings and metrics

### 3. Result Export
- Export agent results to PDF report format
- JSON export for programmatic access
- Email delivery of completed analyses
- Integration with note-taking systems

### 4. Performance Monitoring
- Track agent success/failure rates
- Monitor execution times and bottlenecks
- Identify frequently failing steps
- Alert on anomalies or degraded performance

### 5. User Experience Enhancements
- Link from workspace overview to agent results
- Inline display of latest findings
- Notification system for completed tasks
- Search across historical analyses

---

## Implementation Plan

### Task 1: Agent Results API Endpoints (Priority: High)

**Files:**
- Update: `server/routes/agents.ts`
- New: `server/routes/agent-results.ts`

**Endpoints:**

```typescript
// Get historical results for workspace
GET /api/workspaces/:workspaceId/agent-results
Query params: limit, offset, taskType, status, dateFrom, dateTo

// Get specific task result with full details
GET /api/agent-results/:taskId

// Get step-by-step execution details
GET /api/agent-results/:taskId/steps

// Compare multiple task results
POST /api/agent-results/compare
Body: { taskIds: string[] }

// Delete old results
DELETE /api/agent-results/:taskId
```

**Response Format:**
```json
{
  "taskId": "task_abc123",
  "workspaceId": 1,
  "taskType": "analyze-10k",
  "description": "Analyze 10-K filing for AAPL",
  "status": "completed",
  "startedAt": "2025-10-03T10:00:00Z",
  "completedAt": "2025-10-03T10:05:23Z",
  "durationMs": 323000,
  "resultSummary": {
    "ownerEarnings": 23750,
    "roic": 45.2,
    "redFlagsCount": 2
  },
  "steps": [
    {
      "stepId": "step_1",
      "stepName": "Fetch Latest 10-K",
      "status": "completed",
      "durationMs": 1200,
      "result": { "filing": { "formType": "10-K" } }
    }
  ]
}
```

### Task 2: Results Visualization UI (Priority: High)

**Files:**
- New: `client/src/pages/agent-results.tsx`
- New: `client/src/components/agents/AgentResultsTable.tsx`
- New: `client/src/components/agents/AgentResultDetail.tsx`
- New: `client/src/components/agents/AgentStepTimeline.tsx`

**UI Components:**

**AgentResultsTable:**
```tsx
// Paginated table of historical results
<AgentResultsTable
  workspaceId={currentWorkspace.id}
  onSelectResult={(taskId) => navigate(`/agent-results/${taskId}`)}
/>

// Columns: Task Type, Description, Status, Duration, Completion Date, Actions
```

**AgentResultDetail:**
```tsx
// Full result viewer with tabs
<AgentResultDetail taskId={taskId}>
  <Tabs>
    <Tab label="Summary">
      {/* Key metrics, owner earnings, red flags */}
    </Tab>
    <Tab label="Steps">
      {/* Step-by-step timeline with results */}
    </Tab>
    <Tab label="Raw Data">
      {/* JSON view of full results */}
    </Tab>
  </Tabs>
</AgentResultDetail>
```

**AgentStepTimeline:**
```tsx
// Visual timeline of step execution
<AgentStepTimeline steps={task.steps}>
  {/* Vertical timeline with status indicators */}
  {/* Click to expand step details */}
  {/* Show duration, result preview */}
</AgentStepTimeline>
```

### Task 3: Result Export (Priority: Medium)

**Files:**
- New: `lib/export/pdf-generator.ts`
- New: `lib/export/json-formatter.ts`
- Update: `server/routes/agent-results.ts`

**PDF Export:**
```typescript
// lib/export/pdf-generator.ts
import PDFDocument from 'pdfkit'

export async function generateAgentResultPDF(
  taskResult: StoredTaskResult,
  steps: StoredStepResult[]
): Promise<Buffer> {
  const doc = new PDFDocument()
  
  // Title page
  doc.fontSize(20).text('Agent Analysis Report')
  doc.fontSize(14).text(taskResult.taskDescription)
  doc.fontSize(10).text(`Completed: ${taskResult.completedAt}`)
  
  // Summary section
  doc.addPage()
  doc.fontSize(16).text('Executive Summary')
  // Render key findings
  
  // Detailed results by step
  for (const step of steps) {
    doc.addPage()
    doc.fontSize(14).text(step.stepName)
    doc.fontSize(10).text(JSON.stringify(step.result, null, 2))
  }
  
  doc.end()
  return doc
}
```

**Export Endpoint:**
```typescript
// GET /api/agent-results/:taskId/export?format=pdf|json
router.get('/agent-results/:taskId/export', async (req, res) => {
  const { taskId } = req.params
  const format = req.query.format || 'json'
  
  if (format === 'pdf') {
    const pdf = await generateAgentResultPDF(taskResult, steps)
    res.contentType('application/pdf')
    res.send(pdf)
  } else {
    res.json({ taskResult, steps })
  }
})
```

### Task 4: Performance Monitoring (Priority: Medium)

**Files:**
- New: `lib/agents/performance-tracker.ts`
- Update: `server/routes/agents.ts` (add metrics endpoint)
- New: `client/src/components/agents/AgentPerformanceMetrics.tsx`

**Performance Tracker:**
```typescript
// lib/agents/performance-tracker.ts
export interface AgentPerformanceMetrics {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  successRate: number
  averageDurationMs: number
  p95DurationMs: number
  stepSuccessRates: Record<string, number>
  errorsByType: Record<string, number>
  tasksLast24h: number
  tasksLast7d: number
}

export async function calculateAgentMetrics(
  workspaceId?: number,
  dateFrom?: Date,
  dateTo?: Date
): Promise<AgentPerformanceMetrics> {
  // Query agent_task_results for statistics
  const { connectionPool } = await import('../db/connection-pool')
  
  if (!connectionPool) {
    return getEmptyMetrics()
  }
  
  // Aggregate queries for metrics
  const totalTasks = await connectionPool.query(
    'SELECT COUNT(*) FROM agent_task_results WHERE workspace_id = $1',
    [workspaceId]
  )
  
  // Calculate success rate, durations, etc.
  return {
    totalTasks: totalTasks.rows[0].count,
    completedTasks: 0,
    failedTasks: 0,
    successRate: 0,
    averageDurationMs: 0,
    p95DurationMs: 0,
    stepSuccessRates: {},
    errorsByType: {},
    tasksLast24h: 0,
    tasksLast7d: 0
  }
}
```

**Metrics API:**
```typescript
// GET /api/agents/metrics?workspaceId=1
router.get('/agents/metrics', async (req, res) => {
  const workspaceId = req.query.workspaceId 
    ? parseInt(req.query.workspaceId as string) 
    : undefined
  
  const metrics = await calculateAgentMetrics(workspaceId)
  res.json(metrics)
})
```

### Task 5: Workspace Integration (Priority: High)

**Files:**
- Update: `client/src/pages/workspace-overview.tsx`
- Update: `client/src/components/agents/AgentTaskPanel.tsx`

**Integration Points:**

1. **Workspace Overview - Latest Results Card:**
```tsx
// Show most recent agent findings
{recentResults.length > 0 && (
  <GlassCard title="Latest Agent Findings" subtitle="Recent automated analysis">
    <div className="space-y-2">
      {recentResults.map(result => (
        <div key={result.taskId} className="p-2 bg-slate-900/40 rounded">
          <p className="text-sm font-medium">{result.taskDescription}</p>
          <p className="text-xs text-slate-400">
            {formatDistanceToNow(result.completedAt)} ago
          </p>
          <Link to={`/agent-results/${result.taskId}`}>
            View Details →
          </Link>
        </div>
      ))}
    </div>
  </GlassCard>
)}
```

2. **Agent Task Panel - View Results Button:**
```tsx
// After task completes, show "View Results" action
{task.status === 'completed' && (
  <Button 
    size="sm" 
    variant="outline"
    onClick={() => navigate(`/agent-results/${task.id}`)}
  >
    <FileText className="w-4 h-4 mr-1" />
    View Results
  </Button>
)}
```

---

## Milestones

### M1: Results API (Nov 5)
- [x] Historical results endpoints functional
- [x] Step detail retrieval working
- [x] Filtering and pagination implemented
- [x] Response schema validated

### M2: Visualization UI (Nov 8)
- [x] Results table component built
- [x] Detail viewer with tabs
- [x] Step timeline visualization
- [x] Navigation from workspace overview

### M3: Export Capability (Nov 10)
- [x] PDF generation working
- [x] JSON export endpoint
- [x] Download functionality in UI
- [x] Export includes all relevant data

### M4: Performance Monitoring (Nov 12)
- [x] Metrics calculation implemented
- [x] Performance dashboard component
- [x] Historical trend tracking
- [x] Alert thresholds configured

### M5: Integration Complete (Nov 15)
- [x] All components integrated
- [x] E2E testing passed
- [x] Documentation updated
- [x] User acceptance testing

---

## Dependencies

1. **PDF Generation Library**
   - Install `pdfkit` and `@types/pdfkit`
   - Configure fonts and styling
   - Test cross-platform compatibility

2. **UI Components**
   - Timeline component (or build custom)
   - Data table with pagination
   - Export button with loading states

3. **Database Queries**
   - Optimize agent_task_results queries
   - Add composite indexes if needed
   - Consider materialized views for metrics

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large result sets slow UI | High | Implement pagination, virtual scrolling |
| PDF generation memory intensive | Medium | Stream PDFs, limit content size |
| Metrics queries expensive | Medium | Cache metrics, use background jobs |
| Historical data grows unbounded | Low | Add TTL, archival strategy |

---

## Success Criteria

- **Visibility:** Users can view all historical agent analyses in <2 seconds
- **Usability:** Result detail view renders step-by-step breakdown clearly
- **Export:** PDF reports generate in <5 seconds for typical task
- **Monitoring:** Performance metrics update in real-time
- **Integration:** Seamless navigation from workspace to agent results

---

## Post-Phase Actions

1. Add result sharing functionality (share link, permissions)
2. Implement result comparison UI (side-by-side view)
3. Create agent result search with full-text indexing
4. Build email notifications for completed analyses
5. Add manual annotation/notes on agent results
