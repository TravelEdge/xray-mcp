---
phase: 05-gap-closure
plan: 01
subsystem: infra
tags: [docker, formatters, contributing, requirements, testing]

# Dependency graph
requires:
  - phase: 04-publication
    provides: CONTRIBUTING.md, package.json prebuild hook, Dockerfile multi-stage build
provides:
  - Working Docker build with scripts/ copied before pnpm build
  - Clean formatters barrel without dead getFormatter code
  - CONTRIBUTING.md with Build hooks section and correct XrayClient example
  - DEPL-01 requirement text corrected to node:24-alpine
  - Stdio transport test performs real dynamic import check
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dockerfile builder stage must COPY scripts/ before RUN pnpm build so prebuild hook can execute"
    - "Formatter barrel re-exports only — no factory functions or singletons in the barrel"

key-files:
  created: []
  modified:
    - Dockerfile
    - src/formatters/index.ts
    - CONTRIBUTING.md
    - .planning/REQUIREMENTS.md
    - src/transport/http.test.ts

key-decisions:
  - "COPY scripts/ added to Dockerfile builder stage between COPY src/ and RUN pnpm build — prebuild hook requires scripts/ to be present"
  - "getFormatter function, singleton instances, and FormatType/JsonFormatter imports removed from formatters barrel — dead code, nothing imported it"
  - "Stdio test replaced with real dynamic import(../index.js) — confirms entry point loads without top-level crash"

patterns-established:
  - "Formatters barrel: three re-export lines only, no factory or singleton code"
  - "Dockerfile builder stage order: package files -> install -> tsconfig -> src -> scripts -> build"

requirements-completed: [DEPL-01]

# Metrics
duration: 30min
completed: 2026-03-25
---

# Phase 05 Plan 01: Docker Build Fix and Tech Debt Cleanup Summary

**Dockerfile scripts/ COPY gap fixed, dead getFormatter code removed, CONTRIBUTING.md updated with prebuild docs and XrayClient examples, DEPL-01 requirement corrected to node:24-alpine, stdio no-op test replaced with real import check**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-25T12:30:00Z
- **Completed:** 2026-03-25T13:00:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Fixed critical Docker build failure: `COPY scripts/ ./scripts/` added to builder stage before `RUN pnpm build` so the prebuild hook (`tsx scripts/generate-tools-doc.ts`) can find the script
- Removed dead code: `getFormatter` function, singleton instances, and unused imports stripped from `src/formatters/index.ts` — barrel now has exactly 3 clean re-export lines
- Added "Build hooks" section to CONTRIBUTING.md documenting the prebuild/TOOLS.md auto-generation workflow
- Updated CONTRIBUTING.md example to use `XrayClient` interface instead of `XrayCloudClient` class (aligns with type-cast standardization)
- Fixed DEPL-01 in REQUIREMENTS.md: changed "node:22-alpine" to "node:24-alpine" to match actual Dockerfile
- Replaced `expect(true).toBe(true)` no-op with real `await import("../index.js")` dynamic import check

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Docker build and remove dead code** - `a20efd0` (fix)
2. **Task 2: Update documentation, requirements, and stdio test** - `6283d0d` (docs)

## Files Created/Modified
- `Dockerfile` - Added `COPY scripts/ ./scripts/` before `RUN pnpm build` in builder stage
- `src/formatters/index.ts` - Reduced to 3 re-export lines, removed getFormatter/singletons/imports
- `CONTRIBUTING.md` - Added Build hooks section, updated example code to use XrayClient
- `.planning/REQUIREMENTS.md` - DEPL-01 corrected to node:24-alpine
- `src/transport/http.test.ts` - Stdio test replaced with real dynamic import check

## Decisions Made
- Verified that nothing in the codebase imported `getFormatter` before removal — safe dead code elimination
- The `XrayCloudClient` mock reference left in http.test.ts mock setup (vi.mock line) is intentional — it's the mock factory, not example code being standardized

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `.planning/` directory is in .gitignore, required `git add -f .planning/REQUIREMENTS.md` to stage it

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 05 Plan 01 complete. All critical gaps from the v1.0 audit addressed in this plan.
- Plan 02 (type-cast standardization) can proceed independently.

---
*Phase: 05-gap-closure*
*Completed: 2026-03-25*
