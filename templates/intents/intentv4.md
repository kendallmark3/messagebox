# AI Suggestion Box — V4 Intent

**Builds on:** [INTENT.md](INTENT.md) (V1), [intentv2.md](intentv2.md), and [intentv3.md](intentv3.md).

**Status:** Implemented. It was written fourth but built after V5 and V6, so its As Built section describes how it works with the evidence gate.

**Later changes:** the sections below describe V4 as it was specified and built. Later intents changed these parts:

- [intentv6.md](intentv6.md) was already in place when V4 was built: every pre-filled note still goes through the evidence check. Where this file says the workbench makes "only the evaluation and the analysis", there are now three AI calls; V4 itself added none.
- [intentv7.md](intentv7.md) requires an admin's approval before Investment. Taking the filled example "from Problem to Investment without typing" now also needs that approval before the last move.

See [README.md](README.md) in this folder for how the intents fit together.

## 1. Intent / Goal

Let a person submit an idea from a template that already holds what each pipeline stage needs, so nobody has to type it in again as the idea moves.

Today an idea is one block of text, and every stage move needs a note typed from scratch. Someone who already knows the evidence, the prototype result, and the pilot result has to enter it piece by piece. With V4 they paste one filled-in template, and the workbench finds each section and offers it at the stage where it belongs.

The product principle holds. The template asks about the problem and what has been learned, never about technology. A plain free-text suggestion still works exactly as before.

## 2. Inputs / Context

### State when this intent was written

- V1 to V3 are implemented and merged into `main`.
- A submission is free text of 1 to 4,000 characters, evaluated once and stored.
- Stage moves go one step at a time. Each needs a note of 1 to 500 characters, typed by the reviewer in "Move this idea".
- An outcome (a description and estimated hours saved per week) is typed by a reviewer once an idea is at Pilot or Investment.
- Moving an idea from Evidence to Prototype starts the potential-architecture analysis, which reads the reviewer notes.
- [templates/](../) holds [idea-template.txt](../idea-template.txt) (blank) and [example-idea.txt](../example-idea.txt) (filled in). They can be pasted into Submit Idea today, where they are treated as ordinary text.

### The template

Plain text. Each section is a name ending in a colon on its own line, with its content on the lines beneath:

| Section | Belongs to |
| --- | --- |
| Title | The idea's name |
| Problem | The suggestion itself |
| Who it affects | The suggestion itself |
| Evidence | The move Problem → Evidence |
| Why it is worth prototyping | The move Evidence → Prototype |
| Prototype | The move Prototype → Pilot |
| Pilot | The move Pilot → Investment |
| Outcome | The recorded outcome |
| Hours saved per week | The recorded outcome |

Only Problem is required. Any other section may be left out. In the blank template each section holds a `[bracketed prompt]`; a section still holding only its prompt counts as empty.

### Runtime inputs

- A pasted template, or free text as before.
- The reviewer's confirmation, and any edits, when a supplied section is used for a move or an outcome.

## 3. Outputs

### Recognising a template

- When a submission contains a Problem section in the template's form, the workbench treats it as a templated idea and stores each section it finds alongside the original text.
- Recognition is done by fixed rules on the section names, not by AI. It ignores letter case and surrounding spaces, and accepts the sections in any order.
- Text that does not follow the template is handled exactly as today.
- The original text is always kept as submitted.

### The evaluation

- The evaluation still runs once, at submission, on everything the person wrote.
- Because the supplied evidence is part of what it reads, **Missing Evidence** lists only what is still unknown, not what the template already answers.

### On the idea

- A templated idea shows its Title as its name wherever ideas are listed, in place of the opening words of the suggestion.
- The idea detail shows which stages already have information supplied and which do not, so a reviewer can see at a glance how far the idea can go without more input.

### Moving through the pipeline

- When a reviewer opens "Move this idea" and the template supplied the section for that move, the note box is already filled with it.
- The reviewer can use it as it is, edit it, or replace it. Moving still takes a deliberate click, one stage at a time.
- A supplied section longer than the note limit is shortened to fit, and the reviewer is told it was shortened.
- When the template did not supply that section, the note box is empty and a note must be typed, as today.
- Moving an idea back does not use template text; that note is always typed.
- The note that is saved is recorded in the stage history as today, so the potential-architecture analysis sees the supplied evidence.

### Recording an outcome

