# AI Suggestion Box — V2 Intent

Builds on [intentv1.md](intentv1.md) and [INTENT.md](INTENT.md). Everything in V1 stays as built unless this file says otherwise.

Status: implemented. The **As Built** section at the end records the decisions the implementation made.

## 1. Intent / Goal

Make the four inactive navigation items work: **My Ideas**, **Review Pipeline**, **Analytics**, and **Impact**.

V1 evaluates an idea and then forgets it. V2 keeps each submitted idea, lets it move through Problem → Evidence → Prototype → Pilot → Investment, and shows what has been submitted and what it has led to.

The product principle is unchanged: employees submit problems and opportunities, and good ideas earn the right to proceed. This is still a workbench, not a portal and not a chat.

## 2. Inputs / Context

### State when this intent was written

- V1 was implemented: [server.js](server.js) (a plain `node:http` server with `POST /api/evaluate`) and [public/](public/) (one static page, no framework, no build step).
- Nothing was stored. An evaluation was lost on refresh.
- There were no user accounts.
- The four navigation items were rendered but inert.
- The pipeline was a visual only; a submission always sat at Problem.

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
| `history` | Each stage change: `from`, `to`, `note`, and the time as `at` |
| `outcome` | Empty until recorded; then `description`, `hoursSavedPerWeek`, and `recordedAt` |

A suggestion whose evaluation fails is not saved; the V1 error-and-retry behavior stands.

### Submit Idea

Unchanged from V1, except that a successful submission is saved and the screen says so, with a link to the idea in My Ideas.

### My Ideas

- Lists the ideas submitted from this browser, newest first: the start of the suggestion, the recommendation, the current stage, and the date.
- Selecting an idea shows its full suggestion, its evaluation, its position in the pipeline, and its stage history. From My Ideas this is read-only: there are no move or outcome controls, though a recorded outcome is shown.
- With no ideas, shows a short empty state that points to Submit Idea.

### Review Pipeline

- Shows all stored ideas grouped into the five stages, with a count per stage.
- Selecting an idea shows the same detail as My Ideas.
- A reviewer can move an idea one stage forward or one stage back. A short note saying why is required.
- For an idea at Pilot or Investment, the same screen lets the reviewer record or update its outcome.
- The move is saved, appears in the idea's history, and is reflected everywhere the idea is shown.
- Anyone using the workbench can act as a reviewer. There are no roles.

### Analytics

Computed from stored ideas only:

- Total ideas submitted.
- How many have moved beyond Problem, and how many were rated Strong Candidate.
- Ideas per stage.
- Ideas per recommendation.
- Submissions per day, from the first submission to today, covering at most the last 30 days.

With no ideas, shows an empty state rather than zeros dressed up as charts.

### Impact

- Lists the ideas that have reached Pilot or Investment.
- Opening one of those ideas from Impact lets a reviewer record or update its outcome: a short description and an estimated hours saved per week.
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

## Decisions Made

Three choices shaped the build. Each was built with the default below; none was changed by the author.

1. **Whose ideas are "My Ideas"?** There is no sign-in, so "mine" means "submitted from this browser". Clearing browser data loses the link, though the ideas remain in Review Pipeline.
2. **What does Impact measure?** A reviewer-entered description and estimated hours saved per week, for ideas at Pilot or Investment.
3. **Does Top Ideas stay static?** Yes.

## As Built

### Storage

- Ideas are held in memory and written to `data/ideas.json` after every change, as one pretty-printed JSON array. The file is written to a temporary name and then renamed, and writes are queued so they cannot overlap.
- `data/` is git-ignored and is created on the first submission.
- Setting `IDEAS_FILE` points the server at a different file. Test runs use it so they never touch real ideas.
- `id` is a random UUID. `submittedAt`, `at`, and `recordedAt` are ISO 8601 timestamps.
- `submitterId` is a random UUID the browser creates once and keeps in `localStorage`; the server accepts 8 to 64 letters, digits, or hyphens. If `localStorage` is unavailable, an id is kept for the page session only.

### API

All routes are under `/api/ideas`, take and return JSON, and report errors as `{ error }`.

