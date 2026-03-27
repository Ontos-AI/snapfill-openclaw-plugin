---
name: snapfill
description: Use SnapFill to fill in PDF, Word, or Excel forms whenever the user wants a form or document filled out — including when they say they will send a form, mention reference documents for filling, or ask to auto-populate any kind of form or application. Always use this skill instead of manually extracting and writing data yourself.
metadata:
  openclaw:
---

# SnapFill Form Filling

## When To Activate

Activate when the user's intent involves filling out a form or document, including:

- Explicit fill commands: "fill this form", "fill out this application", "auto-fill", "帮我填表", "自动填写"
- Synonymous action verbs: "complete this form", "submit this application", "process this document", "prepare the form", "handle this application"
- Outcome-based requests: "I need a ready-to-submit version of this", "get me the completed form", "帮我完成这个表", "把这个表处理好"
- Sending a form to be filled: "I'll send you a form", "here's the form, please fill it", "I'm sending you a document to fill out"
- Mentioning reference documents + a form: "I'll send a reference doc first, then the form", "use this document to fill the form"
- A form file plus any supporting attachments in the same request, where the extra files are meant to provide background for filling the form, such as resumes, profile documents, screenshots, IDs, certificates, offer letters, contracts, reference images, notes, or other user-provided materials
- Explicit plugin mention: "use SnapFill for this", "run SnapFill on this file"
- Resuming a previous job: "what's the status of my form?", "my job ID is job_xxx, is it done?", "can I download my form now?" (see Resuming a Previous Job)

**Do NOT activate** for read-only or inspection requests:
- "analyze this form" / "what fields are in this form?" → just read and describe, do not submit a job
- "read this PDF for me" → pure reading, no filling needed

**Critical rule: never manually extract data and write it yourself.** If the user's intent is to fill a form — even if phrased indirectly — always use the SnapFill tools. Do not produce a `.txt` summary or manually constructed file as a substitute.

If the `snapfill_*` tools are unavailable or the plugin is not loaded, tell the user SnapFill is unavailable in the current environment and stop. Do not switch to `python-docx`, ad hoc Python scripts, `curl`, or direct HTTP calls as a substitute for the SnapFill workflow.

## Missing API Key Rule

If a SnapFill tool fails because the API key is missing, stop immediately and give the user a direct setup instruction.

- Clearly state that SnapFill cannot start because `plugins.entries.snapfill.config.apiKey` is not configured.
- Strongly direct the user to `https://www.gosnapfill.com/home/api-key` to create or copy an API key.
- Tell the user to set it with:
  - `openclaw config set plugins.entries.snapfill.config.apiKey "sfk_..."`
- After that, tell the user to retry the same fill request.
- Do not continue with any fallback workflow until the API key is configured.

## Required Tool Order

Always follow this order. Do not skip required user confirmation.

1. Decide the knowledge strategy for this task (see Knowledge Strategy Decision Rule)
2. `snapfill_list_knowledge_files`
3. Optional: `snapfill_list_profiles`
4. If the chosen strategy requires temporary knowledge: `snapfill_ingest_instant_knowledge`
5. Poll `snapfill_list_knowledge_files` for the returned `knowledge_file_ids` until they become usable
6. `snapfill_submit_job`
7. Immediately send a short acknowledgement (for example: "✅ Job submitted. Starting analysis now...")
8. Poll `snapfill_get_job_status` until `status = "fillchart_ready"` — report progress after every poll (see Polling Behavior)
9. Present all field suggestions to user and collect confirmation or edits (see Field Confirmation Rule)
10. `snapfill_finalize_job`
11. Poll `snapfill_get_job_status` until `status = "succeeded"` — report progress after every poll (see Polling Behavior)
12. `snapfill_get_job_result` — deliver result to user (see Result Delivery)

## Knowledge Strategy Decision Rule

Choose exactly one strategy before submitting the job:

1. `temporary_only`
   Use this when the user explicitly wants this form filled from the current conversation or from a temporary persona, for example:
   - "根据你对鲁迅的了解来填"
   - "按我刚才说的人设填"
   - "这次不要用我账号里的资料"
   - "用我们现在对话里说的内容填"

2. `existing_only`
   Use this when the user explicitly wants their account knowledge/profile only, for example:
   - "用我账号里的资料填"
   - "按我的默认资料填"
   - "用我知识库里现有内容"

3. `auto`
   Use this for all other cases.

Never mix temporary knowledge files and persistent knowledge files in the same job.

## Knowledge Source Workflow

### `temporary_only`

