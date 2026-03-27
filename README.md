# SnapFill OpenClaw Plugin

SnapFill plugin for OpenClaw. It registers `snapfill_*` tools and ships a default `snapfill` skill so users can complete form filling in one conversation flow.

## Who This Is For

- OpenClaw users who want to install SnapFill as a plugin
- Operators who manage plugin config for teams

## What This Plugin Provides

- Tool layer: `snapfill_*` tools that call SnapFill Facade API (`/v1/fill-jobs`)
- Skill layer: built-in `skills/snapfill/SKILL.md` with orchestration rules
- Error normalization: user-friendly errors for common backend codes

Tool list:

- `snapfill_prepare_file`
- `snapfill_list_knowledge_files`
- `snapfill_list_profiles`
- `snapfill_ingest_instant_knowledge`
- `snapfill_submit_job`
- `snapfill_get_job_status`
- `snapfill_finalize_job`
- `snapfill_get_job_result`

## Prerequisites

- A running OpenClaw instance with plugin support
- Valid SnapFill API key (`sfk_...`) from https://www.gosnapfill.com/home/api-key

## Install

### Production (npm)

```bash
openclaw plugins install @snapfill/openclaw-plugin
```

### Local path (development)

```bash
openclaw plugins install /absolute/path/to/openclaw-plugin
```

Then enable plugin explicitly (safe even if already enabled by default):

```bash
openclaw plugins enable snapfill
```

## Configure

Configure `plugins.entries.snapfill.config` in `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "snapfill": {
        "enabled": true,
        "config": {
          "apiKey": "sfk_xxx",
          "timeoutSeconds": 300,
          "pollIntervalMs": 1000,
          "maxPollAttempts": 100,
          "kbPollTimeoutSeconds": 60
        }
      }
    }
  }
}
```

For more responsive progress updates, keep `pollIntervalMs` around `1000`. Lower values can increase API traffic.

If the plugin is installed but `apiKey` is still empty, open https://www.gosnapfill.com/home/api-key to create or copy your API key first.

## Verify Installation

```bash
openclaw plugins list
openclaw plugins info snapfill
openclaw plugins doctor
```

Expected result:

- `snapfill` plugin is enabled
- config schema validation passes
- `snapfill_*` tools are available in agent sessions

## Quick Usage

Ask OpenClaw with natural language, for example:

- `Help me fill this application form using my existing profile.`
- `帮我填这个申请表，如果资料不够就从历史对话提取。`

The built-in skill enforces:

- knowledge-source check
- field confirmation before finalize
- result link return after job success

## Skill Packaging and Override

This plugin uses integrated delivery (plugin + skill in one package):

- skill path: `skills/snapfill/SKILL.md`
- manifest field: `openclaw.plugin.json -> skills`

OpenClaw precedence still applies:

- workspace skills (`<workspace>/skills`) override managed/global skills
- managed/global skills (`~/.openclaw/skills`) override bundled/plugin skills

## Troubleshooting

- `config.apiKey is required`
  - Get your API key from https://www.gosnapfill.com/home/api-key, then set `plugins.entries.snapfill.config.apiKey`.
- `KNOWLEDGE_SOURCE_REQUIRED`
  - Upload knowledge files first, or allow instant knowledge ingestion from conversation history.
- Plugin installs but tools are missing
  - Confirm plugin is enabled and restart/refresh the OpenClaw Gateway session.

## Development

```bash
npm install
npm run check
```

This repository is only the OpenClaw integration layer (TypeScript/Node.js). The Python backend remains a separate service repository.
