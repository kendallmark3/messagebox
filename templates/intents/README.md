# Intent files

These files are the specification the Ideas Workbench was built from. Each one adds a slice of the product, and each ends with an **As Built** section recording the concrete decisions in the code. Together they are meant to be enough to rebuild the app.

The prototype is complete at V7.

## The files

| File | What it adds | Status | Changed later by |
| --- | --- | --- | --- |
| [intentv1.md](intentv1.md) | The original idea: one text box, an AI evaluation, a pipeline picture | Original, kept as written | Implemented through INTENT.md |
| [INTENT.md](INTENT.md) | V1 made implementation-ready: the evaluation contract, the screen, the stack | Implemented | V2, V3, V4, V6, V7 |
| [intentv2.md](intentv2.md) | Stored ideas, My Ideas (with delete), Review Pipeline, Analytics, Impact | Implemented | V3, V4, V5, V6, V7 |
| [intentv3.md](intentv3.md) | An AI analysis when an idea is approved into Prototype | Implemented, partly superseded | V5 (contract, prompt, screen), V6 |
| [intentv4.md](intentv4.md) | Submitting from a template; pre-filled stage notes and outcome | Implemented, after V5 and V6 | V7 |
| [intentv5.md](intentv5.md) | The evidence-led analysis: recommendation first, evidence sorted, investment trigger | Implemented | None |
| [intentv6.md](intentv6.md) | The evidence gate on every forward stage move | Implemented | V7 |
| [intentv7.md](intentv7.md) | Admin sign-in and a required approval before Investment | Implemented | None |
| [exhappypath.md](exhappypath.md) | The author's worked example of an idea earning its way to investment | Illustration, not an intent | n/a |

## How to read them

- Read in this order: INTENT.md, then intentv2.md to intentv7.md. intentv1.md is the origin and explains the product principle.
- Every intent has the same top block: **Builds on**, **Status**, and **Later changes**. The body below that block describes the version as it was specified and built at the time. Where a later intent changed something, the Later changes list says so, and the later intent wins.
- V4 was written fourth but built sixth, after V5 and V6.
- The three AI system prompts are reproduced word for word in appendices: evaluation in INTENT.md, analysis in intentv5.md, gate in intentv6.md. The prompt in intentv3.md is the superseded V3 one, kept for the record.

## The app as it stands

A summary of the current rules, with the intent that owns each one.

| Rule | Owner |
| --- | --- |
| One free-text box, or the template pasted into it. At most 4,000 characters. Text that looks like a credential is refused. | INTENT.md, V4 |
| The evaluation returns six fields and one of four recommendations. An idea is stored only if it succeeds. | INTENT.md, V2 |
| Five stages: Problem, Evidence, Prototype, Pilot, Investment. Moves go one stage at a time and need a note. | V2 |
| Every forward move is checked against a fixed bar for the next stage. If it is not met, the reviewer can improve the note or move anyway with a recorded reason. | V6 |
| Entering Prototype starts the analysis: a recommendation, the evidence sorted into known, reported but unverified, and inferred, a fixed investment trigger, and a conditional sketch of what could be built. | V3, V5 |
| Entering Investment needs an admin's approval first. The approver cannot be the submitter. There is no override, and moving back clears the approval. | V7 |
| An outcome, with estimated hours saved, can be recorded at Pilot or Investment. | V2 |
| A templated idea is listed by its title, and its sections pre-fill the move notes and the outcome. | V4 |
| People can delete ideas they submitted from the same browser. | V2 |
| Three AI calls: evaluation, evidence check, analysis. AI never moves an idea, approves one, or produces the Analytics and Impact figures. | INTENT.md, V3, V6 |
| No user accounts. "My ideas" and "the submitter" mean a browser. Admin is one shared passcode. | V2, V7 |
| The app is reachable only from the machine it runs on unless `HOST` is set. | INTENT.md |

## The worked example

[exhappypath.md](exhappypath.md) walks one idea from an employee's observation to an investment decision, showing the workbench stopping it several times along the way. It was written to explain the product, not to specify it, and it differs from the app in two ways: it has a sixth step, a shadow trial between Prototype and Pilot, where the app has five stages; and its decision wording ("Proceed to limited pilot", "Eligible for investment review") is the author's, not the app's.
