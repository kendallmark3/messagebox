# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` then `npm start` runs the app at http://localhost:3210 (`PORT` overrides it). Requires Node 20.12+.
- Text that looks like a credential is refused on submission (`SECRET_PATTERNS` in `server.js`), so it is never stored or sent to the model. This exists because a real API key was once pasted into the suggestion box.
- The server binds to `127.0.0.1` only. `HOST=0.0.0.0` exposes it to the network; there is no sign-in, so every stored idea is then readable by anyone who can reach the port.
- `ANTHROPIC_API_KEY` is read from `.env` (copy `.env.example`) or the process environment.
- There is no build step, linter, or test suite.
- `IDEAS_FILE=/some/path.json` points the server at a different idea store. Use it for any test run: `data/ideas.json` holds the author's real ideas.

To exercise the UI without a real key, point the SDK at a local stand-in with `ANTHROPIC_BASE_URL` and any non-empty `ANTHROPIC_API_KEY`; the stand-in must answer `POST /v1/messages` with a message whose single text block is the evaluation JSON.

## Architecture

Two pieces, with no framework and no build step:

- `server.js` is a plain `node:http` server. It serves three static files from `public/` through an explicit allow-list (nothing else on disk is reachable) and exposes the ideas API under `/api/ideas`: list (optionally by `submitterId`), get one, create, `POST /:id/stage`, and `PUT /:id/outcome`.
  - There are three model calls, all through `askClaude` (`client.messages.parse` with a zod schema as the structured output format). Creating an idea runs the evaluation, and an idea is stored only if it succeeds. A forward stage move runs the gate check first and is saved only if it passes or carries an override reason. Moving forward into Prototype, or `POST /:id/analysis`, runs the analysis.
  - The last `Not yet` gate result per idea is held in memory (`gateResults`) so that moving anyway records the result the reviewer saw without a second model call.
  - The analysis runs in the background after the move has been saved, so its failure cannot affect the move. In-progress and failed runs are tracked in memory only (`analysisRuns`); every idea returned by the API carries a computed `analysisStatus` of `none`, `running`, `failed`, or `ready`. Only a complete result is written to `idea.analysis`, replacing the previous one.
  - Ideas are held in memory and written to `data/ideas.json` (git-ignored) after every change. There is no database.
  - The server owns the rules: stages move one step at a time, a move needs a note, and an outcome is only accepted at Pilot or Investment. Every failure maps to a short user-safe message; details go to the server log only.
- `public/` is static HTML, CSS, and one script. The Submit view is static markup; the other four views and the idea detail are built in `app.js` and selected by a hash route (`#/my-ideas`, `#/pipeline/<id>`, and so on). Analytics and Impact figures are computed in the browser from the ideas list, so they always match what is stored. On the idea detail, the Analysis section redraws itself and polls while a run is in progress, so a note being typed elsewhere on the page is not lost.

Things that must change together:

- The zod `Evaluation` schema in `server.js` is the evaluation contract; `FIELDS` and `BADGE_CLASS` in `public/app.js` mirror it.
- The zod `Analysis` schema in `server.js` is the analysis contract; `analysisCard` in `public/app.js` renders its fields. `legacyArchitectureCard` renders analyses stored in the V3 shape, which have no `recommendation` field.
- The zod `Gate` schema and `GATE_BARS` in `server.js` are the gate contract and the four bars. The page reads the bar from `nextGate` on each idea, so the bar text lives only on the server. `moveForm`, `gateEvidence`, and `gateTag` in `public/app.js` render the result.
- The fixed investment trigger sentence is `INVESTMENT_TRIGGER` in `public/app.js`. It is supplied by the page, not by the model.
- The stage that triggers the analysis is `ANALYSIS_STAGE` in `server.js` and `ANALYSIS_STAGE_INDEX` in `public/app.js`.
- The stage list exists in both `server.js` (`STAGES`) and `public/app.js` (`STAGES`), and stage colours are keyed by stage name in `public/styles.css`.

"My Ideas" is keyed by a random id kept in the browser's `localStorage` and sent as `submitterId`. It is not authentication. Deleting an idea (`DELETE /api/ideas/:id?submitterId=`) is allowed only when that id matches, and is offered only in My Ideas.

## What is being built

The AI Suggestion Box ("Ideas Workbench"): a desktop-first web app where an employee types one free-text workplace problem or idea and gets back a structured AI evaluation from one Anthropic API call. Since V2, each evaluated idea is stored and can be moved through Problem → Evidence → Prototype → Pilot → Investment. Approving an idea into Prototype produces an evidence-led AI analysis: what to do next, what the evidence does and does not support, and only conditionally what could be built. It is an evaluation workbench, not a chat and not a portal.

## Which document governs

The intent files live in `templates/intents/`. The author moved them there from the repository root; keep them there.

