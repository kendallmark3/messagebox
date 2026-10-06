# AI Suggestion Box

An AI-powered employee suggestion workbench. Employees describe a problem, improvement idea, or opportunity they see in their daily work. AI returns a short structured evaluation, the idea is kept and moved through a pipeline as it earns it, and once it is approved for prototyping the workbench says what the evidence justifies doing next.

> **Status:** prototype complete. Seven intents are implemented: V1 (submission and AI evaluation), V2 (My Ideas, Review Pipeline, Analytics, Impact), V3 and V5 (an evidence-led analysis on approval), V4 (submitting from a template), V6 (an evidence gate on every forward move), and V7 (an admin approval before Investment). All three AI calls have been run against the live Anthropic API. It is a prototype: it runs on one machine, has no user accounts, and stores ideas in a local file.

## Run it locally

Requires Node.js 20.12 or later.

```bash
npm install
cp .env.example .env   # then put your Anthropic API key in .env
npm start
```

Open http://localhost:3210. Set `PORT` in `.env` to use a different port. The app is reachable only from your own machine unless you set `HOST`; it has no sign-in.

The API key is read by the server only. It is never sent to the browser, and `.env` is git-ignored.

To try the Investment approval, also set `ADMIN_PASSCODE` in `.env` to a passcode of your choosing. Without it, admin sign-in is switched off.

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

Someone who already has evidence or results can submit from a template instead. "Use the template" on the Submit screen puts it in the box, and "see a filled-in example" shows a completed one. The workbench recognises the sections, lists the idea by its title, and later fills in each stage note and the outcome from the matching section, so nobody has to type them again. The template files are in [templates/](templates/).

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

The ideas submitted from this browser, newest first. Each opens to its evaluation, its stage, and its history. There is no sign-in, so "mine" means "from this browser". You can delete any of your own ideas from here; it asks once before deleting, and a deleted idea is gone for good.

### Review Pipeline

All ideas grouped by stage. Anyone can open an idea and move it one stage forward or back; a short note is required and is kept in the idea's history. For an idea at Pilot or Investment, the reviewer can also record an outcome.

### The evidence gate

Every forward move is checked against a fixed bar for the next stage, so an idea advances because its evidence got stronger, not because someone typed "approved".

| Move | The bar |
| --- | --- |
| Problem → Evidence | Something about the problem has been measured or counted, not only asserted. |
| Evidence → Prototype | The measurements show the problem is big enough to be worth a small test. |
| Prototype → Pilot | A small test has been run and its result is recorded. |
| Pilot → Investment | Real users tried it over a stated period and the measured result is recorded. |

- If the record meets the bar, the move is saved along with the evidence it rested on.
- If not, nothing is saved, and the reviewer is told the one thing that is missing. They can add it, or move the idea anyway with a reason.
- Overrides are recorded in the idea's history and marked on the board. The gate never blocks a person outright.

### Approval before Investment

An idea at Pilot needs an admin's approval before it can move to Investment, and the approver cannot be the person who submitted it. Unlike the evidence gate, this one cannot be overridden.

- Everyone sees the "Approve for Investment" button, so the step is visible in the process.
- Pressing it without being signed in as admin, or as an admin in the browser the idea was submitted from, shows a message and approves nothing.
- An admin signs in from "Admin sign-in" in the sidebar, with a name and the shared passcode set as `ADMIN_PASSCODE` in `.env`.
- Moving an idea back clears its approval.

This is a prototype of the rule, not real access control: there is one shared passcode and no user accounts, and "not the submitter" means "not the submitter's browser".

### Analysis on approval

Moving an idea from Evidence to Prototype is the approval. It starts a second AI call that says what the evidence justifies doing next:

