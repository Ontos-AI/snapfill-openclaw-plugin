# Changelog

All notable changes to this project will be documented in this file.

## [0.2.2] - 2026-03-27

### Fixed

- Fixed OpenClaw runtime config compatibility so the plugin can resolve `apiKey` from current plugin-scoped runtime config objects instead of relying on `api.config.get(...)` only.

### Changed

- Aligned the plugin entry packaging with the current OpenClaw plugin pattern by publishing the built `dist/index.js` artifact and exported declarations.
- Updated the runtime-facing plugin types and tool registration flow to better match the current OpenClaw plugin SDK shape and the tested `knowhere-claw` integration pattern.
- Bumped the npm package version and OpenClaw plugin manifest version to `0.2.2` for release publication.

## [0.2.1] - 2026-03-27

### Fixed

- Removed the manifest-level required `apiKey` constraint so OpenClaw can install and enable the plugin before the user configures credentials.

### Changed

- Bumped the npm package version and OpenClaw plugin manifest version to `0.2.1` for release publication.

## [0.2.0] - 2026-03-27

### Changed

- Aligned the plugin id with the published npm package name to remove OpenClaw id mismatch warnings.
- Updated runtime exports, CLI examples, and config guidance to use plugin id `snapfill-claw`.
- Kept backward-compatible runtime fallback reads for older `snapfill` config keys during migration.
- Bumped the npm package version and OpenClaw plugin manifest version to `0.2.0` for release publication.

## [0.1.9] - 2026-03-27

### Fixed

- Updated npm installation and release documentation to use `@ontos-ai/snapfill-claw` instead of the old package name.

### Changed

- Bumped the npm package version and OpenClaw plugin manifest version to `0.1.9` for release publication.

## [0.1.8] - 2026-03-27

### Changed

- Switched the bundled SnapFill backend base URL to the global production facade endpoint.
- Strengthened missing API key guidance across the plugin runtime, skill instructions, config schema, and README.
- Bumped the npm package version and OpenClaw plugin manifest version to `0.1.8` for release publication.

## [0.1.7] - 2026-03-25

### Changed

- Bumped the npm package version and OpenClaw plugin manifest version to `0.1.7` for release publication.

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
