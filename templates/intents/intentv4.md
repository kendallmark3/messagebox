# AI Suggestion Box — V4 Intent

Builds on [intentv1.md](intentv1.md), [INTENT.md](INTENT.md), [intentv2.md](intentv2.md), and [intentv3.md](intentv3.md). Everything in V1 to V3 stays as built unless this file says otherwise.

Status: not implemented. The template files in [templates/](../) exist; the workbench does not yet recognise them.

## 1. Intent / Goal

Let a person submit an idea from a template that already holds what each pipeline stage needs, so nobody has to type it in again as the idea moves.

Today an idea is one block of text, and every stage move needs a note typed from scratch. Someone who already knows the evidence, the prototype result, and the pilot result has to enter it piece by piece. With V4 they paste one filled-in template, and the workbench finds each section and offers it at the stage where it belongs.

The product principle holds. The template asks about the problem and what has been learned, never about technology. A plain free-text suggestion still works exactly as before.

## 2. Inputs / Context

### Current state

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

- Recognition is deterministic. No additional AI call is added; the workbench still makes only the evaluation and the analysis.
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

## Decisions to Confirm

Each has a default that will be used unless changed.

1. **Does the idea move by itself?** Default: no. The template fills in each note, and a reviewer still clicks through each stage. The alternative is one action that advances the idea as far as the template has information for.
2. **Free text and template side by side?** Default: yes, both work, and the box stays a single text area. The alternative is a form with one field per section.
3. **Should AI fill in a section the person left out?** Default: no. A missing section is shown as missing. The alternative is letting AI draft it from the rest, which would add a third AI call.
4. **Is 4,000 characters enough?** Default: keep the limit; the filled example is about 1,700. The alternative is raising it for templated ideas.
