# AI Suggestion Box — V3 Intent

Builds on [intentv1.md](intentv1.md), [INTENT.md](INTENT.md), and [intentv2.md](intentv2.md). Everything in V1 and V2 stays as built unless this file says otherwise.

Status: implemented. The **As Built** section at the end records the decisions the implementation made.

## 1. Intent / Goal

When an idea has gathered its evidence and a reviewer approves it to go further, the workbench runs an AI analysis and proposes a **potential architectural pattern** for how the idea might be built.

Until now the workbench has only said whether an idea is worth pursuing. V3 adds the next question: if it is, what shape could a solution take? The answer is a starting point for the people who will prototype it, not a decision and not a design.

The product principle holds. Employees still submit problems and opportunities, never technologies. A solution shape is only proposed after the idea has earned it.

## 2. Inputs / Context

### State when this intent was written

- V2 was implemented: [server.js](server.js) stored ideas in `data/ideas.json` and exposed the ideas API, with stage moves going one step at a time and needing a note. [public/app.js](public/app.js) built the views and the idea detail.
- The only AI call was the evaluation at submission. Its six-field result was stored on the idea and never regenerated.
- There was no concept of approval. Anyone could move an idea, and the move with its note was the only record of why.

### What approval means in V3

A reviewer moving an idea from **Evidence** to **Prototype** is the approval. The required note is the approver's reason. No separate approve action, approver role, or sign-off chain is added.

### V2 constraints that V3 relaxes

| V2 constraint | V3 position |
| --- | --- |
| The only AI call is the evaluation at submission | A second AI call, the analysis, runs once an idea is approved |

All other V1 and V2 constraints still apply.

### What the analysis is given

Only what is already stored on the idea:

- the employee's original suggestion,
- the six-field evaluation,
- the stage history, including every reviewer note,
- the recorded outcome, if there is one.

Nothing else. It has no access to company systems, documents, or the other ideas.

## 3. Outputs

### The analysis

One structured result, stored on the idea:

| Field | Content |
| --- | --- |
| `summary` | What a solution would need to do, in two or three sentences |
| `pattern` | The name of the proposed architectural pattern, in plain terms |
| `whyItFits` | Why this pattern suits the problem as described and evidenced |
| `components` | Three to six main parts, each with a name and a one-sentence responsibility |
| `dataAndIntegrations` | What information and existing systems it would need to touch, as far as the idea reveals |
| `simplerAlternative` | The cheapest option that might be enough, including a process change with no new software |
| `assumptions` | What the analysis had to assume because the idea did not say |
| `risks` | The main things that could make this the wrong shape |
| `firstPrototype` | The smallest thing to build to test the pattern |
| `generatedAt` | Timestamp |

Rules for the content:

- It works from the stored information only and does not invent systems, vendors, team names, costs, or timelines.
- Anything unknown goes under `assumptions`, not into the proposal as fact.
- It does not default to AI. It proposes AI only where the problem calls for it, and always names a simpler alternative.
- It stays short enough to read in a couple of minutes.

### When it runs

- It starts automatically when an idea is moved from Evidence to Prototype.
- The stage move succeeds whether or not the analysis does. A failed analysis never blocks or undoes an approval.
- If it fails, the idea shows a plain error. In Review Pipeline the error comes with a way to run it again.
- A reviewer can run it again later, for example after new notes are added. The new result replaces the old one.
- Moving an idea back to Evidence keeps the stored analysis and keeps it visible, but it cannot be run again until the idea is at Prototype or beyond.
- Ideas already at Prototype or beyond when V3 arrives have no analysis; a reviewer can run it for them by hand.

### Where it appears

- On the idea detail, as a section titled **Potential architecture**, for every idea that has one. It is visible from My Ideas, Review Pipeline, and Impact.
- The section is clearly labelled as an AI-generated suggestion to be checked by the people who will build it.
- The controls to run it again appear only in Review Pipeline, alongside the other reviewer controls.
- While it is being produced, the section shows a waiting state. The rest of the idea stays usable.
- Review Pipeline marks every idea that has an analysis.

## 4. Success Criteria

A reviewer can:

1. Move an idea from Evidence to Prototype and, without doing anything else, see a potential architecture appear on it.
2. Read what pattern is proposed, why, its main parts, and the simpler alternative.
3. See what the analysis assumed and what could make it wrong.
4. Find the same analysis on the idea after a refresh and after a server restart.
5. Run the analysis again and see the new result replace the old one.

An employee can open their own idea in My Ideas and read the potential architecture once it exists.

## Acceptance Criteria

- An idea below Prototype never has an analysis started for it, on the page or by direct request to the server.
- The move from Evidence to Prototype is saved and shown even when the analysis fails.
- A failed or malformed analysis is never shown or stored in part; the previous analysis, if any, stays.
- Opening an idea never triggers an AI call. Only the approval move and an explicit run-again do.
- A second run cannot be started for an idea while one is already in progress.
- The analysis reflects the reviewer notes: an idea whose notes mention a specific fact has that fact taken into account or listed, not contradicted.
- Every analysis includes a simpler alternative and at least one assumption or an explicit statement that none were needed.
- The section carries its AI-generated label wherever it is shown.
- The API key still never reaches the browser.
- All V1 and V2 acceptance criteria still pass.

## Constraints

- One additional AI call per run, with structured output. No chat, no follow-up questions, no multi-agent orchestration, no AgentCore.
- No diagrams, generated code, cost estimates, or delivery plans.
- No approval routing, approver roles, or sign-off chain. The stage move is the approval.
- AI still does not move ideas between stages and does not produce analytics or impact figures.
- Deterministic code decides when the analysis may run and owns storage.
- Extend the existing server and page. No framework, build step, or database, and no new dependency unless unavoidable.
- No authentication or accounts.
- Only the latest analysis is kept.
- Desktop-first, consistent with the existing screens.

## Validation / Evidence

There is still no test suite, build, or linter, so evidence comes from the running application:

- Against the stand-in API: approve an idea and confirm the analysis appears; force a failure and a malformed result and confirm the move stands, nothing partial is stored, and run-again works.
- Request an analysis for an idea at Problem and at Evidence and confirm it is refused.
- Restart the server and confirm the analysis is still on the idea.
- Against the live Anthropic API: take the four example ideas from intentv1.md through to Prototype with realistic notes and record each analysis in full.
- Read those four live analyses against the content rules: nothing invented, assumptions listed, a simpler alternative present, AI not proposed by default.
- Re-run the V1 and V2 browser checks to confirm nothing regressed.
- Capture a screenshot of an idea showing its potential architecture.

Report what was actually observed, including anything that failed or could not be checked.

## Stop Condition

Stop when an approved idea reliably gets a stored, readable potential architecture, the acceptance criteria are met with evidence, and V1 and V2 behavior is intact. Do not continue into diagrams, cost or effort estimates, comparison of multiple patterns, or generating prototype code.

## Decisions Made

Each was built with the default below; none was changed by the author.

1. **Which move counts as "approved"?** Evidence → Prototype, because a solution shape is most useful just before prototyping.
2. **Automatic or on request?** The analysis starts automatically on approval, with a manual run-again.
3. **Who can see it?** Anyone who can open the idea, including the employee who submitted it.
4. **How technical should it be?** Plain language a business reviewer can follow, with pattern names explained.

## As Built

### The analysis call

- The same model and method as the evaluation: `claude-opus-5-5` through `messages.parse`, with the analysis contract as a zod schema, `max_tokens` 16000, a 90-second timeout, and one retry. Effort is `medium`.
- `components` is a list of `{ name, responsibility }`; `assumptions` and `risks` are lists of strings; the other fields are strings. `generatedAt` is added by the server, not the model.
- The system prompt is in the appendix below.
- The user message is built from the idea in this order: the heading "Employee's suggestion:" and the text; "Earlier evaluation:" with each of the six fields as `- field: value`; "Reviewer notes, oldest first:" with each move as `- From to To: note`, or `- none`; and, if recorded, "Recorded outcome:" with the description and the reviewer's hours estimate.
- A result is stored only if it matches the schema and no text is blank, there is at least one component, and there is at least one assumption. Otherwise it counts as a failure.

### Running and status

