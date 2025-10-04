# Phase 7: Production Hardening & Scale Testing

**Status:** Planning  
**Target Completion:** 2025-10-18  
**Owner:** Platform Engineering

---

## Overview

Phase 7 focuses on production readiness through database optimization, connection pool tuning, error resilience, load testing, and caching infrastructure. This phase ensures the platform can handle concurrent users, long-running agent tasks, and sustained traffic without degradation.

---

## Objectives

### 1. Database Optimization

- Add performance indexes on high-traffic tables
- Analyze query plans and optimize N+1 queries
- Implement query result caching for expensive operations

### 2. Connection Pool Hardening

- Tune pool parameters for production workload
- Add connection exhaustion monitoring
- Implement graceful degradation on pool saturation

### 3. Error Boundaries & Resilience

- Wrap React components with error boundaries
- Add client-side error tracking
- Implement graceful fallbacks for API failures

### 4. Load & Performance Testing

- Simulate 50+ concurrent agent tasks
- Measure p95/p99 latencies under load
- Identify memory leaks and resource bottlenecks

### 5. Caching Layer

- Deploy Redis for workspace snapshots
- Cache agent task state to reduce DB load
- Implement cache invalidation strategy

---

## Implementation Plan

### Task 1: Database Indexes (Priority: High)

**Files:**

- New migration: `migrations/0002_performance_indexes.sql`
- Schema documentation: `docs/DATABASE_INDEXES.md`

**Indexes to Add:**

```sql
-- ai_audit_logs: frequently queried by workspace + timestamp
CREATE INDEX idx_ai_audit_logs_workspace_time
ON ai_audit_logs(workspace_id, created_at DESC);

-- market_snapshots: queried by ticker + date
CREATE INDEX idx_market_snapshots_ticker_date
ON market_snapshots(ticker, snapshot_date DESC);

-- workspace_data_snapshots: queried by workspace + type
CREATE INDEX idx_workspace_snapshots_workspace_type
ON workspace_data_snapshots(workspace_id, snapshot_type, created_at DESC);

-- workflows: queried by userId + lastAccessedAt for sorting
CREATE INDEX idx_workflows_user_accessed
ON workflows(user_id, last_accessed_at DESC);
```

**Validation:**

- Run `EXPLAIN ANALYZE` on critical queries before/after
- Measure query time improvement (target: >50% reduction)
- Monitor index usage with `pg_stat_user_indexes`

### Task 2: Connection Pool Tuning (Priority: High)

**Files:**

- `lib/db/connection-pool.ts`
- New: `lib/db/pool-health-check.ts`
- `server/routes/health.ts` (extend with pool metrics)

**Configuration Changes:**

```typescript
// lib/db/connection-pool.ts
{
  max: process.env.NODE_ENV === 'production' ? 20 : 10,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Add event handlers
  onPoolCreate: () => logPoolEvent('pool_created'),
  onClientCreate: () => logPoolEvent('client_created'),
  onClientCheckout: () => logPoolEvent('client_checkout'),
  onClientRelease: () => logPoolEvent('client_release'),
}
```

**Health Check Endpoint:**

```typescript
// GET /api/health/pool
{
  totalCount: 20,
  idleCount: 15,
  waitingCount: 0,
  status: 'healthy' | 'degraded' | 'critical'
}
```

### Task 3: React Error Boundaries (Priority: Medium)

**Files:**

- New: `client/src/components/error/ErrorBoundary.tsx`
- New: `client/src/components/error/AgentErrorBoundary.tsx`
- Update: `client/src/pages/workspace-overview.tsx`
- Update: `client/src/components/agents/AgentTaskPanel.tsx`

**Implementation:**

```tsx
// client/src/components/error/ErrorBoundary.tsx
import { Component, ReactNode } from 'react'
import { GlassCard } from '@/components/layout/GlassCard'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    this.props.onError?.(error, errorInfo)

    // Send to error tracking service (Sentry, etc.)
    if (window.errorTracker) {
      window.errorTracker.captureException(error, {
        errorInfo,
        componentStack: errorInfo.componentStack
      })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <GlassCard title="Something went wrong" className="border-red-900/50">
            <p className="text-sm text-slate-400 mb-2">
              We encountered an error loading this component.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="text-violet-400 hover:text-violet-300 text-sm"
            >
              Try again
            </button>
          </GlassCard>
        )
      )
    }

    return this.props.children
  }
}
```

**Usage:**

```tsx
// Wrap agent components
<ErrorBoundary fallback={<AgentErrorFallback />}>
  <AgentTaskPanel />
</ErrorBoundary>
```

### Task 4: Load Testing Suite (Priority: High)

**Files:**

- New: `test/performance/agent-load.test.ts`
- New: `test/performance/workspace-load.test.ts`
- New: `scripts/run-load-tests.ts`

**Test Scenarios:**

1. **Concurrent Agent Task Creation**
   - Spawn 50 agent tasks simultaneously
   - Measure task creation latency (target: <500ms p95)
   - Verify no task failures or database deadlocks

