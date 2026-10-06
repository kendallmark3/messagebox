---
name: context-discipline
description: Use when deciding what repository context to load for a feature, plan, review, or implementation.
version: 1.0.0
---
# Context Discipline

Load the minimum context that can support a correct decision.

1. Start with the feature intent or plan.
2. Locate the smallest relevant set of files, interfaces, tests, and repository patterns.
3. Prefer targeted reads over broad repository ingestion.
4. Do not reload stable context without evidence it is needed.
5. Expand context only when the current evidence is insufficient.
