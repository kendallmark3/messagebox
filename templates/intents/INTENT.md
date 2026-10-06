# AI Suggestion Box — V1 Implementation Intent

Source: [intentv1.md](intentv1.md). This file restates that intent in implementation-ready form. Where the two differ, intentv1.md wins on product meaning.

Status: implemented. The **As Built** section at the end records every decision the implementation made, so the app can be rebuilt from this file together with [intentv2.md](intentv2.md) and [intentv3.md](intentv3.md).

## 1. Intent / Goal

Build the first working version of the Ideas Workbench: a single-screen web application where an employee describes a workplace problem or improvement idea in plain language and receives a concise, structured AI evaluation.

Employees submit problems and opportunities, not technologies. The system helps decide what deserves further investigation. It is an evaluation workbench, not a portal and not a chat.

## 2. Inputs / Context

### State when this intent was written

- The repository was greenfield: it held intentv1.md, README.md, and a copy of the Intent-Driven Starter plugin, with no application code or build tooling.
- There was no existing Anthropic integration to reuse, so the simplest direct Anthropic API integration is used.
- The concept image that intentv1.md refers to is [concept.png](../../concept.png). The screen follows it in spirit, within the Visual Direction and Constraints below.

### Runtime input

One free-text suggestion from the employee. No other fields, no multi-step form.

### Configuration

- An Anthropic API key supplied through an environment variable. It is used server-side only, never sent to the browser, and never committed.

### Technical decisions

The implementer chose the stack, preferring the smallest setup that serves one page plus one server-side call to the Anthropic API. The choices made are recorded under As Built.

## 3. Outputs

### The application

One desktop-first screen with:

- **Left navigation:** Submit Idea, My Ideas, Review Pipeline, Analytics, Impact. Only Submit Idea is functional. The others are visible but inert and add no implementation behind them.
- **Header:** "Ideas Workbench" and a **+ New Idea** action that resets the screen to an empty submission.
- **Submission area:** a prominent input labelled "What's your idea or problem?" and a submit action.
- **Evaluation result:** the six fields defined below, shown as clean cards or sections, not as a chat transcript.
- **Pipeline visual:** Problem → Evidence → Prototype → Pilot → Investment, with **Problem** marked as the current stage for a submitted suggestion. The other stages are informational.
- **Top Ideas:** a small static list: Reduce Packaging Waste, Automate Customer Onboarding Checks, Simplify Monthly Reporting, Reduce Duplicate Data Entry. Each has a short static category label.

### The evaluation contract

The AI call returns structured data with exactly these fields, each one to three short sentences:

| Field | Content |
| --- | --- |
| `problem` | What appears to be happening |
| `whoItAffects` | Who experiences the problem |
| `potentialValue` | Why solving it might matter |
| `missingEvidence` | What would need to be proven |
| `smallestNextStep` | The cheapest practical way to investigate or test the idea |
| `recommendation` | Exactly one of: `Strong Candidate`, `Worth Exploring`, `Needs More Evidence`, `Low Value / Unclear` |

The evaluation is a single request and response. There is no follow-up conversation.

### Visual direction

- dark navy navigation, light main workspace
- blue and orange accents
- clean cards, strong typography, generous spacing
- an obvious pipeline visual, minimal clutter
- polished enough for an executive presentation

It must not look like a generic chatbot, like Jira, or like an experiment.

### Repository deliverables

- The application source.
- README.md updated with how to configure the API key and run the app locally.

## 4. Success Criteria

A user can:

1. Open the workbench and immediately understand what it does.
2. Enter a real workplace problem or improvement idea.
3. Submit it with minimal interaction.
4. Receive a concise AI-generated evaluation with all six fields.
5. See what evidence is missing and the smallest recommended next step.
6. See where the suggestion sits in Problem → Evidence → Prototype → Pilot → Investment.

The experience feels simpler than writing an email or preparing a PowerPoint proposal.

## Acceptance Criteria

- Submitting each of the four example sentences from intentv1.md returns an evaluation with all six fields populated and a recommendation from the allowed set.
- An empty or whitespace-only suggestion cannot be submitted.
- A suggestion longer than 4,000 characters is rejected with a clear message, not truncated.
- While the evaluation is in progress, the screen shows a clear waiting state and blocks duplicate submission.
- If the AI call fails or returns data that does not match the contract, the user sees a short, plain error and can retry; no partial or malformed evaluation is shown.
- The API key does not appear in any browser-delivered code, network response, or committed file.
- The four non-functional navigation items do not navigate anywhere and do not produce errors.

