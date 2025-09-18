# Workflow Audit History & Collaboration Plan

With memo, normalization, valuation, and monitoring contexts now persisted via the `/api/workflow/*` routes, we can layer collaboration and audit guarantees on top of the shared database store. This plan outlines the first implementation slice.

## Goals
- **Audit History:** Capture time-series changes for every workflow context with actor identity, allowing an audit timeline per session or idea.
- **Collaboration Safety:** Ensure simultaneous analysts do not clobber each other’s work; surface presence/locks where contention is likely.
- **Reviewer Workflow:** Provide reviewer-specific trails (assignments, comment ownership) so IC approvals are traceable.

### Current Implementation Snapshot
- Event tables (`*_state_events`) now persist snapshots for memo, normalization, valuation, and monitoring updates with actor/version metadata.
- Optimistic concurrency controls enforced via versioned state tables; clients refresh when conflicts are detected.
- Presence heartbeat endpoints (`/api/workflow/presence`) power live collaborator badges in the workbench header.

## Proposed Architecture
1. **Versioned State Tables**
   - Introduce append-only history tables (e.g., `memo_state_events`, `valuation_state_events`) keyed by session ID + monotonically increasing sequence.
   - Use JSON diff payloads to store before/after snapshots, plus metadata (`actorId`, `source`, `clientVersion`).
   - Maintain lightweight `current` tables (already in place) for fast reads; history tables feed audit queries.

2. **Session Identity & Actors**
   - Extend session middleware to stamp `req.session.userId` (fallback to anonymous UUID) and inject into workflow router persistence endpoints.
   - Update payload schema (`MonitoringStateInput`, etc.) to accept optional `actorId` for automation/bot events.

3. **Optimistic Concurrency Controls**
   - Add `updatedAt` precondition checks: clients send last-known timestamp; server rejects if the stored record is newer (HTTP 409). Clients re-fetch and merge.
   - Optionally introduce `version` columns (incrementing integer) on state tables to simplify conflict detection.

4. **Live Presence & Notifications**
   - Create `/api/workflow/presence` channel (or WebSocket) broadcasting active sessions per stage with heartbeat timestamps.
   - Surface presence badges in the workbench header; highlight when another analyst is editing the same object.

5. **Reviewer Assignment Model**
   - Table `workflow_review_assignments` capturing reviewer, stage, status (assigned, in-progress, approved), and optional due dates.
   - Link reviewer actions (comment resolutions, checklist toggles) to the audit log for accountability.

## Iteration Plan
1. **Phase 1 – Audit Foundations**
   - Add history tables + event writers in workflow routes.
   - Implement optimistic concurrency check + error handling on the client hooks.
   - Provide `/api/workflow/history?stage=...` endpoint returning recent events for UI debugging.

2. **Phase 2 – Collaboration UX**
   - Build presence service + UI badges.
   - Add conflict resolution prompts in memo/valuation panels when 409 responses are returned.

3. **Phase 3 – Reviewer Trail**
   - Introduce reviewer assignment CRUD endpoints.
   - Extend memo comment threads to store `resolverId` and `resolvedAt` with audit linkage.

## Dependencies & Considerations
- Requires user/session identity; for demo, generate deterministic UUID stored in session cookie.
- Must ensure history tables don’t grow unbounded: plan for TTL pruning or archival after defined retention window.
- Update Vitest integration suite to cover 409 conflict paths and history fetch responses.
- Coordinate with future Monitoring context enhancements (alerts acknowledgements may be multi-user sensitive).

## Next Steps
- Draft schema migrations for history + reviewer tables.
- Prototype optimistic concurrency response handling in `useMemoComposer`, `useValuation`, `useMonitoring` hooks.
- Align with product on retention policy and reviewer workflow UX mocks before implementation.
