# ModelGate

A pre-implementation model-selection skill.

It uses the current feature/intent/plan, scores four factors, and recommends the minimum sufficient tier. The scorer is deterministic and makes no external API calls.

Suggested team workflow:

1. Create/refine feature intent in plan mode.
2. Run `/review-intent`.
3. Run `/model-gate`.
4. Select the recommended model tier in the IDE.
5. Implement with `/run-feature`.
6. Validate with `/prove-feature`.
7. Escalate model tier only when evidence shows the current tier is insufficient.