- When an idea reaches Pilot or Investment and the template supplied Outcome and Hours saved per week, the outcome form is already filled with them.
- Nothing is recorded until the reviewer saves it. The figure remains a reviewer estimate.
- If the hours value is not a plain number, the hours box is left empty.

### In the app

- The Submit Idea screen offers the blank template: one action puts it in the box, and another puts in the filled example so a new user can see the whole flow.
- Using either never overwrites text the person has already typed without asking.
- The template text shown in the app is the same text as the files in [templates/](../); there is one source.

## 4. Success Criteria

A person can:

1. Paste the filled example into Submit Idea and submit it.
2. See the idea listed by its title, with an evaluation that does not ask for evidence the template already gave.
3. Open it in Review Pipeline and move it from Problem to Investment by confirming a pre-filled note at each step, without typing.
4. Record its outcome with the description and hours already filled in.
5. See the potential architecture produced at the Evidence → Prototype move reflect the supplied evidence.

A person can also submit plain free text and see no difference from V3.

## Acceptance Criteria

- The filled example in [templates/example-idea.txt](../example-idea.txt) is recognised, and all nine sections are found.
- The blank template submitted unchanged is refused with a message asking for the problem to be described, because every section is empty.
- A templated submission with only Problem filled in is accepted. With no Title, it is listed by the opening words of its Problem section.
- Sections in a different order, with different letter case, or with extra blank lines are still found.
- An unrecognised section name is left as part of the section above it and is not lost.
- A free-text suggestion that happens to contain a colon is not mistaken for a template.
- A pre-filled note is never saved without the reviewer pressing the move button.
- An idea is never moved, and an outcome never recorded, by submitting a template alone.
- Ideas stored before V4 open and behave as before.
- The 4,000-character limit on a submission still applies.
- All V1 to V3 acceptance criteria still pass.

## Constraints

- Recognition is deterministic. V4 adds no AI call.
- AI does not move ideas between stages, write stage notes, or record outcomes.
- The template is plain text that can be written in any editor and pasted. No file upload, no multi-field form, and no document formats.
- One template. No template editor, no per-department templates, no versions.
- A template never lets an idea skip a stage or the reviewer's click.
- No authentication, roles, or approvals beyond what V2 and V3 define.
- Extend the existing server and page. No framework, build step, or database, and no new dependency unless unavoidable.
- Desktop-first, consistent with the existing screens.

## Validation / Evidence

There is still no test suite, build, or linter, so evidence comes from the running application, using a separate idea store:

- Against the stand-in API: submit the filled example and walk it from Problem to Investment using only the pre-filled notes; confirm the saved history matches the template sections.
- Submit the variations in the acceptance criteria (blank template, Problem only, reordered sections, changed case, an unknown section, free text with colons) and record how each was treated.
- Open an idea stored before V4 and confirm nothing changed.
- Against the live Anthropic API: submit the filled example and record the evaluation, checking that Missing Evidence does not ask for what was supplied; then record the potential architecture and check it uses the supplied evidence.
- Re-run the V1 to V3 browser checks to confirm nothing regressed.
- Capture screenshots of a templated idea's detail and of a pre-filled move.

Report what was actually observed, including anything that failed or could not be checked.

## Stop Condition

Stop when the filled example can be pasted, submitted, and taken to Investment with its outcome recorded without retyping, the acceptance criteria are met with evidence, and free-text submission is unchanged. Do not continue into a template editor, multiple templates, file upload, or automatic stage moves.

## Decisions Made

Each was built with the default below; none was changed by the author.

1. **Does the idea move by itself?** No. The template fills in each note, and a reviewer still clicks through each stage.
2. **Free text and template side by side?** Yes. Both work, and the box stays a single text area.
3. **Should AI fill in a section the person left out?** No. A missing section is shown as not supplied.
4. **Is 4,000 characters enough?** The limit is unchanged; the filled example is about 1,700.

## As Built

### Recognition

- Done on the server at submission by `parseTemplate`, with fixed rules and no AI.
- A line is a section heading when, trimmed and lower-cased, it is exactly a section name followed by a colon. A heading with text after it on the same line is not a heading.
- A submission is templated when it has a `Problem:` heading line. Everything from a heading to the next heading is that section's content, trimmed. Text before the first heading is kept in the original but belongs to no section. A repeated heading adds to the same section.
- A section that is blank, or that is a single `[bracketed prompt]`, is stored as empty.
- A templated submission whose Problem section is empty is refused with 400 "Describe the problem in the Problem section first." The blank template submitted unchanged is refused this way.
- The idea is stored with `template`: an object with `title`, `problem`, `whoItAffects`, `evidence`, `whyPrototype`, `prototype`, `pilot`, `outcome`, and `hoursSavedPerWeek`, each the section's text or null. For free text, and for ideas stored before V4, `template` is null or absent. `suggestion` always holds the text exactly as submitted.

