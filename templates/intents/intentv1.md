# AI Suggestion Box — V1 Intent

**Status:** The original intent, kept as written. It was implemented through [INTENT.md](INTENT.md), and later intents deliberately relaxed some of its boundaries (persistence, working navigation, a pipeline workflow, and one approval). See [README.md](README.md) in this folder.

## Intent

Build the first working version of an AI-powered employee suggestion workbench.

The purpose is simple:

Give employees an easy way to submit problems, improvement ideas, and opportunities they see in their daily work.

AI helps organize and evaluate those suggestions so good ideas can eventually earn the right to proceed.

This is a workbench, not a portal.

Keep V1 small, polished, fast, and useful.

---

## Experience

Use the supplied concept image as the visual direction.

The application should feel like a modern executive/enterprise workbench.

Primary screen:

### Left Navigation

- Submit Idea
- My Ideas
- Review Pipeline
- Analytics
- Impact

Only **Submit Idea** needs to be fully functional in V1.

Other navigation items may exist visually but should not introduce unnecessary implementation.

---

## Main Screen

### Header

**Ideas Workbench**

Primary action:

**+ New Idea**

### Submit an Idea

Provide a prominent input area asking:

**What's your idea or problem?**

The employee should be able to describe something naturally.

Examples:

- "We spend 10 hours every week reconciling three reports."
- "Customers have to enter the same information twice."
- "This approval process takes four days and usually only needs ten minutes."
- "We throw away usable packaging every week."

Do not require employees to propose AI.

They submit the problem or opportunity.

---

## AI Evaluation

Use the existing Anthropic integration or the simplest available Anthropic API integration.

When the employee submits an idea, AI should return a concise structured assessment.

### Output

**Problem**

What appears to be happening?

**Who It Affects**

Who experiences the problem?

**Potential Value**

Why might solving this matter?

**Missing Evidence**

What would need to be proven?

**Smallest Next Step**

What is the cheapest practical way to investigate or test the idea?

**Recommendation**

One of:

- Worth Exploring
- Needs More Evidence
- Low Value / Unclear
- Strong Candidate

Keep explanations short.

This is not a chatbot conversation.

It is an evaluation workbench.

---

## Pipeline Visualization

Show the visual pipeline from the concept:

**Problem → Evidence → Prototype → Pilot → Investment**

For V1, the submitted suggestion begins at:

**Problem**

The remaining stages are informational only.

Do not implement the full workflow yet.

---

## Example Ideas Area

Include a small "Top Ideas" or example area similar to the concept image.

Use realistic examples such as:

- Reduce Packaging Waste
- Automate Customer Onboarding Checks
- Simplify Monthly Reporting
- Reduce Duplicate Data Entry

These may be static examples in V1.

---

## Visual Direction

Match the supplied concept image closely in spirit:

- polished enterprise appearance
- dark/navy navigation
- light primary workspace
- blue/orange accents
- clean cards
- strong typography
- generous spacing
- visually obvious pipeline
- minimal clutter
- desktop-first
- professional enough for an executive presentation

Do not make it look like a generic chatbot.

Do not make it look like Jira.

Do not make it look experimental or gimmicky.

---

## Inputs

One natural-language employee suggestion.

No complicated forms.

No 20-question submission process.

AI can derive structure from the employee's description and identify what information is missing.

---

## Constraints / Boundaries

- Keep V1 small.
- Do not over-engineer.
- Do not build a full enterprise workflow.
- Do not add AgentCore.
- Do not add multi-agent orchestration.
- Do not add Jira integration.
- Do not add approval routing.
- Do not add budgeting.
- Do not add rewards.
- Do not add portfolio management.
- Do not add simulation/prototyping yet.
- Do not add chat.
- Do not require the employee to understand AI.
- Prefer the simplest deployment architecture that supports the experience.
- If persistence is unnecessary for this first proof, do not add it.
- Reuse existing project patterns where appropriate.

The implementer owns technical decisions.

---

## Success Criteria

A user can:

1. Open the workbench.
2. Immediately understand what it does.
3. Enter a real workplace problem or improvement idea.
4. Submit it with minimal interaction.
5. Receive a concise AI-generated evaluation.
6. Understand what evidence is missing.
7. See the smallest recommended next step.
8. See where the suggestion sits in the larger:

   **Problem → Evidence → Prototype → Pilot → Investment**

The entire experience should feel simpler than writing an email or preparing a PowerPoint proposal.

---

## Product Principle

Employees submit **problems and opportunities**, not technologies.

The system helps determine what deserves further investigation.

**Let good ideas earn the right to proceed.**

---

## V1 Stop Condition

Stop when the submission experience and AI evaluation work cleanly and the application visually resembles the supplied concept.

Do not continue into enterprise workflow features.

Those belong to later evidence-driven versions.
