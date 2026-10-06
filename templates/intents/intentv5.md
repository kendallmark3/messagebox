# AI Suggestion Box — V5 Intent

Builds on [intentv1.md](intentv1.md), [INTENT.md](INTENT.md), [intentv2.md](intentv2.md), and [intentv3.md](intentv3.md). It replaces the analysis contract, prompt, and screen section defined in V3; everything else in V1 to V3 stays as built. It does not depend on [intentv4.md](intentv4.md), which is not yet implemented.

Status: implemented. The **As Built** section at the end records the decisions the implementation made.

## 1. Intent / Goal

Make the analysis that runs on approval **evidence-led**: it should say what the evidence justifies doing next, and only then, conditionally, what could be built.

> Don't architect the imagined solution. Architect the smallest next move the evidence justifies.

The workbench is not there to show how clever the architect is. It helps decide whether another tool is even needed. Prototype → Pilot → Investment should mean increasingly stronger evidence, not increasingly bigger software.

## 2. Inputs / Context

### What prompted this

A review of a V3 analysis for a real test idea (weekly status reporting, taken to Pilot) found three weaknesses:

1. **Facts and guesses were mixed.** Loose reviewer notes such as "we ran pilot on a react app", "100 tests and they all passed", and "100 k savings" sat beside measured results. Nothing stopped them from becoming architectural "facts".
2. **The architecture came first and ran long.** The evidence already supported a plain conclusion: do not build yet, measure the remaining 32 minutes. The analysis reached it only in its last field, after about 800 words of solution design.
3. **Nothing said what would justify building.** The pipeline had no stated bar for investing.

### Current state

- V3 is implemented and merged. Moving an idea from Evidence to Prototype starts the analysis; a reviewer can run it again from Review Pipeline at Prototype or beyond.
- The V3 result has ten fields led by `summary` and `pattern`, with unknowns under `assumptions` and the next action last, under `firstPrototype`.
- The analysis is given the suggestion, the evaluation, the reviewer notes, and any outcome. That does not change.
- Existing stored analyses are in the V3 shape.

### What V5 changes

| V3 | V5 |
| --- | --- |
| Leads with a proposed pattern | Leads with a recommendation and the smallest next move |
| Unknowns listed as assumptions | Evidence sorted into known, reported but unverified, and inferred |
| Architecture stated as the proposal | Architecture shown only as "If automation is justified…" |
| No bar for building | A fixed investment trigger on every analysis, plus what would meet it for this idea |
| About 600 to 800 words | About half that |

When it runs, who can see it, how failures are handled, and how it is stored are unchanged from V3.

## 3. Outputs

### The analysis

| Field | Content |
| --- | --- |
| `recommendation` | Exactly one of: `Do not build yet`, `Change the process first`, `Build the smallest next step` |
| `nextMove` | The smallest next move the evidence justifies, concrete enough to start this week |
| `reason` | Why that is the right move, pointing at the evidence |
| `evidence.known` | Facts the records state with a measurement, a count, or a direct observation |
| `evidence.reportedUnverified` | Claims the records make without saying how they were measured or what they refer to |
| `evidence.inferred` | What the analysis itself is guessing or reading between the lines |
| `buildTrigger` | The specific evidence that would justify building something for this idea |
| `ifJustified.pattern` | A plain-language name for the solution shape, should building be justified |
| `ifJustified.summary` | What it would do, in one or two sentences |
| `ifJustified.components` | Two to four main parts, each with a name and a one-sentence responsibility |
| `ifJustified.dataAndSystems` | What it would touch, as far as the known evidence reveals |
| `risks` | Up to three things that could make this the wrong call |
| `generatedAt` | Timestamp, added by the server |

Rules for the content:

- **Sorting evidence.** Every item says where it came from in the records. A number with a described sample or method is known. A claim with no method, an unclear reviewer note, or a mention of a technology or a money figure with no backing is reported but unverified. Unclear notes are quoted as written, not interpreted.
- **Only known evidence carries weight.** The recommendation, the reason, and the conditional architecture rest on known items. Anything that leans on an unverified or inferred item says so in the same sentence.
- **Recommend before designing.** `Build the smallest next step` is chosen only when known evidence shows a process change will not be enough. Otherwise the recommendation is to measure or to change the process, and the next move says exactly what to measure or change.
- **The architecture is conditional and small.** It is what could be built if the build trigger is met, not a proposal to build it now.
- **Still no invention.** No systems, vendors, team names, costs, or timelines that the records do not contain. No AI by default.
- **Short.** Readable in about a minute; around 300 words in total.

### The investment trigger

Every analysis carries this line, in the same words, shown directly under the recommendation:

> **Investment trigger:** Build only if evidence shows the next increment will produce enough measurable value to justify its cost and operational burden.

It is fixed text supplied by the workbench, not written by AI. The idea-specific `buildTrigger` appears beside it as "For this idea, that means".