## Constraints

- Keep V1 small. Do not over-engineer.
- No persistence unless the first proof turns out to need it. Losing the evaluation on refresh is acceptable.
- No chat.
- No AgentCore, multi-agent orchestration, or workflow engine. This is one goal-oriented model call.
- No Jira integration, approval routing, budgeting, rewards, portfolio management, or simulation and prototyping features.
- No authentication or user accounts.
- The employee is never asked to propose or understand AI.
- Prefer the simplest deployment architecture that supports the experience.

## Validation / Evidence

There are no existing test, build, or lint conventions in this repository, so evidence is collected from the running application:

- Run the app locally and submit the four example sentences; record each returned evaluation.
- Exercise the empty-input, waiting, and failure states (for example, with an invalid API key) and confirm the behavior in Acceptance Criteria.
- Inspect the browser's delivered code and network traffic to confirm the API key is absent.
- Capture a screenshot of the main screen with an evaluation shown, for comparison against the concept image or the Visual Direction list.
- If the chosen stack ships with a build or lint command, run it and report the result.

Report what was actually observed, including anything that failed or could not be checked.

## Stop Condition

Stop when the submission experience and AI evaluation work cleanly, the acceptance criteria are met with evidence, and the screen matches the visual direction. Do not continue into enterprise workflow features, extra polish, or abstractions for later versions.

## As Built

These are the decisions the V1 implementation made. V2 and V3 extend them; where a later intent changes one, that is noted.

### Stack and layout

- Node.js 20.12 or later, ES modules, no framework and no build step.
- Two dependencies only: `@anthropic-ai/sdk` and `zod`.
- `npm start` runs `node server.js`. The server listens on port 3210, or `PORT` if set, and only on `127.0.0.1` unless `HOST` is set. There is no sign-in, so it is not reachable from other machines by default.
- A `.env` file is loaded when present. `.env.example` documents `ANTHROPIC_API_KEY`, `PORT`, and `HOST`. `.env` and `node_modules/` are git-ignored.
- `server.js` is a plain `node:http` server. It serves exactly three files from `public/` (`/` as `index.html`, `/styles.css`, `/app.js`) through an explicit allow-list; every other path returns 404.
- `public/` holds `index.html`, `styles.css`, and `app.js`, with no client-side libraries. Icons are inline SVG symbols.

### The evaluation call

- Model `claude-opus-5-5`, called through the SDK's `messages.parse` with the evaluation contract as a zod schema passed as the structured output format.
- Effort `low`, `max_tokens` 16000, a 90-second timeout, and one retry.
- The employee's trimmed text is the only user message.
- The result is validated against the schema again on the server, and its shape is checked once more in the browser before anything is shown.
- No server-side refusal fallback is requested. A refusal is reported as "This suggestion couldn't be evaluated. Try describing the workplace problem differently."
- The system prompt is in the appendix below.

### Endpoint and limits

- V1 exposed `POST /api/evaluate`, taking `{ suggestion }` and returning `{ evaluation }`. V2 replaced it with `POST /api/ideas`.
- The suggestion is trimmed and must be 1 to 4,000 characters. Request bodies over 32 KB are rejected.
- A suggestion, stage note, or outcome description that looks like a credential (an API key, access token, or private key) is refused before it is stored or sent to the model.
- Errors are returned as `{ error }` with a short user-safe message; details go to the server log only.

| Situation | Status | Message |
| --- | --- | --- |
| Empty suggestion | 400 | Describe your idea or problem first. |
| Too long | 400 | Please keep it under 4000 characters. |
| Unreadable request | 400 | The request could not be read. |
| Text that looks like a credential | 400 | That looks like a password or API key. Remove it and try again. |
| No or invalid API key | 503 | The evaluation service is not configured yet. |
| Rate limited | 503 | The evaluation service is busy. Please try again in a moment. |
| API failure or output not matching the contract | 502 | We couldn't evaluate this idea. Please try again. |
| Browser cannot reach the server | n/a | We couldn't reach the workbench. Check your connection and try again. |

