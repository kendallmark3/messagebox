# AI Suggestion Box — V2 Intent

Builds on [intentv1.md](intentv1.md) and [INTENT.md](INTENT.md). Everything in V1 stays as built unless this file says otherwise.

## 1. Intent / Goal

Make the four inactive navigation items work: **My Ideas**, **Review Pipeline**, **Analytics**, and **Impact**.

V1 evaluates an idea and then forgets it. V2 keeps each submitted idea, lets it move through Problem → Evidence → Prototype → Pilot → Investment, and shows what has been submitted and what it has led to.

The product principle is unchanged: employees submit problems and opportunities, and good ideas earn the right to proceed. This is still a workbench, not a portal and not a chat.

## 2. Inputs / Context

### Current state

- V1 is implemented on the `feature/v1-ideas-workbench` branch: [server.js](server.js) (a plain `node:http` server with `POST /api/evaluate`) and [public/](public/) (one static page, no framework, no build step).
- Nothing is stored. An evaluation is lost on refresh.
- There are no user accounts.
- The four navigation items are rendered but inert.
- The pipeline is a visual only; a submission always sits at Problem.
- V1 has been validated against a stand-in API only. A run against the live Anthropic API is still outstanding and is a precondition for calling V2 done.

### V1 constraints that V2 relaxes

| V1 constraint | V2 position |
| --- | --- |
| No persistence | Ideas are stored, in the simplest durable form that works locally |
| Pipeline stages are informational | A stored idea can be moved between stages by hand |
| Other navigation items are inert | All five items are functional |

All other V1 constraints still apply.

### Runtime inputs

- The employee's free-text suggestion (unchanged from V1).
- A reviewer's stage change, with a short note.
- For an idea at Pilot or Investment, a reviewer-entered outcome (see Impact).

## 3. Outputs

### Stored idea

Each successfully evaluated suggestion is saved as one record:

| Field | Content |
| --- | --- |
| `id` | Unique identifier |
| `submittedAt` | Timestamp |
| `submitterId` | Anonymous identifier for the browser that submitted it |
| `suggestion` | The employee's original text |
| `evaluation` | The six-field V1 evaluation, unchanged |
| `stage` | One of Problem, Evidence, Prototype, Pilot, Investment; starts at Problem |
| `history` | Each stage change: from, to, note, timestamp |
| `outcome` | Optional: a short description and an estimated hours saved per week |

A suggestion whose evaluation fails is not saved; the V1 error-and-retry behavior stands.

### Submit Idea

Unchanged from V1, except that a successful submission is saved and the screen says so, with a link to the idea in My Ideas.

### My Ideas

- Lists the ideas submitted from this browser, newest first: the start of the suggestion, the recommendation, the current stage, and the date.
- Selecting an idea shows its full suggestion, its evaluation, its position in the pipeline, and its stage history.
- With no ideas, shows a short empty state that points to Submit Idea.

### Review Pipeline

- Shows all stored ideas grouped into the five stages, with a count per stage.
- Selecting an idea shows the same detail as My Ideas.
- A reviewer can move an idea one stage forward or one stage back. A short note saying why is required.
- The move is saved, appears in the idea's history, and is reflected everywhere the idea is shown.
- Anyone using the workbench can act as a reviewer. There are no roles.

### Analytics

Computed from stored ideas only:

- Total ideas submitted.
- Ideas per stage.
- Ideas per recommendation.
- Submissions over time.

With no ideas, shows an empty state rather than zeros dressed up as charts.

### Impact

- Lists the ideas that have reached Pilot or Investment.
- For those ideas, a reviewer can record an outcome: a short description and an estimated hours saved per week.
- Shows the number of ideas at Pilot and at Investment, and the total estimated hours saved per week across recorded outcomes.
- Every figure is labelled as a reviewer estimate. Nothing is calculated or inferred by AI.

### Unchanged

- The Top Ideas panel stays a static example list.
- The visual direction: follow [concept.png](concept.png) in spirit, and keep the new views consistent with the V1 screen.

## 4. Success Criteria

A user can:

1. Submit an idea, refresh the page, and still find it under My Ideas with its evaluation.
2. Open Review Pipeline and see every stored idea in its stage.
3. Move an idea to the next stage with a note, and see the new stage and the note on the idea afterwards.
4. Open Analytics and see counts that match the stored ideas.
5. Record an outcome for an idea at Pilot or Investment and see it counted on Impact.
6. Restart the server and find all of the above still there.
7. Reach every view from the left navigation, with the current view marked.

## Acceptance Criteria

- All five navigation items open a working view; none is inert.
- Each view has a direct address, so refreshing or using the browser's back button keeps the user on the same view.
- A stored idea's evaluation is the one returned at submission; opening an idea does not call the AI again.
- A stage move without a note is rejected, on the page and by the server.
- An idea cannot skip stages, and cannot move before Problem or past Investment.
- An outcome can only be recorded for an idea at Pilot or Investment, and hours saved must be a non-negative number.
- Analytics and Impact figures change immediately after a submission, a stage move, or a recorded outcome.
- Every view has an explicit empty state, a waiting state, and a plain error with retry.
- Malformed requests to any new endpoint get a clear error and change nothing.
- The API key still never reaches the browser.
- All V1 acceptance criteria still pass.

## Constraints

- Extend the existing server and page. No framework, no build step, and no new dependency unless unavoidable.
- Store ideas in the simplest durable local form (for example, one file on disk, excluded from git). No database server.
- No authentication, accounts, or roles.
- No approval routing, assignments, notifications, budgeting, rewards, voting, or portfolio management.
- No Jira or other integrations.
- No chat, AgentCore, or multi-agent orchestration. The only AI call remains the V1 evaluation.
- AI does not move ideas between stages, and does not produce analytics or impact figures.
- Deterministic code owns storage, stage rules, and all counts.
- No seeded or invented ideas in the product. Views start empty.
- Desktop-first.

## Validation / Evidence

The repository has no test suite, build, or linter, so evidence comes from the running application, as in V1:

- Drive the page in a browser against the stand-in API: submit ideas, refresh, move stages, record outcomes, and confirm each success and acceptance criterion.
- Restart the server and confirm stored ideas, history, and outcomes survive.
- Send invalid requests to each new endpoint (missing note, skipped stage, outcome at the wrong stage, negative hours) and confirm they are rejected and nothing changes.
- Compare Analytics and Impact figures against the stored records.
- Capture a screenshot of each of the five views.
- Run the four example sentences from intentv1.md against the live Anthropic API.

Report what was actually observed, including anything that failed or could not be checked.

## Stop Condition

Stop when the four views work against stored ideas, the acceptance criteria are met with evidence, and V1 behavior is intact. Do not continue into roles, approvals, notifications, integrations, or richer analytics.

## Decisions to Confirm

These three choices shape the build. Each has a default that will be used unless changed.

1. **Whose ideas are "My Ideas"?** Default: there is no sign-in, so "mine" means "submitted from this browser". Clearing browser data loses the link, though the ideas remain in Review Pipeline. The alternative is real sign-in, which is a much larger change.
2. **What does Impact measure?** Default: a reviewer-entered description and estimated hours saved per week, for ideas at Pilot or Investment. The alternatives are a money figure, or no numbers at all (a list of outcomes only).
3. **Does Top Ideas stay static?** Default: yes. The alternative is to fill it from stored ideas, for example the most advanced ones.