- `intentv1.md` is the author's original intent and wins on product meaning. Do not edit it unless asked.
- `INTENT.md` (V1), `intentv2.md`, `intentv3.md`, `intentv5.md`, and `intentv6.md` are the implemented intents. Each ends with **As Built** (and **Decisions Made** for V2 and V3), which record the concrete choices in the code: stack, API, limits, messages, screen layout, and wording. Together they are meant to be enough to rebuild the app.
- `intentv5.md` replaces V3's analysis contract, prompt, and screen section with the evidence-led version: recommendation first, evidence sorted into known, reported but unverified, and inferred, a fixed investment trigger, and the architecture shown only as conditional. `intentv3.md` still governs when the analysis runs, its storage, and its failure handling.
- `intentv6.md` adds the evidence gate: every forward stage move is checked against a fixed bar for that stage, and is saved only on a pass or with a recorded override reason. It changes the stage endpoint and the history entries defined in `intentv2.md`.
- `intentv4.md` (submitting from a template) is written but not implemented. `templates/idea-template.txt` and `templates/example-idea.txt` exist; the app does not recognise them yet.
- `README.md` is the reader-facing summary of the current app.

Keeping these in line is part of any change:

- A change to behaviour, an API route, a limit, a user-facing message, or screen wording must be reflected in the As Built section of the intent that owns it.
- The three system prompts in `server.js` are reproduced verbatim in the appendices of `INTENT.md` (evaluation), `intentv5.md` (analysis), and `intentv6.md` (gate). Change them together. The appendix in `intentv3.md` is the superseded V3 prompt and is left as it is.
- New scope gets a new intent file rather than rewriting an old one.

## Decisions already made in the intents

- The evaluation returns exactly six fields: `problem`, `whoItAffects`, `potentialValue`, `missingEvidence`, `smallestNextStep`, `recommendation`.
- `recommendation` is one of `Strong Candidate`, `Worth Exploring`, `Needs More Evidence`, `Low Value / Unclear`.
- The Anthropic API key is read from an environment variable and used server-side only.
- There are exactly three AI calls: the evaluation at submission, the evidence check on each forward move, and the analysis on approval. Opening an idea never calls the AI. AI does not move ideas between stages or produce analytics or impact figures.
- The move from Evidence to Prototype is the approval. There is no separate approve action or approver role.
- The gate informs and records; it never blocks a person outright. Any forward move can be made anyway with a reason, and code, not the model, decides whether a move is saved (`moveIdea` in `server.js`).
- The analysis is given only what is stored on the idea, must not invent systems, costs, or timelines, and is labelled as an AI-generated suggestion wherever shown.
- The analysis recommends before it designs. Only evidence it classes as known may carry the recommendation or the conditional architecture; unclear reviewer notes are quoted under reported but unverified. Do not architect the imagined solution; architect the smallest next move the evidence justifies.
- The recommendation is advice. It does not block or automate stage moves.
- Impact numbers are reviewer-entered estimates and are labelled as such.
- Views start empty; there are no seeded or invented ideas. The Top Ideas panel is a static example list.
- No authentication, roles, approvals, notifications, chat, workflow engine, multi-agent orchestration, database server, or Jira integration.

Each intent's stop condition is deliberate: once its acceptance criteria are evidenced, stop rather than extending into further workflow features.

## Known gaps and deliberate differences

- `concept.png` is the concept image `intentv1.md` refers to. The screen follows it in spirit but deliberately omits its search box, vote counts, and per-stage counts: none are in the intent, and they would be non-functional or invented data.
- Live-API validation covers the four example sentences from `intentv1.md` for the evaluation (about 5 to 13 seconds each) and the analysis (about 14 to 18 seconds each), the analysis on a copy of the author's status-reporting test idea, and a fixed set of 19 gate checks (2 to 6 seconds each; evidence passed 8 of 8, non-evidence stopped 8 of 8). The browser flows and failure states were checked against a stand-in API only.
- Live output runs long: evaluations exceed the "one to three short sentences" asked for, and analyses average about 414 words against a target of about 300 to 400.
- None of the model calls opts into the API's server-side refusal `fallbacks`; a refusal is shown to the user as a plain "couldn't be evaluated", "couldn't be produced", or "couldn't be run" message.

## intent-driven-starter/

A copy of the author's Intent-Driven Starter plugin (v1.0.0, https://github.com/kendallmark3/intent-driven-starter), kept for reference. It is not application code, and editing it does not change behavior: Claude Code runs the installed plugin, not this copy.

The installed plugin provides the workflow this project uses:

- `/intent-driven-starter:start` for repo-aware onboarding before proposing changes.
- `/intent-driven-starter:intent-creator` to create or refine an intent (it produced `INTENT.md`).
- `/intent-driven-starter:execute-intent` to implement an intent with its understand → refine → delta → implement → validate → stop discipline.
- A Stop hook (`scripts/forbid-secrets.py`) that scans the git diff for likely secrets and blocks finishing if it finds one.

The `location-story` skill in the plugin is for map and geocoding projects and does not apply here.
