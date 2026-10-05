# AI Suggestion Box

An AI-powered employee suggestion workbench. Employees describe a problem, improvement idea, or opportunity they see in their daily work, and AI returns a short structured evaluation so good ideas can earn the right to proceed.

> **Status:** V1 is specified but not yet built. This repository currently holds the intent ([intentv1.md](intentv1.md)) and a copy of the Intent-Driven Starter plugin ([intent-driven-starter/](intent-driven-starter/)). There is no application code yet.

## Product principle

Employees submit **problems and opportunities**, not technologies. They are never asked to propose AI or to understand it. The system helps decide what deserves further investigation.

This is a workbench, not a portal, and not a chatbot.

## What V1 does

1. The employee opens the **Ideas Workbench** and sees one prominent prompt: **What's your idea or problem?**
2. They describe it in plain language, for example:
   - "We spend 10 hours every week reconciling three reports."
   - "Customers have to enter the same information twice."
   - "This approval process takes four days and usually only needs ten minutes."
3. They submit, and AI returns a concise evaluation.

There is one free-text input. There are no long forms; AI derives the structure and points out what is missing.

### The AI evaluation

| Field | Question it answers |
| --- | --- |
| Problem | What appears to be happening? |
| Who It Affects | Who experiences the problem? |
| Potential Value | Why might solving this matter? |
| Missing Evidence | What would need to be proven? |
| Smallest Next Step | What is the cheapest practical way to investigate or test the idea? |
| Recommendation | One of: Strong Candidate, Worth Exploring, Needs More Evidence, Low Value / Unclear |

Explanations stay short. The evaluation uses the Anthropic API through the simplest available integration.

### The pipeline

Every suggestion sits somewhere on this path:

**Problem → Evidence → Prototype → Pilot → Investment**

In V1 a submitted suggestion starts at **Problem**. The other stages are shown for context only; the workflow behind them is not implemented.

## Screen layout

- **Left navigation:** Submit Idea, My Ideas, Review Pipeline, Analytics, Impact. Only **Submit Idea** works in V1; the rest are visual placeholders.
- **Header:** "Ideas Workbench" with a **+ New Idea** action.
- **Main area:** the submission input, the AI evaluation, and the pipeline visual.
- **Top Ideas:** a small static set of examples, such as Reduce Packaging Waste, Automate Customer Onboarding Checks, Simplify Monthly Reporting, and Reduce Duplicate Data Entry.

## Visual direction

The app should follow the supplied concept image and look like a polished enterprise workbench, good enough for an executive presentation:

- dark navy navigation with a light main workspace
- blue and orange accents
- clean cards, strong typography, generous spacing
- an obvious pipeline visual and minimal clutter
- desktop-first

It should not look like a generic chatbot, like Jira, or like an experiment.

## Out of scope for V1

- full enterprise workflow, approval routing, budgeting, rewards, portfolio management
- Jira integration
- AgentCore or multi-agent orchestration
- simulation or prototyping features
- chat
- persistence, unless the first proof turns out to need it

Technical decisions belong to the implementer, with a preference for the simplest deployment architecture that supports the experience.

## Success criteria

A user can:

1. Open the workbench and immediately understand what it does.
2. Enter a real workplace problem or improvement idea.
3. Submit it with minimal interaction.
4. Receive a concise AI-generated evaluation.
5. See what evidence is missing and the smallest recommended next step.
6. See where the suggestion sits in the pipeline.

The whole experience should feel simpler than writing an email or preparing a PowerPoint proposal.

**V1 stops** when the submission experience and AI evaluation work cleanly and the app visually resembles the concept. Enterprise workflow features belong to later, evidence-driven versions.

## Repository contents

| Path | What it is |
| --- | --- |
| [intentv1.md](intentv1.md) | The full V1 intent; the source of truth for this README |
| [intent-driven-starter/](intent-driven-starter/) | Copy of the Intent-Driven Starter plugin (skills, agents, hooks) used to build from the intent |