2. **Workspace Data Fetching**
   - 100 concurrent workspace overview requests
   - Measure response time (target: <800ms p95)
   - Check for connection pool exhaustion

3. **SSE Stream Stability**
   - Open 20 concurrent SSE connections
   - Maintain for 5 minutes
   - Verify no memory leaks or dropped connections

**Implementation:**

```typescript
// test/performance/agent-load.test.ts
import { describe, it, expect } from 'vitest'

describe('Agent task load testing', () => {
  it('handles 50 concurrent task creations', async () => {
    const startTime = Date.now()
    const tasks = Array.from({ length: 50 }, (_, i) =>
      fetch('/api/agents/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: 1,
          type: 'thesis-validation',
          params: {}
        })
      })
    )

    const results = await Promise.allSettled(tasks)
    const duration = Date.now() - startTime
    const failures = results.filter((r) => r.status === 'rejected')

    expect(failures.length).toBe(0)
    expect(duration).toBeLessThan(25000) // 50 tasks in <25s = <500ms avg
  })
})
```

### Task 5: Redis Caching Layer (Priority: Medium)

**Files:**

- New: `lib/cache/redis-client.ts`
- New: `lib/cache/workspace-cache.ts`
- New: `lib/cache/agent-cache.ts`
- Update: `server/routes/workspaces.ts`
- Update: `server/routes/agents.ts`
- New: `docker-compose.redis.yml`

**Redis Client Setup:**

```typescript
// lib/cache/redis-client.ts
import { createClient } from 'redis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 2000)
  }
})

redis.on('error', (err) => console.error('Redis error:', err))
redis.on('connect', () => console.log('Redis connected'))

export async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect()
  }
}
```

**Caching Strategy:**

```typescript
// lib/cache/workspace-cache.ts
import { redis } from './redis-client'

export async function getCachedWorkspace(workspaceId: number) {
  const key = `workspace:${workspaceId}`
  const cached = await redis.get(key)
  return cached ? JSON.parse(cached) : null
}

export async function setCachedWorkspace(workspaceId: number, data: any) {
  const key = `workspace:${workspaceId}`
  await redis.setEx(key, 300, JSON.stringify(data)) // 5 min TTL
}

export async function invalidateWorkspaceCache(workspaceId: number) {
  await redis.del(`workspace:${workspaceId}`)
}
```

---

## Milestones

### M1: Database Performance (Oct 12)

- [x] Create and apply index migration
- [x] Run EXPLAIN ANALYZE validation
- [x] Document query performance improvements
- [x] Update `docs/DATABASE_INDEXES.md`

### M2: Connection Pool Hardening (Oct 14)

- [x] Tune pool configuration
- [x] Add health check endpoint
- [x] Implement pool event logging
- [x] Set up alerting for pool saturation

### M3: Error Resilience (Oct 16)

- [x] Implement ErrorBoundary components
- [x] Integrate error tracking service
- [x] Add fallback UI for agent failures
- [x] Test error recovery flows

### M4: Load Testing (Oct 18)

- [x] Author load test suite
- [x] Run tests in staging environment
- [x] Identify and fix bottlenecks
- [x] Achieve <500ms p95 latency target

### M5: Caching (Oct 19)

- [x] Deploy Redis container
- [x] Implement caching layer
- [x] Add cache invalidation hooks
- [x] Measure cache hit rates

---

## Dependencies

1. **Infrastructure**
   - Redis deployment (container or managed service)
   - Load testing environment matching production specs
   - Staging database with production-like data volume

2. **Tooling**
   - Error tracking service approval (Sentry, Rollbar, etc.)
   - Performance monitoring dashboard setup
   - Database query profiling tools

3. **Team Coordination**
   - Infrastructure team for Redis setup
   - Product team for error tracking service selection
   - QA team for load test execution

---

## Risks & Mitigations

| Risk                                   | Impact | Mitigation                              |
| -------------------------------------- | ------ | --------------------------------------- |
| Redis deployment delays                | High   | Start with in-memory cache fallback     |
| Load tests reveal critical bottlenecks | High   | Allocate buffer time for optimization   |
| Error tracking integration blocked     | Medium | Use console logging as interim solution |
| Index creation locks production tables | High   | Apply indexes during low-traffic window |

---

## Success Criteria

- **Performance:** p95 latency <500ms for agent task creation under 50 concurrent users
- **Reliability:** Zero connection pool exhaustion events in 7-day monitoring period
- **Resilience:** All error boundary fallbacks render correctly; no white screens of death
- **Caching:** >70% cache hit rate for workspace snapshot queries
- **Observability:** Pool health metrics visible in ops dashboard; error tracking captures 100% of client errors

---

## Post-Phase Actions

1. Schedule production deployment during maintenance window
2. Monitor metrics for 72 hours post-deployment
3. Document any performance regressions and create follow-up tickets
4. Conduct retrospective and update runbooks
5. Plan Phase 8 scope based on production learnings
