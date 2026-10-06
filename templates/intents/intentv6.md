# AI Suggestion Box — V6 Intent

Builds on [intentv1.md](intentv1.md), [INTENT.md](INTENT.md), [intentv2.md](intentv2.md), [intentv3.md](intentv3.md), and [intentv5.md](intentv5.md). Everything in those stays as built unless this file says otherwise. It does not depend on [intentv4.md](intentv4.md), which is not yet implemented.

Status: implemented. The **As Built** section at the end records the decisions the implementation made. [intentv7.md](intentv7.md) later added a required admin approval in front of Investment, which is checked before this gate and has no override.

## 1. Intent / Goal

Put an **evidence gate** on every forward stage move, so an idea advances because its evidence got stronger, not because someone typed "approved".

Prototype → Pilot → Investment should mean increasingly stronger evidence. Today the stages are labels: nothing checks what a move rests on. The gate asks one question at the moment of decision: does what has been recorded meet the bar for the next stage?

The reviewer still decides. The gate informs the decision and records it; it never takes it away.

## 2. Inputs / Context

### What prompted this

In the author's own test, an idea went from Problem to Investment on the notes "100 hoyrs used last week", "too much hassle always late managen]ment confused", "show example", and "approved". The V5 analysis can tell measured evidence from loose claims, but it runs once, after the fact, and affects nothing.

### Current state

- A reviewer moves an idea one stage at a time from "Move this idea" in Review Pipeline. A note of 1 to 500 characters is required. The move is saved immediately.
- Each move is recorded in the idea's history as `from`, `to`, `note`, and `at`.
- Moving forward into Prototype starts the V5 analysis in the background.
- There are two AI calls: the evaluation at submission and the analysis on approval.

### The bars

One fixed bar per forward move, owned by the workbench and shown to the reviewer before they move:

| Move | The bar |
| --- | --- |
| Problem → Evidence | Something about the problem has been measured or counted, not only asserted. |
| Evidence → Prototype | The measurements show the problem is big enough to be worth a small test. |
| Prototype → Pilot | A small test has been run and its result is recorded. |
| Pilot → Investment | Real users tried it over a stated period and the measured result is recorded. |

### What the gate is given

The idea's record (the suggestion, the evaluation, the earlier reviewer notes, and any outcome), the proposed move, the bar for it, and the note the reviewer has just written. Nothing else.

## 3. Outputs

### The check

When a reviewer moves an idea forward, the workbench checks the record and the new note against the bar and returns:

| Field | Content |
| --- | --- |
| `verdict` | Exactly one of: `Meets the bar`, `Not yet` |
| `reason` | Why, in one or two sentences |
| `known` | The recorded evidence the verdict rests on, each item saying where it comes from |
| `unverified` | Claims in the note or record that do not count, quoted as written |
| `missing` | For `Not yet`: the one thing to go and get, concretely. Empty when the bar is met |

Rules for the judgement:

- Evidence anywhere in the record counts, not only in the new note. A note does not have to repeat what the suggestion or an earlier note already established.
- Only measured, counted, or directly observed facts count. Approval, opinion, enthusiasm, and intention are not evidence.
- An unclear or garbled note is quoted under unverified and is not interpreted into a fact.
- It is neither a pushover nor a nag. If the bar is plainly met, it passes without asking for more. If it is not, it asks for one concrete thing, not a list.
- A `Meets the bar` verdict with no known evidence listed is treated as `Not yet`.

### What happens next

- **Meets the bar:** the move is saved as today, and the check is recorded with it.
- **Not yet:** nothing is saved. The reviewer sees the reason, what does not count, and what is missing. They can then:
  - improve the note and check again, or
  - move anyway by giving a reason. The move is saved, and the check and the override reason are recorded with it.
- **The check cannot be run** (for example, the AI service is unavailable): nothing is saved, the reviewer is told, and they can try again or move anyway with a reason. The move is then recorded as not checked.
- Moving an idea **back** is never gated.

### The record

Each forward move in the history gains the check (verdict, reason, known, unverified, missing, and when it was checked) and the override reason, if there was one. Moves made before V6 have neither and are shown as before.

### On the screen

- "Move this idea" shows the bar for the next stage above the note box.
- While the check runs, the form shows that the evidence is being checked and cannot be submitted twice.
- A `Not yet` result appears inside the form, with the note still editable, and offers "move anyway" with a reason box.
- In Stage history, each checked move shows whether it met the bar, was overridden (with the reason), or was not checked, and the evidence the check rested on.
- On the Review Pipeline board, an idea whose latest move was an override carries a visible marker.

## 4. Success Criteria

A reviewer can:

1. See what the next stage requires before moving an idea.
2. Move an idea forward with a note that contains real evidence and have it go through, with the evidence it rested on recorded.
3. Try to move an idea forward on "approved" and be told what is missing.
4. Add the missing evidence and move it, or move it anyway with a reason.
5. Look at any idea later and see which moves met the bar and which were overridden, and why.

Replaying the author's test idea with its original notes, the gate does not pass "show example" or "approved".

## Acceptance Criteria

- Every forward move is checked. No forward move is saved without either a `Meets the bar` verdict or an override reason, including by direct request to the server.
- A `Not yet` result saves nothing: the stage and the history are unchanged.
- An override reason is required to move anyway, 1 to 500 characters, and is stored with the move.
- When the reviewer moves anyway with the note they were just shown a result for, that result is the one recorded; the check is not run a second time.
- A backward move is saved without a check, as before.
- A second forward move cannot be started for an idea while a check is in progress.
- The analysis on entering Prototype still starts, whether the move met the bar or was overridden.
- A failed check never loses the reviewer's note.
- Ideas and history stored before V6 open and display as before.
- On a fixed set of live notes, notes with measured evidence pass and notes that are approvals, opinions, or intentions do not.
- All earlier acceptance criteria that V6 does not replace still pass.

## Constraints

- One additional AI call per forward move attempt, with structured output. No chat and no multi-agent orchestration.
- The bars are fixed text owned by the workbench. No bar editor, no per-team bars.
- The gate never blocks a human outright, and AI never moves an idea.
- No roles: anyone who can move an idea can override.
- The gate does not verify claims against outside sources. It judges what is recorded.
- Deterministic code decides whether a move is saved; the AI only supplies the judgement.
- Extend the existing server and page. No framework, build step, database, or new dependency.

## Validation / Evidence

Using a separate idea store:

- Against the stand-in API, in a browser: a passing move, a `Not yet` result, improving the note and passing, moving anyway with a reason, a failed check followed by moving anyway, a backward move, and a double submission. Confirm what is stored after each.
- Send forward-move requests directly to the server without an override and with a failing note, and confirm nothing is saved.
- Open an idea with pre-V6 history and confirm it displays.
- Against the live Anthropic API, a fixed set:
  - the author's free-text test idea, reset to Problem, replayed with its four original notes;
  - an example idea moved with four notes that each contain measured evidence;
  - an example idea attempted with approvals, opinions, and intentions ("approved", "looks good to me", "management wants this", "we will build an app");
  - the filled template example moved with a bare "approved", to confirm that evidence already in the record counts.
  Record every verdict in full.
- Re-run the earlier browser checks to confirm nothing else changed.
- Capture screenshots of a `Not yet` result and of a history showing a met check and an override.

Report what was actually observed, including anything that failed or could not be checked.

## Stop Condition

Stop when forward moves are gated, overrides are recorded and visible, the live set shows the gate separating evidence from approval, and earlier behavior is intact. Do not continue into roles or permissions, configurable bars, re-running the analysis at each gate, override reports in Analytics, or blocking moves outright.

## As Built

### The check call

- Made the same way as the other two calls: `claude-opus-5-5` through `messages.parse` with the contract as a zod schema, `max_tokens` 16000, a 90-second timeout, and one retry. Effort is `low`.
- The user message is the idea's record in the form V3 defines for the analysis, followed by "Proposed move: <from> to <to>", "Bar for this move: <bar>", and "Reviewer's new note for this move:" with the note.
- In that record, a past move that was overridden is marked "(moved without meeting the evidence bar)", so later checks and the analysis do not read an overridden note as established evidence.
- Code applied after the model answers: a result with a blank reason or a blank list item is a failed check; `Meets the bar` with no known items becomes `Not yet`; `Not yet` with nothing under `missing` is a failed check; `missing` is cleared when the bar is met. `checkedAt` is added by the server.
- The system prompt is in the appendix below. The four bars are the constant `GATE_BARS` in `server.js`.

### API

`POST /api/ideas/:id/stage` now takes `{ direction, note, overrideReason? }` and always answers 200 with `{ idea, moved, gate, checkError }` when the request itself is valid.

| Request | Result |
| --- | --- |
| Back | Saved without a check. `moved` is true, `gate` is null. |
| Forward, check says Meets the bar | Saved. The history entry gets `gate` and `override: null`. |
| Forward, check says Not yet, no `overrideReason` | Nothing saved. `moved` is false and `gate` holds the result. |
| Forward, check cannot be run, no `overrideReason` | Nothing saved. `moved` is false, `gate` is null, and `checkError` holds the message. |
| Forward with `overrideReason`, bar not met | Saved. The entry gets `gate` and `override` set to the reason. |
| Forward with `overrideReason`, check cannot be run | Saved. The entry gets a `gate` with verdict `Not checked` and the reason as `override`. |
| Forward with `overrideReason`, check says Meets the bar | Saved as a normal pass; the reason is not recorded. |