- **A recommendation:** Do not build yet, Change the process first, or Build the smallest next step, with the smallest next move and the reason.
- **The investment trigger:** build only if evidence shows the next increment will produce enough measurable value to justify its cost and operational burden, plus what that would mean for this idea.
- **What the evidence says,** sorted into known, reported but unverified, and inferred, so loose notes do not turn into facts.
- **If automation is justified…:** a small, conditional sketch of what could be built.

It works only from what is stored on the idea, and it is labelled as an AI-generated suggestion wherever it is shown. A failed analysis never blocks or undoes the move, and a reviewer can run it again from Review Pipeline.

> Don't architect the imagined solution. Architect the smallest next move the evidence justifies.

### Analytics

Ideas submitted, how many have moved beyond Problem, strong candidates, ideas per stage, ideas per recommendation, and submissions per day. Everything is counted from stored ideas.

### Impact

Ideas at Pilot or Investment, with a reviewer-entered outcome and estimated hours saved per week. These figures are reviewer estimates; AI does not produce them.

## Visual direction

The app follows the concept image below in spirit: a polished enterprise workbench with dark navy navigation, a light workspace, blue and orange accents, clean cards, and an obvious pipeline. It is desktop-first.

![Concept image for the Ideas Workbench](concept.png)

The concept's search box, vote counts, and per-stage counts are deliberately left out; they are not in the intent and would be non-functional or invented data. The Top Ideas panel is a static list of examples.

## What it deliberately does not do

- user accounts or per-person sign-in (there is one shared admin passcode, for the Investment approval only)
- approval routing, multiple approvers, assignments, notifications, budgeting, rewards, voting, or portfolio management
- Jira or other integrations
- chat, AgentCore, or multi-agent orchestration
- diagrams, generated code, cost estimates, or delivery plans
- AI moving ideas between stages or producing analytics or impact figures

## Repository contents

| Path | What it is |
| --- | --- |
| [server.js](server.js) | Serves the page, stores ideas, and makes the three Anthropic API calls: evaluation on submission, the evidence check on forward moves, and analysis on approval |
| [public/](public/) | The workbench screens: HTML, CSS, and browser script |
| [templates/intents/](templates/intents/) | The intent files the app was built from (see below) |
| [templates/](templates/) | The idea template and a filled-in example; the Submit screen offers both |
| [concept.png](concept.png) | The concept image the screens follow |
| [CLAUDE.md](CLAUDE.md) | Guidance for Claude Code when working in this repository |
| [intent-driven-starter/](intent-driven-starter/) | Copy of the Intent-Driven Starter plugin (skills, agents, hooks) used to build from the intents |
| [intent-driven-training/](intent-driven-training/) | Copy of the Intent-Driven Training plugin (commands and skills, including ModelGate), kept for reference |

## Intent files

The app was built from the intent files in [templates/intents/](templates/intents/). Start with the [index](templates/intents/README.md), which lists each intent, what later intents changed, and the app's current rules.

| File | What it covers |
| --- | --- |
| [intentv1.md](templates/intents/intentv1.md) | The original intent and the product principle |
| [INTENT.md](templates/intents/INTENT.md) | V1 made implementation-ready, with the evaluation prompt |
| [intentv2.md](templates/intents/intentv2.md) | V2: stored ideas and the four remaining views |
| [intentv3.md](templates/intents/intentv3.md) | V3: an AI analysis for approved ideas; its contract and prompt are superseded by V5 |
| [intentv4.md](templates/intents/intentv4.md) | V4: submitting from a template |
| [intentv5.md](templates/intents/intentv5.md) | V5: the evidence-led analysis, with the analysis prompt |
| [intentv6.md](templates/intents/intentv6.md) | V6: the evidence gate on forward moves, with the gate prompt |
| [intentv7.md](templates/intents/intentv7.md) | V7: the admin approval before Investment |
| [exhappypath.md](templates/intents/exhappypath.md) | A worked example of an idea earning its way to investment; an illustration, not an intent |

Each implemented intent ends with an As Built section. Together they are meant to be enough to rebuild the app.
