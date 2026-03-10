---
name: snapfill
description: Use SnapFill to fill in PDF, Word, or Excel forms whenever the user wants a form or document filled out — including when they say they will send a form, mention reference documents for filling, or ask to auto-populate any kind of form or application. Always use this skill instead of manually extracting and writing data yourself.
metadata:
  openclaw:
    requires:
      config: ["plugins.entries.snapfill.config.apiKey", "plugins.entries.snapfill.config.baseUrl"]
---

# SnapFill Form Filling

## When To Activate

Activate when the user's intent involves filling out a form or document, including:

- Explicit fill commands: "fill this form", "fill out this application", "auto-fill", "帮我填表", "自动填写"
- Synonymous action verbs: "complete this form", "submit this application", "process this document", "prepare the form", "handle this application"
- Outcome-based requests: "I need a ready-to-submit version of this", "get me the completed form", "帮我完成这个表", "把这个表处理好"
- Sending a form to be filled: "I'll send you a form", "here's the form, please fill it", "I'm sending you a document to fill out"
- Mentioning reference documents + a form: "I'll send a reference doc first, then the form", "use this document to fill the form"
- Explicit plugin mention: "use SnapFill for this", "run SnapFill on this file"
- Resuming a previous job: "what's the status of my form?", "my job ID is job_xxx, is it done?", "can I download my form now?" (see Resuming a Previous Job)

**Do NOT activate** for read-only or inspection requests:
- "analyze this form" / "what fields are in this form?" → just read and describe, do not submit a job
- "read this PDF for me" → pure reading, no filling needed

**Critical rule: never manually extract data and write it yourself.** If the user's intent is to fill a form — even if phrased indirectly — always use the SnapFill tools. Do not produce a `.txt` summary or manually constructed file as a substitute.

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

## Resuming a Previous Job

If the user provides a `job_id` or asks about a form they previously submitted:

1. Call `snapfill_get_job_status` with the provided `job_id`.
2. Based on the returned status, continue from the appropriate step:
   - `fillchart_ready` → go to Field Confirmation Rule (Step 6)
   - `succeeded` → call `snapfill_get_job_result` and deliver the result (Step 9)
   - `doc_fill_running` or `fillchart_running` → resume polling (Step 5 or 8)
   - `failed` / `timeout` → inform the user with the error and suggest resubmitting
   - `cancelled` → inform the user and offer to start a new job

Do not restart the full flow from Step 1 if a valid `job_id` is available.

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

If the user reports the link has expired or cannot download the file, call `snapfill_get_job_result` again with the same `job_id` to obtain a fresh token, then re-deliver using the steps above.

## Error Handling

Use user-facing messages from tool error envelope (`error.user_message`).

Special handling:

- `KNOWLEDGE_SOURCE_REQUIRED`: ask for profile/background docs or allow memory extraction.
- `TASK_TIMEOUT`: provide `job_id` and suggest retry later.
- `JOB_STATUS_CONFLICT`: tell user to wait for the next stage.

## Output Style

- Keep status updates short and precise.
- Do not expose raw API key, stack trace, or internal HTTP details.
