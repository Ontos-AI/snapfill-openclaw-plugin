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
5. Poll `snapfill_get_job_status` until `status = "fillchart_ready"` — report progress after every poll (see Polling Behavior)
6. Present all field suggestions to user and collect confirmation or edits (see Field Confirmation Rule)
7. `snapfill_finalize_job`
8. Poll `snapfill_get_job_status` until `status = "succeeded"` — report progress after every poll (see Polling Behavior)
9. `snapfill_get_job_result` — deliver result to user (see Result Delivery)

## Knowledge Source Fallback

- If `snapfill_list_knowledge_files` returns any file with `status=success` or `status=complete`, use those IDs.
- If none are usable, extract structured user background from current conversation/history and call `snapfill_ingest_instant_knowledge`.
- Wait until the returned knowledge file IDs become usable, then continue.
- If still unavailable, ask the user to upload or provide background information and stop.

## Polling Behavior

After **every** `snapfill_get_job_status` call, immediately send a short progress update to the user before polling again. Do not stay silent between polls.

Format: `[emoji] [stage] — [progress]% · [message]`

Stage emoji mapping:
- `fillchart_running` → 📋
- `doc_fill_running` → ✍️
- Any other in-progress status → ⏳

Examples:
- `📋 Analyzing form fields — 45% · Extracting field structure`
- `✍️ Generating document — 72% · Filling in your data`

On stage transitions, send a clear notice:
- When entering `fillchart_ready`: "✅ Field analysis complete. Preparing your fields for review..."
- When entering `doc_fill_running`: "✍️ Confirmed. Generating your document now..."
- When entering `succeeded`: "✅ Document ready!"

If the same `progress` value appears in 3 or more consecutive polls, send once: "Still processing, please hang on..." — then continue polling silently until progress changes.

## Field Confirmation Rule (Hard Requirement)

When job status reaches `fillchart_ready`:

1. Read `field_suggestions` from tool output.
2. Present **all** fields as a numbered list with their suggested values:
   ```
   Here are the fields I'll fill in. Please review and let me know if anything needs to change:

   1. Applicant Name: Alice
   2. Contact Email: a@b.com
   3. Organization: Example Inc
   ...

   Does everything look correct? If you'd like to change any field, tell me the number and the new value.
   ```
3. Wait for the user's response.
4. If the user requests changes:
   - Apply all changes to a local field snapshot.
   - Re-display the **complete updated list** (not just the changed items).
   - Ask for confirmation again.
   - Repeat until the user explicitly confirms.
5. Only call `snapfill_finalize_job` after the user explicitly confirms (e.g., "yes", "looks good", "submit", "confirm").

**Never call `snapfill_finalize_job` before explicit user confirmation.**

## Result Delivery

After `snapfill_get_job_result` returns successfully:

1. Send a text message with the download link and expiry notice:
   ```
   ✅ Your filled form is ready!

   Download link (valid for 30 minutes):
   <proxy_download_url>

   If the link expires, just ask me and I'll fetch a fresh one.
   ```
2. Also send the file directly into the conversation using the `message` tool's `send` action with the `proxy_download_url` as the `media` parameter, so the user can open or download it inline.

## Error Handling

Use user-facing messages from tool error envelope (`error.user_message`).

Special handling:

- `KNOWLEDGE_SOURCE_REQUIRED`: ask for profile/background docs or allow memory extraction.
- `TASK_TIMEOUT`: provide `job_id` and suggest retry later.
- `JOB_STATUS_CONFLICT`: tell user to wait for the next stage.

## Output Style

- Keep status updates short and precise.
- Do not expose raw API key, stack trace, or internal HTTP details.
