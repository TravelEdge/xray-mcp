---
phase: 05-gap-closure
plan: 02
subsystem: tools
tags: [typescript, refactor, interface, type-cast, xray-client]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: XrayClientInterface.ts with XrayClient interface definition
  - phase: 02-full-tool-coverage
    provides: all 90 tool handler files using XrayCloudClient casts
provides:
  - All 39 tool handler files in tests/preconditions/folders/evidence domains use XrayClient interface casts
  - Zero XrayCloudClient cast occurrences in src/tools/ domain files
  - createServer.ts comment updated to reflect XrayClient cast pattern
affects: [05-gap-closure, future-v2-xray-server-client-implementation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tool handler client extraction: `const client = args._client as XrayClient` (interface cast, not concrete class)"
    - "Exception pattern: files using static class methods (validateLimit) keep class import alongside interface type import"
    - "Exception pattern: test files that instantiate XrayCloudClient keep value import for construction; use XrayClient for type annotations"

key-files:
  created: []
  modified:
    - src/tools/tests/getTestDetails.ts
    - src/tools/tests/getExpandedTest.ts
    - src/tools/tests/listTests.ts
    - src/tools/tests/listExpandedTests.ts
    - src/tools/tests/createTest.ts
    - src/tools/tests/deleteTest.ts
    - src/tools/tests/updateTestType.ts
    - src/tools/tests/updateGherkinDefinition.ts
    - src/tools/tests/updateUnstructuredDefinition.ts
    - src/tools/tests/addTestStep.ts
    - src/tools/tests/updateTestStep.ts
    - src/tools/tests/removeTestStep.ts
    - src/tools/tests/removeAllTestSteps.ts
    - src/tools/preconditions/createPrecondition.ts
    - src/tools/preconditions/deletePrecondition.ts
    - src/tools/preconditions/getPrecondition.ts
    - src/tools/preconditions/listPreconditions.ts
    - src/tools/preconditions/updatePrecondition.ts
    - src/tools/preconditions/addTestsToPrecondition.ts
    - src/tools/preconditions/removeTestsFromPrecondition.ts
    - src/tools/folders/createFolder.ts
    - src/tools/folders/deleteFolder.ts
    - src/tools/folders/getFolder.ts
    - src/tools/folders/renameFolder.ts
    - src/tools/folders/moveFolder.ts
    - src/tools/folders/addTestsToFolder.ts
    - src/tools/folders/removeTestsFromFolder.ts
    - src/tools/folders/addIssuesToFolder.ts
    - src/tools/folders/removeIssuesFromFolder.ts
    - src/tools/folders/folders.test.ts
    - src/tools/evidence/addEvidenceToRun.ts
    - src/tools/evidence/removeEvidenceFromRun.ts
    - src/tools/evidence/addDefectsToRun.ts
    - src/tools/evidence/removeDefectsFromRun.ts
    - src/tools/evidence/addEvidenceToStep.ts
    - src/tools/evidence/removeEvidenceFromStep.ts
    - src/tools/evidence/addDefectsToStep.ts
    - src/tools/evidence/removeDefectsFromStep.ts
    - src/tools/evidence/evidence.test.ts
    - src/transport/createServer.ts

key-decisions:
  - "listTests.ts and listExpandedTests.ts keep XrayCloudClient import alongside XrayClient for XrayCloudClient.validateLimit() static method call — interface does not expose static methods"
  - "evidence.test.ts keeps XrayCloudClient value import for new XrayCloudClient() constructor; type annotations changed to XrayClient"
  - "createServer.ts comment updated to `as XrayClient`; class import and constructor usage unchanged — legitimate construction site"

patterns-established:
  - "D-04/D-05: All tool handler client casts use XrayClient interface (not concrete class) for future-proof polymorphism"

requirements-completed: [DEPL-01]

# Metrics
duration: 15min
completed: 2026-03-25
---

# Phase 05 Plan 02: Standardize XrayClient Interface Casts Summary

**Replaced all XrayCloudClient type casts with XrayClient interface casts across 39 files in 4 domains (tests, preconditions, folders, evidence), enabling future XrayServerClient polymorphism**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-25T14:55:07Z
- **Completed:** 2026-03-25T15:26:00Z
- **Tasks:** 2
- **Files modified:** 40 (39 tool files + createServer.ts)

## Accomplishments

- Standardized all tool handler client extraction to use `as XrayClient` interface cast across 4 domains
- Zero `XrayCloudClient` cast expressions remaining in any `src/tools/` file
- Build and all 369 tests pass with no regressions after the refactor
- createServer.ts comment updated to reflect the new pattern (class usage for construction preserved)

## Task Commits

Each task was committed atomically:

1. **Task 1: Standardize type casts in tests and preconditions domains (20 files)** - `60804a8` (refactor)
2. **Task 2: Standardize type casts in folders and evidence domains (19 files) and update createServer comment** - `a831462` (refactor)

## Files Created/Modified

- `src/tools/tests/*.ts` (13 handler files) - Changed `import { XrayCloudClient }` to `import type { XrayClient }`, updated all casts
- `src/tools/tests/listTests.ts`, `listExpandedTests.ts` - Added XrayClient import alongside XrayCloudClient (kept for `validateLimit()` static method)
- `src/tools/preconditions/*.ts` (7 handler files) - Changed `import { XrayCloudClient }` to `import type { XrayClient }`, updated all casts
- `src/tools/folders/*.ts` (9 handler files) - Changed `import type { XrayCloudClient }` to `import type { XrayClient }`, updated all casts
- `src/tools/folders/folders.test.ts` - Changed type from XrayCloudClient to XrayClient throughout
- `src/tools/evidence/*.ts` (8 handler files) - Changed `import type { XrayCloudClient }` to `import type { XrayClient }`, updated all casts
- `src/tools/evidence/evidence.test.ts` - Added XrayClient type import; changed type annotations; kept XrayCloudClient value import for constructor
- `src/transport/createServer.ts` - Updated comment on line 82 only; import and constructor usage preserved

## Decisions Made

- `listTests.ts` and `listExpandedTests.ts` retain `import { XrayCloudClient }` alongside the new `import type { XrayClient }` because `XrayCloudClient.validateLimit()` is a static method not available on the interface — removing the class import would break the static call.
- `evidence.test.ts` retains `import { XrayCloudClient }` as a value import because it constructs actual instances (`new XrayCloudClient(httpClient, ...)`) for integration-style tests. The type annotations (`client: XrayClient`) use the interface.
- `createServer.ts` was intentionally not changed beyond the comment — it legitimately needs the class to construct instances.

## Deviations from Plan

None — plan executed exactly as written. The edge cases around `validateLimit()` and test file construction were handled per the plan's guidance about keeping legitimate class usages.

## Issues Encountered

None — TypeScript compilation passed immediately on both tasks. All 369 tests remained green.

## Next Phase Readiness

- All tool handler files now use the XrayClient interface for casts
- When XrayServerClient is implemented in v2, it only needs to implement the XrayClient interface and tool handlers will work without modification
- createServer.ts remains the single construction site for XrayCloudClient, making it straightforward to add branching for XrayServerClient later

---
*Phase: 05-gap-closure*
*Completed: 2026-03-25*