### Screen

- **Sidebar:** 248px wide, a dark navy gradient (`#0b1b33` to `#12284a`). A lightbulb mark, the name "Ideas Workbench", and a small blue "AI" chip. Five navigation items, each with an icon; the active one is a solid blue pill. The footer line reads "Let good ideas earn the right to proceed."
- **Header:** the title "Ideas Workbench", the line "Tell us about a problem or opportunity you see at work. You'll get a quick assessment of whether it's worth pursuing.", and an orange "+ New Idea" button on the right.
- **First row:** the "Submit an Idea" card beside a 360px "Top Ideas" card.
  - The submit card has the label "What's your idea or problem?", a text area with the placeholder "For example: We spend 10 hours every week reconciling three reports.", the hint "Describe it the way you'd tell a colleague. You don't need a solution.", and a blue "Submit Idea" button that is disabled until there is text.
  - Top Ideas lists four static entries, each with a coloured icon tile: Reduce Packaging Waste (High impact · Sustainability), Automate Customer Onboarding Checks (Efficiency · Customer experience), Simplify Monthly Reporting (Efficiency · Finance), Reduce Duplicate Data Entry (Quality · Operations).
- **Second row:** the "Idea Pipeline" card. Five circular icons joined by arrows, each with its name and a caption:

| Stage | Colour | Caption |
| --- | --- | --- |
| Problem | `#1d5fd6` | New ideas start here |
| Evidence | `#4a9be8` | Show that it matters |
| Prototype | `#f07c1b` | Test it cheaply |
| Pilot | `#eda514` | Try it with real users |
| Investment | `#17a06a` | Fund and scale it |

  The current stage has an orange ring and a bold caption. After a successful submission the Problem caption becomes "Your idea is here".
- **Below the pipeline:** the waiting notice ("Evaluating your idea…" with a spinner), the error notice with a "Try again" button, or the Evaluation card.
- **Evaluation card:** the recommendation as a pill at top right, then Problem, Who it affects, Potential value, and Missing evidence in a two-column grid, and Smallest next step full width with a blue tint. Pill colours: Strong Candidate green, Worth Exploring blue, Needs More Evidence orange, Low Value / Unclear grey.
- **Behaviour:** while waiting, the button is disabled and the text area is read-only. When the evaluation arrives, the page scrolls to the pipeline. "+ New Idea" clears the text, the evaluation, and any error, and returns to the top.
- **Palette:** page background `#f3f6fb`, white cards with a `#e1e7f0` border and 14px corners, ink `#14213a`, muted text `#5d6b82`, blue `#1d5fd6`, orange `#f07c1b`. System sans-serif font stack. Below 1080px the two cards stack; below 760px the sidebar is hidden.

### Deliberate differences from the concept image

The concept's search box, vote counts on Top Ideas, and per-stage counts in the pipeline are left out. None is in the intent, and each would be non-functional or invented data.

### How it was validated

The browser flows were driven in headless Chrome against a local stand-in for the Anthropic API (the SDK honours `ANTHROPIC_BASE_URL`). The four example sentences from intentv1.md were then run through the live API, and each returned a complete evaluation with an allowed recommendation.

## Appendix: Evaluation System Prompt

```text
You evaluate employee suggestions for an internal ideas workbench.

An employee has described a workplace problem, improvement idea, or opportunity in their own words. They are not expected to propose a solution or a technology. Assess what they wrote so a reviewer can decide whether it deserves further investigation.

Fill in each field in one to three short, plain sentences:
- problem: what appears to be happening.
- whoItAffects: who experiences the problem.
- potentialValue: why solving it might matter.
- missingEvidence: what would need to be proven before anyone invests in it.
- smallestNextStep: the cheapest practical way to investigate or test the idea.
- recommendation: "Strong Candidate" when the problem is concrete and the value is evident from what was written; "Worth Exploring" when it is plausible and a cheap check would settle it; "Needs More Evidence" when the claim is plausible but key facts are missing; "Low Value / Unclear" when the text does not describe a real workplace problem or the benefit is negligible.

Base the assessment only on what the employee wrote. Do not invent numbers, names, or systems. When something is unknown, say so in missingEvidence. Do not prescribe AI or any particular technology as the solution.
```
