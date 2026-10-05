# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## State of the repository

There is no application code yet, and the folder is not a git repository. It holds a product intent and a reference copy of a Claude Code plugin. There are no build, lint, test, or run commands; when V1 is implemented, add the real commands here and to README.md.

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

## Known gaps

- The concept image that `intentv1.md` calls the visual direction is not in the repository. Use the Visual Direction list in `INTENT.md` until it is added.
- Validating the evaluation needs an Anthropic API key in the local environment.

## intent-driven-starter/

A copy of the author's Intent-Driven Starter plugin (v1.0.0, https://github.com/kendallmark3/intent-driven-starter), kept for reference. It is not application code, and editing it does not change behavior: Claude Code runs the installed plugin, not this copy.

The installed plugin provides the workflow this project uses:

- `/intent-driven-starter:start` for repo-aware onboarding before proposing changes.
- `/intent-driven-starter:intent-creator` to create or refine an intent (it produced `INTENT.md`).
- `/intent-driven-starter:execute-intent` to implement an intent with its understand → refine → delta → implement → validate → stop discipline.
- A Stop hook (`scripts/forbid-secrets.py`) that scans the git diff for likely secrets and blocks finishing if it finds one. It does nothing until this folder is a git repository.

The `location-story` skill in the plugin is for map and geocoding projects and does not apply here.
