---
name: model-gate
description: Use before implementation when a feature, intent, or plan is ready and the team wants to choose the minimum sufficient model, reduce token spend, or decide whether an LLM is needed at all.
version: 1.0.0
allowed-tools: [Read, Glob, Grep, Bash]
model: haiku
---
# ModelGate

## Purpose

Choose the **minimum sufficient intelligence** for the work before implementation begins.

Do not call another model API. Do not benchmark a catalog of models. Do not perform web research. Use the model already active in the IDE, the current plan/intent, and a tiny deterministic scoring script.

Routing order:

1. **NO_LLM** - deterministic tooling is sufficient
2. **FAST** - simple, bounded work
3. **STANDARD** - normal engineering reasoning
4. **REASONING** - novel, ambiguous, cross-system, or high-consequence reasoning

## Keep the preflight cheap

The gate must cost far less than the work it gates.

- If an argument names a file, it is relative to the working directory. Read that file and score from it.
- With no argument, use the plan or intent already in the conversation.
- Do not explore the repository. Open another file only when the plan does not state its own scope, and then at most two.
- Run the scorer once.

## Preflight

Infer these four factors from 0-3:

### Complexity
- 0: mechanical / deterministic
- 1: localized, familiar change
- 2: multiple interacting concerns
- 3: novel architecture or difficult reasoning

### Context
- 0: no repository understanding needed
- 1: one or two known files/patterns
- 2: several components or unfamiliar repository context
- 3: broad, cross-system, or highly ambiguous context

### Consequence
- 0: trivial and easily reversible
- 1: normal development risk
- 2: material production/business impact
- 3: security, safety, compliance, money movement, destructive or hard-to-reverse change

### Capability
- 0: deterministic transformation/tooling
- 1: routine text/code generation
- 2: tool use, debugging, or nontrivial synthesis
- 3: advanced reasoning, multimodal, deep research, or specialized capability

Set `deterministic=true` only when the desired result can be produced reliably without generative reasoning.

## Run the scorer

Execute:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/model-gate/scripts/model-gate.py" \
  --complexity <0-3> \
  --context <0-3> \
  --consequence <0-3> \
  --capability <0-3> \
  [--deterministic]
```

Use the returned tier as the default recommendation unless the feature contains a concrete requirement that the rubric cannot represent. If overriding, state the exact requirement and choose the next sufficient tier, not the strongest available model.

## Output

Reply with this block and nothing after it:

```text
MODEL GATE
Recommended tier: FAST | STANDARD | REASONING | NO_LLM
Confidence: High | Medium | Low

Why:
- <one to three concrete reasons from the plan>

Escalate only if:
- <specific evidence-based trigger>
- <specific evidence-based trigger>
```

If the IDE exposes actual model names, map the chosen tier to an available model using `references/model-tiers.md`. If availability is unknown, recommend the tier only. Never invent an available model.

## Rule

A more capable model is not automatically a better architectural choice. Escalate only when evidence shows the current tier is insufficient.
