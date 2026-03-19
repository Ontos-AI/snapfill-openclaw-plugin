# Changelog

All notable changes to this project will be documented in this file.

## [0.1.6] - 2026-03-19

### Changed

- Tightened the bundled SnapFill skill orchestration so the plugin stays on the intended SnapFill flow.
- Added support for temporary image-to-text knowledge handling inside the bundled skill.

### Fixed

- Ensured the OpenClaw plugin metadata loads correctly with the bundled skill registration.
- Prevented over-diagnosing zero-field SnapFill results.
- Restricted image knowledge continuation to OCR-derived content so the SnapFill flow remains consistent.

## [0.1.5] - 2026-03-18

### Changed

- Hardcoded the SnapFill service base URL inside the plugin instead of exposing it through user config.
- Removed `baseUrl` from the published config schema, bundled skill metadata, tests, and README examples.
- Unified the npm package version and plugin manifest version at `0.1.5`.

## [0.1.2] - 2026-03-11

### Added

- Added explicit acknowledgement and heartbeat guidance during polling to keep users informed.

### Changed

- Tightened polling cadence guidance for more responsive progress updates.
- Set default `pollIntervalMs` to `1000` and updated docs to match.

## [0.1.1] - 2026-03-11

### Added

- Expanded skill activation triggers and added resume flow for existing `job_id`.
- Added field preview confirmation workflow with a hard confirmation gate and user-instruction priority.
- Added progress updates on every status poll plus message-based result delivery guidance.
- Added retry guidance for expired download links.

### Fixed

- Normalized `field_suggestions` to recognize `fillchart_fields` and snapshot variants.
- Deferred config loading to tool execution time to avoid missing config access during registration.

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