### What the API adds to each idea

Computed when an idea is returned, not stored:

| Field | Content |
| --- | --- |
| `title` | The Title section; with no Title, the first line of Problem, cut to 80 characters. Null for free text |
| `supplied` | For each of Evidence, Prototype, Pilot, Investment: whether the template supplied the section for the move into it. Null for free text |
| `nextGate.suggestedNote` | The section for the next move, cut to 500 characters, or null |
| `nextGate.suggestedFrom` | That section's name |
| `nextGate.suggestedShortened` | Whether it was cut |
| `suggestedOutcome` | While no outcome is recorded: `description` (the Outcome section, cut to 500 characters), `hoursSavedPerWeek` (the number, or null unless the section is digits with an optional decimal part), and `shortened`. Otherwise null |

Shortened text ends with an ellipsis. The full section text stays in `template`.

### Evaluation

The evaluation still receives the whole submission as written. One paragraph was added to its system prompt telling it to treat what the sections report as part of what the employee wrote and not to list it as missing. The current prompt is in the appendix of [INTENT.md](INTENT.md).

### With the evidence gate

V6 was built before V4, so every forward move is checked. The pre-filled note is sent like any other note, and the gate reads the whole record, so a well-filled template passes each bar on its own evidence. A template whose sections are thin gets "Not yet" like any other note, and the reviewer can improve the note or move anyway with a reason.

### Page

- **Submit Idea:** under the submit button, the line "Already have evidence or results? Use the template or see a filled-in example." The two actions load `/templates/idea-template.txt` and `/templates/example-idea.txt`, which the server serves straight from the [templates/](../) folder, and make the box taller.
- If the box already has text, nothing is replaced until the person answers "Replace what you've typed?" with "Yes, replace"; "Cancel" leaves the text alone. If a file cannot be loaded, it says "The template couldn't be loaded."
- **Lists:** My Ideas rows, Impact rows, and Review Pipeline cards show the idea's `title` when it has one, otherwise the opening of the suggestion as before.
- **Idea detail:** the Suggestion card shows the title in large type above the full original text. Beneath the date, a row labelled "Supplied in the template" shows one tag per stage reading "<Stage>: supplied" or, dashed and muted, "<Stage>: not supplied".
- **Move this idea:** when there is a suggested note, the note box is five rows tall and already holds it, with the line "Filled in from the template's "<Section>" section. Use it, edit it, or replace it." and, if it was cut, "It was shortened to fit the 500-character limit."
- Pressing the back button while the box still holds the template's text shows "Type a note saying why this idea is moving back." and saves nothing.
- **Outcome:** when an outcome is offered, the form opens with the description and hours filled in and the line "Filled in from the template. Nothing is recorded until you save.", plus "The description was shortened to fit the 500-character limit." if it was cut. The button still reads "Record outcome".

### How it was validated

- The parser was run directly on the filled example (nine of nine sections), the blank template (templated, no sections filled), free text containing colons (not templated), Problem only, and a reordered, mixed-case submission with an unknown heading (found, with the unknown heading kept inside the section above it).
- Against the stand-in API, in headless Chrome with a separate idea store: loading the template, the refusal of the blank template, the ask-before-replacing step, submitting the example, its title in My Ideas and on the board, the supplied row, walking it from Problem to Investment on the pre-filled notes without typing, the refusal to move back on template text, the pre-filled outcome, and the variations above through the API, including a section over 500 characters and non-numeric hours. A free-text idea and an idea stored before V4 behaved as before. The earlier checks for V1, V2, V3, V5, the gate, and delete were repeated and passed.
- Against the live API: the filled example was evaluated in 6 seconds as Strong Candidate, and its Missing Evidence asked only for things the template did not supply (results in other departments, send-back rates in the pilot, upkeep of the shared template). It then passed all four gate checks on its pre-filled notes, 3 to 4 seconds each, and its outcome was recorded at 20 hours a week. The four free-text example sentences were evaluated again with the revised prompt and came back as before, with no template detected.
