# State: TreadPeak

## Project Reference

**Core Value:** Users stay motivated to walk more and eat better through competitive leaderboards that show where they rank against friends and people nearby, backed by effortless step tracking and simple food logging.

**Current Focus:** Phase 1 — Foundation & Authentication

## Current Position

| Field | Value |
|-------|-------|
| **Phase** | 1 |
| **Phase Name** | Foundation & Authentication |
| **Plan** | TBD |
| **Status** | Not started |
| **Progress** | [                    ] 0% |

## Performance Metrics

| Metric | Value | Target |
|--------|-------|--------|
| Phases completed | 0 | 5 |
| Requirements mapped | 39/39 | 39 |
| Phase progress | 0% | 100% |

## Accumulated Context

### Decisions
| Decision | Rationale |
|----------|-----------|
| Auth required upfront | Data persistence is core value — tracking progress requires identity from day one |
| Open Food Facts for food data | Zero cost, no rate limits, solid barcode database for text search |
| Walking-only for MVP | Narrower scope ships faster; broader workout types post-launch |
| Location-filtered leaderboards in v1 | Key differentiator driving retention through local competition |
| Supabase as backend platform | PostgreSQL naturally handles leaderboards/friend graph/food diary; built-in OAuth and RLS |
| Text-only food search in v1 | Barcode scanning deferred to v2 per product decision |
| No manual step entry | Undermines competitive integrity of leaderboards |
| No global all-time leaderboard | Demotivates 75%+ of users per research |
| Sequential phases (2-5) | Phases 2/3 independent after Phase 1; Phase 4+5 compose from earlier phases |

### To-do
1. Approve ROADMAP.md
2. Begin Phase 1 planning (`/gsd-plan-phase 1`)

### Blockers
None currently.

## Session Continuity

**Last session:** Roadmap creation (2026-07-24)
**Next session:** Phase 1 planning
**Open questions:** None
