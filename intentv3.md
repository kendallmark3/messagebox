# AI Suggestion Box — V3 Intent

Builds on [intentv1.md](intentv1.md), [INTENT.md](INTENT.md), and [intentv2.md](intentv2.md). Everything in V1 and V2 stays as built unless this file says otherwise.

## 1. Intent / Goal

When an idea has gathered its evidence and a reviewer approves it to go further, the workbench runs an AI analysis and proposes a **potential architectural pattern** for how the idea might be built.

Until now the workbench has only said whether an idea is worth pursuing. V3 adds the next question: if it is, what shape could a solution take? The answer is a starting point for the people who will prototype it, not a decision and not a design.

The product principle holds. Employees still submit problems and opportunities, never technologies. A solution shape is only proposed after the idea has earned it.

## 2. Inputs / Context

### Current state

- V2 is implemented on the `feature/v2-idea-lifecycle` branch, which is pushed but not merged into `main`. V3 work starts from that branch.
- [server.js](server.js) stores ideas in `data/ideas.json` and exposes the ideas API. Stage moves go one step at a time and need a note. [public/app.js](public/app.js) builds the views and the idea detail.
- The only AI call is the evaluation at submission. Its six-field result is stored on the idea and never regenerated.
- There is no concept of approval. Anyone can move an idea, and the move with its note is the only record of why.
- The live Anthropic API has been validated for the evaluation call only.

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
- If it fails, the idea shows a plain error and a way to run it again.
- A reviewer can run it again later, for example after new notes are added. The new result replaces the old one.
- Moving an idea back to Evidence keeps the stored analysis.
- Ideas already at Prototype or beyond when V3 arrives have no analysis; a reviewer can run it for them by hand.

### Where it appears

- On the idea detail, as a section titled **Potential architecture**, for every idea that has one. It is visible from My Ideas, Review Pipeline, and Impact.
- The section is clearly labelled as an AI-generated suggestion to be checked by the people who will build it.
- The controls to run it again appear only in Review Pipeline, alongside the other reviewer controls.
- While it is being produced, the section shows a waiting state. The rest of the idea stays usable.
- Review Pipeline marks which ideas at Prototype or beyond have an analysis.

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

## Decisions to Confirm

Each has a default that will be used unless changed.

1. **Which move counts as "approved"?** Default: Evidence → Prototype, because a solution shape is most useful just before prototyping. The alternative is a later point, such as Pilot → Investment.
2. **Automatic or on request?** Default: the analysis starts automatically on approval, with a manual run-again. The alternative is a button only, so no AI call is made unless a reviewer asks.
3. **Who can see it?** Default: anyone who can open the idea, including the employee who submitted it. The alternative is reviewers only.
4. **How technical should it be?** Default: plain language a business reviewer can follow, with pattern names explained. The alternative is a version written for engineers.