### On the screen

The section on the idea detail is titled **Analysis** and reads top to bottom:

1. The recommendation, as the most prominent element, with the next move and the reason.
2. The investment trigger and what it means for this idea.
3. **What the evidence says**, in three labelled groups: Known, Reported but unverified, Inferred. A group with nothing in it says so.
4. **If automation is justified…**, containing the pattern, summary, parts, and what it would touch. It is visually secondary to the recommendation.
5. Risks.

The "AI-generated suggestion" label, the run-again control, the waiting state, and the failure state behave as in V3. On the Review Pipeline board the marker reads "Analysis".

An analysis stored in the V3 shape is still shown, in its V3 layout, with a note that it predates the evidence-led format and can be run again.

## 4. Success Criteria

A reviewer reading an analysis can:

1. See within the first few lines whether the recommendation is to build, and what to do next.
2. Tell which statements are measured facts, which are unverified claims, and which are the analysis's own guesses.
3. See the investment trigger and what evidence would meet it for this idea.
4. Find the possible architecture clearly marked as conditional.
5. Read the whole thing in about a minute.

Run again on the status-reporting test idea, the analysis treats the "react app", "100 tests", and "100 k savings" notes as reported but unverified, and does not build on them.

## Acceptance Criteria

- Every analysis has a recommendation from the allowed set, a next move, a reason, and a build trigger.
- Every analysis shows the fixed investment trigger in exactly the words above.
- The three evidence groups are always present on the screen, including when one is empty.
- There is at least one known or reported item; an analysis with no evidence listed at all is treated as a failure.
- The conditional architecture has two to four parts and is shown under "If automation is justified…".
- Live analyses of the four example ideas and the status-reporting test idea average no more than about 400 words.
- An unclear reviewer note appears under reported but unverified, quoted, and is not used as the basis for the recommendation or the architecture.
- A V3-shaped stored analysis still displays, with the note that it can be run again.
- All V1 to V3 acceptance criteria that V5 does not replace still pass.

## Constraints

- Still one analysis call per run, with structured output. No extra AI call, no chat, no multi-agent orchestration.
- The trigger for the analysis, its eligibility rules, storage, and status handling are unchanged from V3.
- The investment trigger text is owned by the workbench and is the same on every analysis.
- The recommendation does not block or automate stage moves. Reviewers still decide.
- No diagrams, generated code, cost estimates, or delivery plans.
- Extend the existing server and page. No framework, build step, database, or new dependency.

## Validation / Evidence

Using a separate idea store:

- Against the stand-in API: confirm the new section renders in full, the fixed trigger line is present, an empty evidence group is shown as empty, a result with no evidence is rejected, and a V3-shaped analysis still displays with its note.
- Against the live Anthropic API: run the analysis on a copy of the status-reporting test idea with its original reviewer notes, and on the four example ideas from intentv1.md with realistic notes. Record each in full.
- Read the live results against the content rules: which group each loose note landed in, whether the recommendation rests on known evidence, whether the architecture is conditional, and the word count.
- Re-run the V1 to V3 browser checks to confirm nothing else changed.
- Capture a screenshot of the new section.

Report what was actually observed, including anything that failed or could not be checked.

## Stop Condition

Stop when a live analysis leads with a recommendation, separates known from unverified from inferred, carries the investment trigger, shows the architecture as conditional, and is about half the V3 length, with the acceptance criteria evidenced. Do not continue into scoring ideas, blocking stage moves on the recommendation, re-running the analysis automatically at later stages, or verifying claims against outside sources.

## As Built

### The analysis call

- Unchanged from V3 in how it is made: `claude-opus-5-5` through `messages.parse` with the contract as a zod schema, effort `medium`, `max_tokens` 16000, a 90-second timeout, and one retry. The user message is built from the idea exactly as V3 describes.
- `recommendation` is an enumerated field. `evidence` holds three lists of strings. `ifJustified` holds `pattern`, `summary`, `components` (a list of `{ name, responsibility }`), and `dataAndSystems`. `risks` is a list of strings. `generatedAt` is added by the server.
- A result is stored only if it matches the schema, no text is blank, there is at least one component, and `known` and `reportedUnverified` together hold at least one item. Otherwise it counts as a failure and any earlier analysis is kept.
- The counts in the contract (two to four parts, up to three risks, about 300 words) are asked for in the prompt and are not enforced by code.
- The system prompt is in the appendix below. It replaces the V3 prompt.

### Messages

| Situation | Message |
| --- | --- |
| Below Prototype | An analysis is only produced once an idea reaches Prototype. |
| Already running | An analysis is already being produced for this idea. |
| API failure or incomplete result | The analysis couldn't be produced. Please try again. |
| Refusal | An analysis couldn't be produced for this idea. |

### Page

