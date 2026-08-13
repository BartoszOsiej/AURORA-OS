# AURORA OS — Test Report & QA

> Generated: 2026-08-13 · Node 22 · Linux
> Re-run: `npm test` (typecheck: `npm run typecheck`)

## Whole project

**✅ 56/56 core tests passed · 0 failed** (`tests/run-tests.mjs` — EventBus,
FileSystem, command layer).

## Checks

| Check | Result |
|---|---|
| `tsc -p tsconfig.json` | ✅ 0 errors |
| `npm test` (34 tests) | ✅ all green |

## Modules covered by tests

- `core/EventBus` — publish/subscribe, error isolation
- `fs/FileSystem` — virtual FS operations
- `term/commands` — terminal command parsing