| Request | Does | Success |
| --- | --- | --- |
| `GET /api/ideas` | Lists all ideas, or one browser's with `?submitterId=` | 200 `{ ideas }` |
| `GET /api/ideas/:id` | Returns one idea | 200 `{ idea }` |
| `POST /api/ideas` | Takes `{ suggestion, submitterId }`, evaluates, stores | 201 `{ idea }` |
| `POST /api/ideas/:id/stage` | Takes `{ direction: "forward" or "back", note }` | 200 `{ idea }` |
| `PUT /api/ideas/:id/outcome` | Takes `{ description, hoursSavedPerWeek }` | 200 `{ idea }` |

Rules the server enforces:

- A note or description is trimmed and must be 1 to 500 characters (400 otherwise).
- A move is exactly one stage. Moving back from Problem or forward from Investment is refused (409). There is no way to name a target stage.
- An outcome is accepted only at Pilot or Investment (409 otherwise). Hours must be a number from 0 to 100,000 (400 otherwise). Recording again replaces the previous outcome.
- An unknown idea returns 404; any other method returns 405.
- V1's `POST /api/evaluate` no longer exists.

### Page

- The page is still one HTML file. The Submit view is static markup; the other views and the idea detail are built in `app.js`.
- Views are selected by the address after `#`: `#/submit`, `#/my-ideas`, `#/pipeline`, `#/analytics`, `#/impact`, and `#/<view>/<idea id>` for an idea opened from that view. An unknown address shows Submit.
- The header title and line change with the view:

| View | Title | Line |
| --- | --- | --- |
| Submit Idea | Ideas Workbench | (as V1) |
| My Ideas | My Ideas | The ideas you've submitted from this browser. |
| Review Pipeline | Review Pipeline | Every idea, by the stage it has earned. |
| Analytics | Analytics | What has been submitted so far. |
| Impact | Impact | What ideas at Pilot and Investment have led to. |

- "+ New Idea" is on every view; it resets the Submit view and goes to it.
- After a successful submission, the Evaluation card ends with "Saved. View it in My Ideas", linking to that idea.
- **My Ideas** is one card of rows, newest first. Each row shows up to 140 characters of the suggestion, "Submitted" and the date, the recommendation pill, and a stage tag with a dot in the stage colour.
- **Review Pipeline** is five columns in stage order, each with a coloured dot, the stage name, and a count. Each idea is a card showing up to 90 characters of the suggestion and its recommendation pill. An empty column says "No ideas here yet".
- **Idea detail**, top to bottom: a "← Back to" link for the view it was opened from; the Suggestion card with the stage tag and date; the Idea Pipeline with this idea's stage marked "This idea is here"; "Move this idea" (Review Pipeline only); Evaluation; Outcome; Stage history.
  - "Move this idea" has a note box and up to two buttons, "← Back to <stage>" and "Move to <stage> →". A blank note shows "Add a short note saying why before moving the idea."
  - Outcome is an editable form when opened from Review Pipeline or Impact at Pilot or Investment, with the button "Record outcome" or "Update outcome". Otherwise a recorded outcome is shown as text, labelled "Reviewer estimate".
  - Stage history lists each move as "From → To", the date, and the note. With no moves it says "This idea has not moved from Problem yet."
- **Analytics:** three tiles (Ideas submitted, Moved beyond Problem, Strong candidates); two horizontal bar lists side by side (Ideas per stage, Ideas per recommendation), each row showing its count; and a "Submissions over time" column chart with one column per day. Bars and columns are a single blue.
- **Impact:** three tiles (Ideas at Pilot, Ideas at Investment, Estimated hours saved per week, the last captioned "Reviewer estimates from N recorded outcomes"), then a row per idea at Pilot or Investment showing its outcome and estimate, or "No outcome recorded yet".
- **Empty states:** "You haven't submitted any ideas yet", "No ideas in the pipeline yet", "Nothing to analyse yet", and "No ideas have reached Pilot yet", each with a button to the obvious next view.
- Each built view shows "Loading…" while fetching and a plain error with "Try again" on failure. After a move or an outcome is saved, the view redraws from the server.

### How it was validated

Driven in headless Chrome against the stand-in API with a separate idea store: submission, refresh, stage moves, outcomes, the figures on Analytics and Impact, the back button, and a server restart. Invalid requests to each endpoint were sent directly and confirmed to change nothing.