- The card is titled "Analysis" with the violet "AI-generated suggestion" pill and the line "Produced <date> from this idea's suggestion, evaluation, and reviewer notes. Check it with the people who would act on it."
- **Recommendation block:** a tinted panel with a coloured left edge, holding the label "Recommendation", the recommendation in large type, "Smallest next move:" with the next move, and the reason. Do not build yet is orange, Change the process first is blue, Build the smallest next step is green.
- **Trigger block:** a bordered panel with "Investment trigger:" followed by the fixed sentence, and "For this idea, that means:" followed by the build trigger. The fixed sentence is a constant in `public/app.js`.
- **What the evidence says:** three columns, Known ("Measured or directly observed."), Reported but unverified ("Stated without saying how it was measured."), and Inferred ("The analysis's own reading."). An empty group shows "Nothing in this group."
- **If automation is justified…:** a dashed-border panel in muted ink, holding the pattern name in bold with the summary, the parts as a list, and "It would touch:" with the data and systems.
- **Risks:** a plain list, or "None identified."
- While running, the notice reads "Producing an analysis for this idea…", or "Producing a new analysis…" above an existing one. The empty state in Review Pipeline is titled "Analysis". The board pill reads "Analysis".
- An analysis without a `recommendation` field is treated as V3-shaped. It is shown in the V3 layout under its old title, "Potential architecture", with the line "Produced <date>, before the evidence-led format. Run the analysis again from Review Pipeline to update it."

### How it was validated

- Against the stand-in API, in headless Chrome with a separate idea store: the new section and its order, the fixed trigger sentence, an empty evidence group, a result with no evidence (rejected, nothing stored, move kept), a V3-shaped analysis (displayed with its note, then replaced on run-again), and the refusals below Prototype and during a run. The V1 and V2 checks were repeated on the V5 code.
- Against the live API: a copy of the status-reporting test idea with its original reviewer notes, and the four example ideas with realistic notes. Each analysis arrived in 14 to 18 seconds.
  - The status-reporting analysis listed "we rab 100ntest and they all passes", "we ran piot on a react app", "high cost", and "100 k savings" under reported but unverified, quoted as written, and noted that the React app claim conflicts with the recorded pilot. It recommended Change the process first, resting on the measured 70 to 32 minutes across 31 people.
  - All five recommended Change the process first, each with a concrete next move and a measurable build trigger. None proposed AI.
  - Word counts were 453, 403, 433, 366, and 415, an average of 414. That is just over the 400 the acceptance criteria ask for, and down from about 600 to 790 under V3.

## Appendix: Analysis System Prompt

```text
You advise on the smallest next move for an employee idea that has been approved to move toward prototyping.

Your job is not to design a solution. It is to say what the evidence justifies doing next, and whether anything needs to be built at all. Do not architect the imagined solution; architect the smallest next move the evidence justifies. Moving along the pipeline should mean stronger evidence, not bigger software.

You are given everything recorded about the idea: the employee's original suggestion, an earlier evaluation, the reviewers' notes from each stage move, and an outcome if one was recorded. That is all you know. You have no knowledge of the organisation's systems, teams, budgets, or tools beyond what those records say.

Your reader is a business reviewer. Write in plain language, in short sentences.

First sort the evidence. Each item is one short sentence that says where it comes from (the suggestion, a named stage note, or the outcome).
- evidence.known: facts the records state with a measurement, a count, a sample, or a direct observation.
- evidence.reportedUnverified: claims the records make without saying how they were measured or what they refer to. This includes unclear or garbled reviewer notes, a technology that is named but not described, and money or savings figures with no backing. Quote an unclear note as written; do not interpret it into a fact.
- evidence.inferred: what you yourself are guessing or reading between the lines.
Use an empty list where there is nothing to put in a group. Do not list the same item twice.

Then decide.
- recommendation: "Do not build yet" when the next step should be to measure or verify something; "Change the process first" when a change with no new software is the obvious next thing to try; "Build the smallest next step" only when known evidence shows a process change will not be enough.
- nextMove: the smallest next move the evidence justifies, concrete enough to start this week. Say exactly what to measure, change, or build, and with whom.
- reason: why that is the right move, in two or three sentences that point at the known evidence.
- buildTrigger: the specific, measurable evidence that would justify building something for this idea.

Then, briefly and conditionally, describe what could be built if that trigger were met.
- ifJustified.pattern: a short plain-language name for the solution shape.
- ifJustified.summary: what it would do, in one or two sentences.
- ifJustified.components: two to four main parts, each with a name and a one-sentence responsibility.
- ifJustified.dataAndSystems: what it would need to touch, as far as the known evidence reveals. Say plainly what is not known.

- risks: up to three things that could make your recommendation the wrong call.

Only known evidence carries weight. Base the recommendation, the reason, and the conditional design on known items. If a sentence leans on an unverified or inferred item, say so in that sentence.
Do not invent systems, vendors, team names, costs, or timelines. Do not reach for AI by default.
Keep it short: about 300 words across all fields, readable in a minute.
```
