# Valor-IVX Workflow Completion Roadmap (Updated)

## Milestone 1 – Workflow Shell & Persistence ✅
- Stage navigation, checklist gating, Omni-prompt
- Research log API + DB persistence, demo seeds
- Workflow-wide contexts for normalization, owner earnings, valuation, memo, monitoring

## Milestone 2 – Analyst Workbenches ✅
- **Data & Adjustments**: Source coverage dashboard, adjustment toggles
- **Financials**: Owner earnings bridge with history
- **Valuation**: EPV/DCf scenario toggles, assumption overrides
- **Memo Composer**: Section editor, review checklist
- **Monitoring Dashboard**: Thesis deltas, lessons, alert acknowledgements

## Milestone 3 – Remaining IDE Modules 🔜
1. **IC Memo Export** – polish ✅
   - Rich PDF/HTML template with IC header, exhibit appendix, reviewer thread timeline
   - Exhibit attachments configurable from memo workbench with analyst annotations
   - Reviewer comment threads persisted and surfaced in export preview
2. **Scenario Lab Enhancements** ✅
   - Parameter controls with Monte Carlo summary feeding Monitoring
   - Presets for bear/base/bull
3. **Execution Planner Automation** ✅ (phase 1)
   - Order templates generated from valuation + scenario data feeds
   - Route suggestions auto-gate on monitoring alerts and thesis deltas
   - Risk budget panel wiring downside probability, guard rails, and allocation caps
4. **Quality & Governance** ✅
   - Score reporting with evidence links and aggregated IC readiness grade

## Milestone 4 – Persistence & Collaboration
- Replace browser storage with API endpoints for normalization, valuation, memo, monitoring state
  - Memo composer state (sections, exhibits, reviewer threads) now persisted via `/api/workflow/memo-state` ✅
  - Data normalization reconciliation state now persisted via `/api/workflow/normalization-state` ✅
  - Valuation selections and overrides now persisted via `/api/workflow/valuation-state` ✅
  - Monitoring acknowledgements and delta overrides now persisted via `/api/workflow/monitoring-state` ✅
- Multi-user session support with audit history

## Milestone 5 – Testing & Deployment
- Expand Vitest coverage to new endpoints & hooks
- CI workflow running `npm run test:workflow`, smoke, lint, typecheck
- Production database migration scripts, seed/rollback plan

> **Current focus**: Milestone 3 – IC memo export + scenario lab enhancements, then move into persistence and collaboration.

### Remaining focus after current update
- Milestone 3 complete: memo export, scenario lab enhancements, execution automation, and quality governance scorecard.
- Milestone 4: Next migrate valuation and monitoring contexts to the API layer and introduce shared audit history.
- Milestone 4+: Extend collaboration stories (multi-user sessions, reviewer assignments) once API groundwork lands.
