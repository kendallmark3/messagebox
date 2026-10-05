# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` then `npm start` runs the app at http://localhost:3210 (`PORT` overrides it). Requires Node 20.12+.
- `ANTHROPIC_API_KEY` is read from `.env` (copy `.env.example`) or the process environment.
- There is no build step, linter, or test suite.

To exercise the UI without a real key, point the SDK at a local stand-in with `ANTHROPIC_BASE_URL` and any non-empty `ANTHROPIC_API_KEY`; the stand-in must answer `POST /v1/messages` with a message whose single text block is the evaluation JSON.

## Architecture

Two pieces, with no framework and no build step:

- `server.js` is a plain `node:http` server. It serves three static files from `public/` through an explicit allow-list (nothing else on disk is reachable) and exposes the ideas API under `/api/ideas`: list (optionally by `submitterId`), get one, create, `POST /:id/stage`, and `PUT /:id/outcome`.
  - Creating an idea makes the one `client.messages.parse` call, with a zod schema as the structured output format. An idea is stored only if that evaluation succeeds.
  - Ideas are held in memory and written to `data/ideas.json` (git-ignored) after every change. There is no database.
  - The server owns the rules: stages move one step at a time, a move needs a note, and an outcome is only accepted at Pilot or Investment. Every failure maps to a short user-safe message; details go to the server log only.
- `public/` is static HTML, CSS, and one script. The Submit view is static markup; the other four views and the idea detail are built in `app.js` and selected by a hash route (`#/my-ideas`, `#/pipeline/<id>`, and so on). Analytics and Impact figures are computed in the browser from the ideas list, so they always match what is stored.

Things that must change together:

- The zod `Evaluation` schema in `server.js` is the evaluation contract; `FIELDS` and `BADGE_CLASS` in `public/app.js` mirror it.
- The stage list exists in both `server.js` (`STAGES`) and `public/app.js` (`STAGES`), and stage colours are keyed by stage name in `public/styles.css`.

"My Ideas" is keyed by a random id kept in the browser's `localStorage` and sent as `submitterId`. It is not authentication.

## What is being built

The AI Suggestion Box ("Ideas Workbench"): a desktop-first web app where an employee types one free-text workplace problem or idea and gets back a structured AI evaluation from one Anthropic API call. Since V2, each evaluated idea is stored and can be moved through Problem → Evidence → Prototype → Pilot → Investment. It is an evaluation workbench, not a chat and not a portal.

## Which document governs

- `intentv1.md` is the author's original intent and wins on product meaning.
- `INTENT.md` is the implementation-ready restatement of it: the evaluation contract, acceptance criteria, validation evidence, and stop condition for V1.
- `intentv2.md` is the V2 intent. It relaxes three V1 constraints (persistence, manual stage moves, working navigation) and keeps the rest. Its three "Decisions to Confirm" were built with their defaults and have not been explicitly confirmed by the author.
- `README.md` is a reader-facing summary derived from `intentv1.md`.

If you change scope, keep the three consistent, and do not edit `intentv1.md` unless asked.

## Decisions already made in the intents

- The evaluation returns exactly six fields: `problem`, `whoItAffects`, `potentialValue`, `missingEvidence`, `smallestNextStep`, `recommendation`.
- `recommendation` is one of `Strong Candidate`, `Worth Exploring`, `Needs More Evidence`, `Low Value / Unclear`.
- The Anthropic API key is read from an environment variable and used server-side only.
- The only AI call is the evaluation at submission. AI does not move ideas between stages or produce analytics or impact figures.
- Impact numbers are reviewer-entered estimates and are labelled as such.
- Views start empty; there are no seeded or invented ideas. The Top Ideas panel is a static example list.
- No authentication, roles, approvals, notifications, chat, workflow engine, multi-agent orchestration, database server, or Jira integration.

Each intent's stop condition is deliberate: once its acceptance criteria are evidenced, stop rather than extending into further workflow features.

## Known gaps and deliberate differences

- `concept.png` is the concept image `intentv1.md` refers to. The screen follows it in spirit but deliberately omits its search box, vote counts, and per-stage counts: none are in the intent, and they would be non-functional or invented data.
- Live-API validation so far is the four example sentences from `intentv1.md` submitted through `POST /api/ideas` (all returned complete, contract-valid evaluations in roughly 5 to 13 seconds). The browser flows, failure states, and stage and outcome rules were checked against a stand-in API only.
- Live evaluations tend to run longer than the "one to three short sentences" the system prompt asks for, especially `missingEvidence`.
- The request does not opt into the API's server-side refusal `fallbacks`; a refusal is shown to the user as "couldn't be evaluated".

## intent-driven-starter/

A copy of the author's Intent-Driven Starter plugin (v1.0.0, https://github.com/kendallmark3/intent-driven-starter), kept for reference. It is not application code, and editing it does not change behavior: Claude Code runs the installed plugin, not this copy.

The installed plugin provides the workflow this project uses:

- `/intent-driven-starter:start` for repo-aware onboarding before proposing changes.
- `/intent-driven-starter:intent-creator` to create or refine an intent (it produced `INTENT.md`).
- `/intent-driven-starter:execute-intent` to implement an intent with its understand → refine → delta → implement → validate → stop discipline.
- A Stop hook (`scripts/forbid-secrets.py`) that scans the git diff for likely secrets and blocks finishing if it finds one.

The `location-story` skill in the plugin is for map and geocoding projects and does not apply here.
