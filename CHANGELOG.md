# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-05

### Added

- Bootstrapped a standalone OpenClaw plugin TypeScript scaffold.
- Added `openclaw.plugin.json` with SnapFill config schema and bundled skill path.
- Implemented all `snapfill_*` tools with a shared HTTP client and unified error envelope.
- Added integrated skill at `skills/snapfill/SKILL.md`.
- Added end-user README for install, config, verification, and troubleshooting.
- Added baseline tests for config parsing, error mapping, and submit-job validation.

### Changed

- Standardized formatting and converted type-only imports to `import type` where applicable.

### Quality

- Added isolated test build config (`tsconfig.test.json`) and npm test script.
