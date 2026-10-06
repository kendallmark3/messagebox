# Model Tier Mapping

Keep this file organization-specific and current. Model names, prices, and availability change quickly.

| Tier | Meaning | Organization mapping |
|---|---|---|
| NO_LLM | Deterministic tool/script/workflow | Configure locally |
| FAST | Lowest-cost model that reliably handles bounded routine work | Configure locally |
| STANDARD | Default engineering model for moderate reasoning and repository work | Configure locally |
| REASONING | Strongest approved model for novel, ambiguous, cross-system, or high-consequence reasoning | Configure locally |

## Policy

- Map only models actually available in the developer's IDE or approved gateway.
- Prefer the least expensive model that has evidence of success for the workload.
- Do not hard-code vendor names into the core decision rubric.
- Review this mapping as model availability, quality, and pricing change.
