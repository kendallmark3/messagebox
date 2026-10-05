# AI Suggestion Box — V1 Implementation Intent

Source: [intentv1.md](intentv1.md). This file restates that intent in implementation-ready form. Where the two differ, intentv1.md wins on product meaning.

## 1. Intent / Goal

Build the first working version of the Ideas Workbench: a single-screen web application where an employee describes a workplace problem or improvement idea in plain language and receives a concise, structured AI evaluation.

Employees submit problems and opportunities, not technologies. The system helps decide what deserves further investigation. It is an evaluation workbench, not a portal and not a chat.

## 2. Inputs / Context

### Current state

- The repository is greenfield: it holds intentv1.md, README.md, and a copy of the Intent-Driven Starter plugin. There is no application code, no build tooling, and no git history.
- There is no existing Anthropic integration to reuse, so use the simplest direct Anthropic API integration.
- The concept image that intentv1.md refers to is [concept.png](concept.png). It was added after this intent was first written; the screen follows it in spirit, within the Visual Direction and Constraints below.

### Runtime input

One free-text suggestion from the employee. No other fields, no multi-step form.

### Configuration

- An Anthropic API key supplied through an environment variable. It is used server-side only, never sent to the browser, and never committed.

### Technical decisions

The implementer chooses the stack. Prefer the smallest setup that serves one page plus one server-side call to the Anthropic API.

## 3. Outputs

### The application

One desktop-first screen with:

- **Left navigation:** Submit Idea, My Ideas, Review Pipeline, Analytics, Impact. Only Submit Idea is functional. The others are visible but inert and add no implementation behind them.
- **Header:** "Ideas Workbench" and a **+ New Idea** action that resets the screen to an empty submission.
- **Submission area:** a prominent input labelled "What's your idea or problem?" and a submit action.
- **Evaluation result:** the six fields defined below, shown as clean cards or sections, not as a chat transcript.
- **Pipeline visual:** Problem → Evidence → Prototype → Pilot → Investment, with **Problem** marked as the current stage for a submitted suggestion. The other stages are informational.
- **Top Ideas:** a small static list: Reduce Packaging Waste, Automate Customer Onboarding Checks, Simplify Monthly Reporting, Reduce Duplicate Data Entry.

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

## Open Items

- **API key:** an Anthropic API key must be available in the local environment before the evaluation can be validated.