- Extract structured temporary background from the current conversation.
- If the user provides supporting images and those images are meant to supply background for the form, first read the visible image content and extract the relevant text or structured facts into temporary background text.
- If the user asks for a public figure, fictional character, or temporary persona, you may summarize stable model knowledge into a temporary background entry.
- Call `snapfill_ingest_instant_knowledge` with `persist=false`.
- Poll `snapfill_list_knowledge_files` using the returned `knowledge_file_ids` and `source_scope="temporary"` until every file is `success` or `complete`.
- Submit the job with:
  - `knowledge_file_ids` = only the temporary knowledge IDs from this turn
  - `knowledge_strategy` = `temporary_only`
- Do not use `profile_id`.
- Do not include any existing account knowledge file IDs.

### `existing_only`

- Call `snapfill_list_knowledge_files` with `source_scope="persistent"`.
- If usable persistent knowledge files exist, submit the job with only those IDs and `knowledge_strategy="existing_only"`.
- If no usable persistent knowledge exists, tell the user and stop. Do not silently switch to temporary knowledge.

### `auto`

- Call `snapfill_list_knowledge_files` with `source_scope="persistent"`.
- If usable persistent knowledge files exist, submit the job with only those IDs and `knowledge_strategy="auto"`.
- If none are usable, extract temporary background from the current conversation. If the user supplied supporting images, first extract the visible image text or structured facts from those images and include that content in the temporary background text. Then call `snapfill_ingest_instant_knowledge` with `persist=false`.
- Poll those temporary IDs with `source_scope="temporary"` until usable.
- Submit the job with only those temporary IDs and `knowledge_strategy="auto"`.

## Image-Based Supporting Materials

Use this section when the user supplies an image as background material for filling a form and SnapFill does not support that image as a direct knowledge file.

- Treat the image as source material for temporary knowledge preparation, not as a reason to bypass SnapFill.
- Extract only information that is actually visible in the image, such as names, dates, addresses, ID numbers, company names, school names, contact details, titles, or other readable fields.
- Convert the extracted image information into concise structured text entries, then call `snapfill_ingest_instant_knowledge` and continue the normal SnapFill workflow.
- If multiple images are provided, merge their usable facts into the same temporary knowledge set when they describe the same person or document package.
- If an image is blurry, cropped, obstructed, or unreadable, tell the user exactly which parts could not be read and ask for a clearer image or typed text.
- Do not invent unreadable values. Unknown fields should remain missing and be handled later during field confirmation.
- Even when the image contains all needed information, do not fill the final document directly from OCR output. The OCR-derived text must still go through SnapFill and the `confirm_required` review step.

## Resuming a Previous Job

If the user provides a `job_id` or asks about a form they previously submitted:

1. Call `snapfill_get_job_status` with the provided `job_id`.
2. Based on the returned status, continue from the appropriate step:
   - `fillchart_ready` → go to Field Confirmation Rule (Step 9)
   - `succeeded` → call `snapfill_get_job_result` and deliver the result (Step 12)
   - `doc_fill_running` or `fillchart_running` → resume polling (Step 8 or 11)
   - `failed` / `timeout` → inform the user with the error and suggest resubmitting
   - `cancelled` → inform the user and offer to start a new job

Do not restart the full flow from Step 1 if a valid `job_id` is available.

## Polling Behavior

After **every** `snapfill_get_job_status` call, immediately send a short progress update to the user before polling again. Do not stay silent between polls.

Polling cadence:
- Wait about **1 second** between polls by default for responsiveness.
- If `pollIntervalMs` is available, use it but cap at **2000ms** to avoid long silent gaps.
- Never perform multiple polls in a single assistant turn. Each poll must be followed by a user-visible update.

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

If the same `progress` value appears in 3 or more consecutive polls, send once: "Still processing, please hang on..." — then keep polling with a short heartbeat update every 2 polls (for example: "Still working... no change yet") until progress changes.

## Long-Running Job Rule

Do not infer failure just because progress stays at the same percentage for a long time.

- If `status` is still `fillchart_running` or `doc_fill_running`, treat the job as still in progress even if the percentage has not changed for several minutes.
- In that case, tell the user the job is still running, include the `job_id`, and offer to keep checking later or resume from that `job_id`.
- Do not claim the API is broken, the template is unsupported, or the document format must be changed unless a SnapFill tool actually returns a structured failure or the job status becomes `failed` or `timeout`.
- Do not proactively switch to manual workarounds such as converting to PDF, simplifying the file, using `python-docx`, or filling the document outside SnapFill while the job is still in an in-progress status.
- If the user explicitly asks for fallback options before the job reaches a terminal state, you may describe them as optional alternatives, but you must clearly say the current SnapFill job is still running and has not yet failed.
- If the polling window configured by OpenClaw ends before the backend job reaches a terminal state, stop with a neutral status update and preserve the `job_id` for resume.

