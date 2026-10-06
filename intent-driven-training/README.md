# Intent-Driven Training Plugin

A small training/process plugin for Intent-Driven Engineering. Install instructions and a full walkthrough are in the [repository README](../../README.md).

Core loop:

**Intent -> smallest safe delta -> validation -> evidence -> refine only when evidence says so**

## Included commands

- `/setup-feature` - create the smallest useful feature workspace
- `/review-intent` - check an intent for outcome, inputs, outputs, success criteria, and unnecessary constraints
- `/run-feature` - implement the smallest safe delta
- `/prove-feature` - gather running evidence against success criteria
- `/simplify` - remove unnecessary implementation detail and constraints
- `/context-map` - identify the minimum context needed for the work

Prefix a command with the plugin name when another plugin or a built-in uses the same name, for example `/intent-driven-training:simplify`.

## Included skills

- **Context Discipline** - load only what the task needs
- **Feature Workflow** - keep work centered on intent, evidence, and progressive refinement
- **ModelGate** - choose the minimum sufficient intelligence before implementation; run it with `/model-gate`

`/model-gate` is provided by the skill itself. Do not add a `commands/model-gate.md`: a command with the same name shadows the skill and the scorer never runs.

## ModelGate principle

Do not spend more intelligence than the work requires.

The routing order is:

1. Deterministic tooling / no LLM
2. Fast / low-cost model
3. Standard engineering model
4. Reasoning / frontier model

ModelGate does not call another model API. It uses the model already active in the IDE to classify four factors, then a tiny local deterministic script calculates the recommendation. The script needs `python3`.