- `overrideReason` is trimmed and must be 1 to 500 characters ("A reason for moving anyway is required." otherwise). It goes through the same credential check as other text.
- The last `Not yet` result for an idea is kept in memory with the stage and note it was for. Moving anyway with the same note at the same stage records that result without calling the model again. After a restart, or with a different note, the check runs again.
- While a check is running for an idea, another forward move for it is refused with 409 "The evidence for this idea is already being checked."
- When the check cannot be run, the message is "The evidence check couldn't be run."
- Every idea returned by the API carries `nextGate`: `{ to, bar }` for the next stage, or null at Investment.

### Page

- "Move this idea" shows a blue-tinted line above the note box: "To move to <stage>:" and the bar. The note box placeholder is "What has been measured or observed since the last stage?"
- Pressing "Move to <stage> →" shows "Checking the evidence…", disables the buttons, and makes the note read-only until the answer arrives.
- A `Not yet` result appears below the buttons in an orange-edged panel: the heading "Not yet: this does not meet the bar for <stage>", the reason, "What's missing:" with the missing item, the lists "Counts as evidence" and "Does not count" when they have items, the line "Improve the note above and move again, or:", a box labelled "Move anyway, with a reason", and the button "Move to <stage> anyway". Pressing it with no reason shows "Give a reason to move it anyway. It is kept in the idea's history."
- When the check could not be run, the same panel is headed "The evidence could not be checked" and offers the same move-anyway box.
- In Stage history, a checked move carries a pill: green "Met the bar", orange "Overridden", or orange "Not checked, moved anyway". Beneath the note it shows "Moved anyway because:" with the reason when there is one, then the check's reason and its two evidence lists. Moves with no recorded check show no pill.
- On the Review Pipeline board, an idea whose most recent move was an override carries an orange "Overridden" pill.

### How it was validated

- Against the stand-in API, in headless Chrome with a separate idea store: the bar display, the checking state, a refused second attempt during a check, a `Not yet` result with nothing saved and the note kept, the required override reason, a passing move, moving anyway (recorded with one model call, not two), a failed check followed by moving anyway, an ungated back move, direct requests to the server, and pre-V6 history. The V1, V2, V3, and V5 checks were repeated on the V6 code and passed.
- Against the live API, the fixed set in Validation above, 19 checks in all, each answered in 2 to 6 seconds:
  - The author's four original notes were all stopped. "100 hoyrs used last week" was quoted as garbled; "show example" and "approved" were reported as containing no test or result.
  - Four notes with measured evidence all passed, each listing the evidence it rested on.
  - "approved", "looks good to me", "management wants this", and "we will build an app" were all stopped, each with one concrete thing to measure.
  - The filled template example passed all four moves on a bare "approved", resting on the measurements already in the suggestion. In each case "approved" was listed as not counting.
  - In total, notes with evidence passed 8 of 8 and notes without it were stopped 8 of 8.

## Appendix: Gate System Prompt

```text
You check whether an employee idea has earned a move to the next stage of a pipeline: Problem, Evidence, Prototype, Pilot, Investment.

Each move has a bar. Moving along the pipeline should mean stronger evidence, not more enthusiasm. A reviewer wants to move an idea forward and has written a note. Judge whether what is recorded meets the bar for this move.

You are given the idea's record (the employee's suggestion, an earlier evaluation, earlier reviewer notes, and any outcome), the proposed move, the bar for it, and the reviewer's new note. That is all you know.

What counts:
- Only measured, counted, or directly observed facts count as evidence: a number with what it measures, a sample, a duration, a recorded result.
- Evidence anywhere in the record counts, not only in the new note. The note does not have to repeat what the suggestion or an earlier note already established.
- Approval, opinion, enthusiasm, seniority, and intention are not evidence. "Approved", "looks good", "management wants this", and "we will build it" establish nothing.
- The earlier evaluation is commentary, not evidence.
- If a note is unclear or garbled, quote it as written under unverified. Do not interpret it into a fact.

Fill in:
- verdict: "Meets the bar" if the recorded evidence meets the bar for this move, otherwise "Not yet".
- reason: why, in one or two plain sentences.
- known: the recorded evidence your verdict rests on. Each item is one short sentence that says where it comes from (the suggestion, a named stage note, the new note, or the outcome). Empty if there is none.
- unverified: claims in the new note or the record that do not count, quoted as written. Empty if there are none.
- missing: when the verdict is "Not yet", the one thing to go and get, said concretely enough to act on. One or two sentences, not a list. Leave it empty when the bar is met.

Be neither a pushover nor a nag. If the bar is plainly met, say so and do not ask for more. If it is not, ask for the single most useful thing. Judge this move only, not the stages after it.
Do not invent facts. Keep every field short.
```