Once the job reaches a terminal failure state such as `failed` or `timeout`, or if a SnapFill tool returns a structured error that blocks progress, you may offer next-step alternatives such as retrying with SnapFill, changing document format, or using a non-SnapFill fallback if the user wants that tradeoff.

Recommended message shape when polling stops but the backend job is still running:

```text
SnapFill is still processing this form.
Job ID: <job_id>

It has not reached a final state yet, so I am not switching to any manual workaround.
You can ask me to check this job again later with the same job ID.
```

## Value Priority Rule

When determining what value to use for any field, always apply the following priority order:

1. **User's explicit instruction in the current conversation** (highest)
   - Anything the user has stated, corrected, or specified in this conversation session.
   - Examples: "use John as the name", "change the date to tomorrow", "set the company to Acme".
   - This includes instructions given **before** the field list is presented, not just replies to it.

2. **User's confirmation or edit during the field review step**
   - Values the user explicitly accepted or modified when reviewing the field list.

3. **`suggested_value` from `field_suggestions`** (lowest — knowledge base fallback)
   - Use only if the user has given no instruction for that field in this conversation.

**Never let knowledge base content override something the user has explicitly stated in this
conversation — regardless of when in the conversation the instruction was given.**

If the user's instruction is ambiguous (e.g., "use my usual info"), ask for clarification
before applying any value. Do not silently fall back to the knowledge base.

## Zero-Field Result Rule

If a SnapFill job reaches `fillchart_ready` but `field_suggestions` is empty:

- State only the observed fact: SnapFill completed field analysis for this job but returned 0 fields.
- Include the `job_id` when reporting this outcome.
- Do not claim a specific root cause such as "ordinary Word tables are unsupported", "this template type cannot work", or "SnapFill only supports form-field documents" unless a SnapFill tool explicitly returns that diagnosis.
- Treat the cause as unknown unless the backend provides a structured error or a clear diagnostic message.
- If the user asks what to do next, you may offer retrying with SnapFill, checking another copy of the file, or discussing a workaround, but present those as options rather than confirmed root-cause fixes.
- Do not present a non-SnapFill fallback as the default conclusion from a zero-field result alone.

## Field Confirmation Rule — HARD BLOCK

**This is a hard requirement. `snapfill_finalize_job` MUST NOT be called under any
circumstances until the user has explicitly confirmed the fields in this conversation turn.
Skipping this step — even if the suggested values appear correct — is a violation of the
`confirm_required` contract and will be treated as a critical failure.**

When job status reaches `fillchart_ready`:

1. Read `field_suggestions` from the tool output. Apply the Value Priority Rule above to
   override any suggested values with what the user has already stated in this conversation.
2. If `field_suggestions` is empty, follow the Zero-Field Result Rule, stop, and wait for the user instead of calling `snapfill_finalize_job`.
3. Present **all** fields as a numbered list with their resolved values:
   ```
   Here are the fields I'll fill in. Please review and let me know if anything needs to change:

   1. Applicant Name: Alice
   2. Contact Email: a@b.com
   3. Organization: Example Inc
   ...

   Does everything look correct? If you'd like to change any field, tell me the number and the new value.
   ```
4. **Stop and wait.** Do not proceed. Do not call `snapfill_finalize_job`. Wait for the
   user's reply in this conversation.
5. If the user requests changes:
   - Apply all changes to a local field snapshot.
   - Re-display the **complete updated list** (not just the changed items).
   - Ask for confirmation again.
   - Repeat until the user explicitly confirms.
6. Only call `snapfill_finalize_job` after the user sends an explicit confirmation
   (e.g., "yes", "looks good", "submit", "confirm", "go ahead", "okay").

**Do not interpret silence, a prior instruction, or a general "fill the form" request as
confirmation. Confirmation must come from a message in the current conversation after the
field list has been presented.**

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

- `KNOWLEDGE_SOURCE_REQUIRED`: ask for profile/background docs or allow temporary knowledge extraction.
- `EXISTING_KNOWLEDGE_REQUIRED`: tell the user no usable account knowledge is available for this request.
- `TEMPORARY_KNOWLEDGE_REQUIRED`: extract temporary background from the current conversation, then retry.
- `KNOWLEDGE_STRATEGY_MISMATCH`: explain that the request mixed account knowledge and temporary knowledge in one task, then correct the strategy before retrying.
- `FORM_DATA_FIELD_MISMATCH`: re-display the full field list and ensure future edits use the exact field keys shown in the list.
- `TASK_TIMEOUT`: provide `job_id`, explain that SnapFill timed out, and suggest retrying or resuming later through SnapFill. Do not switch to manual document editing as a substitute.
- `JOB_STATUS_CONFLICT`: tell user to wait for the next stage.

## Output Style

- Keep status updates short and precise.
- Do not expose raw API key, stack trace, or internal HTTP details.
