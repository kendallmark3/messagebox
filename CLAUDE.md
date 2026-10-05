# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` then `npm start` runs the app at http://localhost:3210 (`PORT` overrides it). Requires Node 20.12+.
- `ANTHROPIC_API_KEY` is read from `.env` (copy `.env.example`) or the process environment.
- There is no build step, linter, or test suite.

To exercise the UI without a real key, point the SDK at a local stand-in with `ANTHROPIC_BASE_URL` and any non-empty `ANTHROPIC_API_KEY`; the stand-in must answer `POST /v1/messages` with a message whose single text block is the evaluation JSON.

## Architecture

V1 is implemented as two pieces with no framework and no build step:

- `server.js` is a plain `node:http` server. It serves three static files from `public/` through an explicit allow-list (nothing else on disk is reachable) and exposes `POST /api/evaluate`. That handler makes one `client.messages.parse` call with a zod schema as the structured output format, re-validates the result against the same schema, and maps every failure to a short user-safe message; details go to the server log only.
- `public/` is static HTML, CSS, and one script. The script owns the screen states (empty, waiting, evaluation, error), re-checks the response shape before rendering, and never shows a partial evaluation.

The zod `Evaluation` schema in `server.js` is the evaluation contract. The field ids in `public/index.html` and the `FIELDS` and `BADGE_CLASS` maps in `public/app.js` must change with it.

## What is being built

V1 of the AI Suggestion Box ("Ideas Workbench"): a single-screen, desktop-first web app where an employee types one free-text workplace problem or idea and gets back a structured AI evaluation from one Anthropic API call. It is an evaluation workbench, not a chat and not a portal.

## Which document governs

- `intentv1.md` is the author's original intent and wins on product meaning.
- `INTENT.md` is the implementation-ready restatement of it. Build from this one: it adds the evaluation contract, acceptance criteria, validation evidence, and stop condition.
- `README.md` is a reader-facing summary derived from `intentv1.md`.

If you change scope, keep the three consistent, and do not edit `intentv1.md` unless asked.

## Decisions already made in INTENT.md

- The evaluation returns exactly six fields: `problem`, `whoItAffects`, `potentialValue`, `missingEvidence`, `smallestNextStep`, `recommendation`.
- `recommendation` is one of `Strong Candidate`, `Worth Exploring`, `Needs More Evidence`, `Low Value / Unclear`.
- The Anthropic API key is read from an environment variable and used server-side only, so the app needs at least a thin server-side layer even though it is one page.
- Only "Submit Idea" is functional. My Ideas, Review Pipeline, Analytics, and Impact are inert navigation items.
- The pipeline (Problem → Evidence → Prototype → Pilot → Investment) is a visual only; a submission always sits at Problem.
- No persistence, authentication, chat, workflow engine, multi-agent orchestration, or Jira integration.
- The stack is the implementer's choice; pick the smallest one that works.

The intent's stop condition is deliberate: once submission and evaluation work and the acceptance criteria are evidenced, stop rather than extending into workflow features.

## Known gaps and deliberate differences

- `concept.png` is the concept image `intentv1.md` refers to. The screen follows it in spirit but deliberately omits its search box, vote counts, and per-stage counts: none are in the intent, and they would be non-functional or invented data.
- The evaluation has only been validated against a stand-in API. It still needs a run against the live Anthropic API with the four example sentences from `intentv1.md`.
- The request does not opt into the API's server-side refusal `fallbacks`; a refusal is shown to the user as "couldn't be evaluated".

## intent-driven-starter/

A copy of the author's Intent-Driven Starter plugin (v1.0.0, https://github.com/kendallmark3/intent-driven-starter), kept for reference. It is not application code, and editing it does not change behavior: Claude Code runs the installed plugin, not this copy.

The installed plugin provides the workflow this project uses:

- `/intent-driven-starter:start` for repo-aware onboarding before proposing changes.
- `/intent-driven-starter:intent-creator` to create or refine an intent (it produced `INTENT.md`).
- `/intent-driven-starter:execute-intent` to implement an intent with its understand → refine → delta → implement → validate → stop discipline.
- A Stop hook (`scripts/forbid-secrets.py`) that scans the git diff for likely secrets and blocks finishing if it finds one.

The `location-story` skill in the plugin is for map and geocoding projects and does not apply here.
