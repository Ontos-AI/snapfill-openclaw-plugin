# Releasing Guide

This document describes the minimum release workflow for the SnapFill OpenClaw Plugin.

## 1. Pre-Release Checks

Run all checks locally:

```bash
npm install
npm run check
npm run test
```

Verify plugin metadata:

- `openclaw.plugin.json` has correct `id`, `version`, `entry`, `skills`, and `configSchema`.
- `package.json` has matching version and public publish config.
- `README.md`, `LICENSE`, and `CHANGELOG.md` are up to date.

## 2. GitHub Release Checklist

- Ensure `main` is clean and CI is green.
- Confirm CHANGELOG contains release notes for target version.
- Create and push a version tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

- Create a GitHub Release from tag `v0.1.0`.
- Paste release notes from `CHANGELOG.md`.

## 3. npm Release Checklist

- Ensure npm account can publish `@snapfill/openclaw-plugin`.
- Dry-run package contents:

```bash
npm pack --dry-run
```

Confirm tarball includes at least:

- `src/**`
- `skills/**`
- `openclaw.plugin.json`
- `README.md`
- `LICENSE`
- `CHANGELOG.md`

Publish:

```bash
npm publish --access public
```

## 4. Post-Release Validation

- Install from npm in a clean OpenClaw environment:

```bash
openclaw plugins install @snapfill/openclaw-plugin
openclaw plugins enable snapfill
openclaw plugins info snapfill
```

- Configure `plugins.entries.snapfill.config` and run a smoke flow:
  - `snapfill_list_knowledge_files`
  - `snapfill_submit_job`
  - `snapfill_get_job_status`

- If issues are found, patch and release `0.1.1` with updated changelog.
