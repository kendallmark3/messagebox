#!/usr/bin/env python3
import argparse
import json

p = argparse.ArgumentParser(description="Deterministic ModelGate tier scorer")
for name in ("complexity", "context", "consequence", "capability"):
    p.add_argument(f"--{name}", type=int, choices=range(4), required=True)
p.add_argument("--deterministic", action="store_true")
a = p.parse_args()

if a.deterministic:
    tier = "NO_LLM"
    reason = "The planned outcome can be produced reliably with deterministic tooling."
else:
    score = a.complexity + a.context + a.consequence + a.capability
    if a.capability == 3 or (a.consequence == 3 and a.complexity >= 2):
        tier = "REASONING"
    elif score <= 3:
        tier = "FAST"
    elif score <= 7:
        tier = "STANDARD"
    else:
        tier = "REASONING"
    reason = f"Deterministic score={score}/12 across complexity, context, consequence, and capability."
    # A hard-to-reverse or regulated change is never routed to the cheapest tier,
    # however mechanical it looks.
    if a.consequence == 3 and tier == "FAST":
        tier = "STANDARD"
        reason += " Raised from FAST because consequence=3."

print(json.dumps({
    "tier": tier,
    "scores": {
        "complexity": a.complexity,
        "context": a.context,
        "consequence": a.consequence,
        "capability": a.capability
    },
    "reason": reason
}, indent=2))