- A forward move into Prototype saves the move, then starts the analysis in the background, so the move's response returns at once.
- `POST /api/ideas/:id/analysis` starts a run on request. It returns 202 with the idea, 409 if the idea is below Prototype, and 409 if a run is already in progress.
- Every idea returned by the API carries `analysisStatus` (`none`, `running`, `failed`, or `ready`) and `analysisError` (the message, when failed).
- Running and failed states are held in memory only. After a restart a stored analysis is `ready`, and an idea with none is `none` and can be run by hand.
- A successful run replaces `analysis` and is written to the idea store. A failed run leaves any earlier analysis in place.

| Situation | Message |
| --- | --- |
| Below Prototype | A potential architecture is only produced once an idea reaches Prototype. |
| Already running | A potential architecture is already being produced for this idea. |
| API failure or incomplete result | The potential architecture couldn't be produced. Please try again. |
| Refusal | A potential architecture couldn't be produced for this idea. |

### Page

- The section sits on the idea detail between Evaluation and Outcome.
- While a run is in progress it shows a spinner with "Producing a potential architecture for this idea…", or "Producing a new potential architecture…" when an earlier one is still displayed beneath it. The page asks the server for the idea every two seconds and redraws only this section, so a note being typed elsewhere on the page is kept.
- The card is titled "Potential architecture" with a violet "AI-generated suggestion" pill, and the line "Produced <date> from this idea's suggestion, evaluation, and reviewer notes. Check it with the people who will build it."
- Its fields, in order: Proposed pattern (the pattern name in bold with the summary beneath, full width, blue tint); Why it fits (full width); Main parts (full width, each as a bold name and its responsibility); Data and systems it would touch; A simpler alternative; Assumptions; Risks; Smallest first prototype (full width).
- In Review Pipeline, for an idea at Prototype or beyond, the card ends with "Run the analysis again"; an idea with no analysis shows "No analysis has been produced for this idea yet." and "Run the analysis"; a failure shows "Try again".
- From My Ideas and Impact the section is read-only.
- On the Review Pipeline board, an idea with an analysis carries a violet "Architecture" pill beside its recommendation.

### How it was validated

- Against the stand-in API, in headless Chrome with a separate idea store: the trigger on approval, the waiting state, a failed result, a malformed result, run-again, refusals below Prototype and during a run, moving back, refresh, and restart. The V1 and V2 checks were repeated on the V3 code.
- Against the live API: the four example ideas from intentv1.md were taken to Prototype with realistic reviewer notes. Each analysis arrived in 16 to 18 seconds, used the reviewer notes, named a simpler alternative, listed assumptions, and did not propose AI. Each ran to about 600 words.

## Appendix: Analysis System Prompt

```text
You propose a potential architectural pattern for an employee idea that has been approved to move into prototyping.

You are given everything recorded about the idea: the employee's original suggestion, an earlier evaluation, the reviewers' notes from each stage move, and an outcome if one was recorded. That is all you know. You have no knowledge of the organisation's systems, teams, budgets, or tools beyond what those records say.

Your reader is a business reviewer and the people who will build the prototype. Write in plain language, and when you name a pattern, name it in words a non-engineer can follow.

Fill in each field:
- summary: what a solution would need to do, in two or three sentences.
- pattern: a short plain-language name for the solution shape you propose.
- whyItFits: why that shape suits this problem, given what was written and what the reviewers recorded.
- components: three to six main parts, each with a name and a one-sentence responsibility.
- dataAndIntegrations: what information and existing systems it would need to touch, as far as the records reveal. Say plainly what is not known.
- simplerAlternative: the cheapest option that might be enough. Consider a change to the process with no new software.
- assumptions: what you had to assume because the records did not say. If you assumed nothing, give one entry saying so.
- risks: the main things that could make this the wrong shape.
- firstPrototype: the smallest thing to build or try that would test the pattern.

Take the reviewers' notes into account; they are the evidence. Do not contradict a fact recorded there.
Do not invent systems, vendors, team names, costs, or timelines. Put anything unknown under assumptions rather than stating it as fact.
Do not reach for AI by default. Propose AI only where the problem genuinely calls for it.
This is a starting point for discussion, not a design. Keep the whole thing readable in a couple of minutes.
```
