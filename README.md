# AI Suggestion Box

An AI-powered employee suggestion workbench. Employees describe a problem, improvement idea, or opportunity they see in their daily work. AI returns a short structured evaluation, the idea is kept and moved through a pipeline as it earns it, and once it is approved for prototyping the workbench proposes a potential architecture for it.

> **Status:** release candidate (git tag `candidate`). All three versions are implemented: V1 (submission and AI evaluation), V2 (My Ideas, Review Pipeline, Analytics, Impact), and V3 (potential architecture on approval). Both AI calls have been run against the live Anthropic API with the four example sentences below.

## Run it locally

Requires Node.js 20.12 or later.

```bash
npm install
cp .env.example .env   # then put your Anthropic API key in .env
npm start
```

Open http://localhost:3210. Set `PORT` in `.env` to use a different port.

The API key is read by the server only. It is never sent to the browser, and `.env` is git-ignored.

Ideas are stored in `data/ideas.json`, which is created on first submission and git-ignored. Delete it to start empty.

## Product principle

Employees submit **problems and opportunities**, not technologies. They are never asked to propose AI or to understand it. The system helps decide what deserves further investigation.

This is a workbench, not a portal, and not a chatbot.

**Let good ideas earn the right to proceed.**

## What it does

### Submit Idea

The employee sees one prompt, **What's your idea or problem?**, and describes it in plain language, for example:

- "We spend 10 hours every week reconciling three reports."
- "Customers have to enter the same information twice."
- "This approval process takes four days and usually only needs ten minutes."
- "We throw away usable packaging every week."

There is one free-text input and no form. On submit, AI returns an evaluation and the idea is saved.

| Field | Question it answers |
| --- | --- |
| Problem | What appears to be happening? |
| Who It Affects | Who experiences the problem? |
| Potential Value | Why might solving this matter? |
| Missing Evidence | What would need to be proven? |
| Smallest Next Step | What is the cheapest practical way to investigate or test the idea? |
| Recommendation | One of: Strong Candidate, Worth Exploring, Needs More Evidence, Low Value / Unclear |

### The pipeline

Every idea sits somewhere on this path, starting at Problem:

**Problem → Evidence → Prototype → Pilot → Investment**

### My Ideas

The ideas submitted from this browser, newest first. Each opens to its evaluation, its stage, and its history. There is no sign-in, so "mine" means "from this browser".

### Review Pipeline

All ideas grouped by stage. Anyone can open an idea and move it one stage forward or back; a short note is required and is kept in the idea's history. For an idea at Pilot or Investment, the reviewer can also record an outcome.

### Potential architecture

Moving an idea from Evidence to Prototype is the approval. It starts a second AI analysis that proposes a solution shape: the pattern, why it fits, its main parts, the data and systems it would touch, a simpler alternative, assumptions, risks, and the smallest first prototype.

- It works only from what is stored on the idea: the suggestion, the evaluation, the reviewer notes, and any outcome.
- It is labelled as an AI-generated suggestion wherever it is shown. It is a starting point, not a design.
- A failed analysis never blocks or undoes the move. A reviewer can run it again from Review Pipeline, and the new result replaces the old one.

### Analytics

Ideas submitted, how many have moved beyond Problem, strong candidates, ideas per stage, ideas per recommendation, and submissions per day. Everything is counted from stored ideas.

### Impact

Ideas at Pilot or Investment, with a reviewer-entered outcome and estimated hours saved per week. These figures are reviewer estimates; AI does not produce them.

## Visual direction

The app follows the concept image below in spirit: a polished enterprise workbench with dark navy navigation, a light workspace, blue and orange accents, clean cards, and an obvious pipeline. It is desktop-first.

![Concept image for the Ideas Workbench](concept.png)

The concept's search box, vote counts, and per-stage counts are deliberately left out; they are not in the intent and would be non-functional or invented data. The Top Ideas panel is a static list of examples.

## What it deliberately does not do

- sign-in, accounts, or roles
- approval routing, assignments, notifications, budgeting, rewards, voting, or portfolio management
- Jira or other integrations
- chat, AgentCore, or multi-agent orchestration
- diagrams, generated code, cost estimates, or delivery plans
- AI moving ideas between stages or producing analytics or impact figures

## Repository contents

| Path | What it is |
| --- | --- |
| [server.js](server.js) | Serves the page, stores ideas, and makes the two Anthropic API calls: evaluation on submission and analysis on approval |
| [public/](public/) | The workbench screens: HTML, CSS, and browser script |
| [intentv1.md](intentv1.md) | The original V1 intent; the source of truth for product meaning |
| [INTENT.md](INTENT.md) | Implementation-ready V1 intent, with its as-built decisions and the evaluation prompt |
| [intentv2.md](intentv2.md) | The V2 intent: stored ideas and the four remaining views, with its as-built decisions |
| [intentv3.md](intentv3.md) | The V3 intent: a potential architecture for approved ideas, with its as-built decisions and the analysis prompt |
| [concept.png](concept.png) | The concept image the screens follow |
| [CLAUDE.md](CLAUDE.md) | Guidance for Claude Code when working in this repository |
| [intent-driven-starter/](intent-driven-starter/) | Copy of the Intent-Driven Starter plugin (skills, agents, hooks) used to build from the intents |

The three intent files with their As Built sections are meant to be enough to rebuild the app: [INTENT.md](INTENT.md), then [intentv2.md](intentv2.md), then [intentv3.md](intentv3.md).
