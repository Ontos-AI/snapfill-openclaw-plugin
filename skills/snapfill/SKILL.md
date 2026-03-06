---
name: snapfill
description: Fill PDF, Word, or Excel forms through SnapFill with mandatory user confirmation before final submission.
metadata:
  openclaw:
    requires:
      config: ["plugins.entries.snapfill.config.apiKey", "plugins.entries.snapfill.config.baseUrl"]
---

# SnapFill Form Filling

## When To Activate

Activate when the user asks to fill, complete, or auto-populate a form, including:

- fill this form / fill out this application
- 帮我填表 / 自动填写申请表
- PDF form filling / Word form filling / Excel form filling

## Required Tool Order

Always follow this order. Do not skip required user confirmation.

1. `snapfill_list_knowledge_files`
2. Optional: `snapfill_list_profiles`
3. If no usable knowledge file: `snapfill_ingest_instant_knowledge`
4. `snapfill_submit_job`
5. Poll `snapfill_get_job_status` until `status = "fillchart_ready"`
6. Show field suggestions and ask for explicit user confirmation
7. `snapfill_finalize_job`
8. Poll `snapfill_get_job_status` until `status = "succeeded"`
9. `snapfill_get_job_result`

## Knowledge Source Fallback

- If `snapfill_list_knowledge_files` returns any file with `status=success` or `status=complete`, use those IDs.
- If none are usable, extract structured user background from current conversation/history and call `snapfill_ingest_instant_knowledge`.
- Wait until the returned knowledge file IDs become usable, then continue.
- If still unavailable, ask the user to upload or provide background information and stop.

## Confirmation Rule (Hard Requirement)

When job status reaches `fillchart_ready`:

1. Read `field_suggestions` from tool output.
2. Present suggested fields in a clear list.
3. Ask for explicit confirmation.
4. If user requests edits, update fields and ask confirmation again.
5. Call `snapfill_finalize_job` only after explicit user confirmation.

Never call `snapfill_finalize_job` before explicit confirmation.

## Error Handling

Use user-facing messages from tool error envelope (`error.user_message`).

Special handling:

- `KNOWLEDGE_SOURCE_REQUIRED`: ask for profile/background docs or allow memory extraction.
- `TASK_TIMEOUT`: provide `job_id` and suggest retry later.
- `JOB_STATUS_CONFLICT`: tell user to wait for the next stage.

## Output Style

- Keep status updates short and precise.
- When generation succeeds, provide the download URL and mention it is time-limited.
- Do not expose raw API key, stack trace, or internal HTTP details.
