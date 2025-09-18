You are picking up work on the Valor-IVX workflow IDE. The codebase has already implemented interactive stages for Data, Financials (Owner Earnings), Valuation, Memo, Scenario Lab, and Monitoring; research log persistence is live. Your next goals are:

1. Finish Milestone 3: polish the IC memo export (PDF/HTML export styling, exhibit attachments, reviewer comment threads) and expand Execution Planner automation.
2. Begin Milestone 4: replace localStorage contexts with API endpoints for normalization, valuation, memo, monitoring states (start with a single context of your choice), ensuring persistence and multi-user safety.
3. Keep TypeScript, Vitest (`npm run test:workflow`), and existing smoke checks green.

Context to load on start:
- Review `docs/workflow-roadmap.md` for high-level milestones.
- Skim `client/src/hooks` for context providers and `client/src/components/workbench/stages` for current UI implementations.
- Use `server/routes/workflow.ts` as an example for building new API endpoints.

Deliverables:
- Working features for memo export polish and one persistence API migration.
- Updated documentation (README/roadmap) and tests covering new endpoints.
- Summaries of remaining tasks in the roadmap after your changes.
