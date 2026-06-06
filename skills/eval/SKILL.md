---
name: eval
description: Measure non-deterministic behavior — LLM features, agents, prompts, or a skill itself — with repeatable evals instead of one-shot checks. Use when building or tuning AI/LLM functionality (ranking, extraction, generation, agent loops), when a feature could pass once by luck, or when validating that a prompt or skill actually changes behavior.
---

```
███████╗██╗   ██╗ █████╗ ██╗
██╔════╝██║   ██║██╔══██╗██║
█████╗  ██║   ██║███████║██║
██╔══╝  ╚██╗ ██╔╝██╔══██║██║
███████╗ ╚████╔╝ ██║  ██║███████╗
╚══════╝  ╚═══╝  ╚═╝  ╚═╝╚══════╝
```

# Eval-driven development

Deterministic code gets `forge:verify` — run it once, read the output, done. **Non-deterministic behavior** (anything LLM- or agent-driven) needs evals, because a single green run can be luck. Evals are the unit tests of AI work: a repeatable input set + expected behavior + a grader, run enough times to trust the result.

## Two kinds of eval
- **Capability** — *can it do the thing?* Target a pass rate (e.g. **pass@k ≥ 0.90**). Used while building/improving a feature.
- **Regression** — *does a known-good case still hold?* For release-critical paths, demand **pass^k = 1.0** (every single run passes). Each bug you fix becomes a regression eval so it can't silently return.

## pass@k vs pass^k (pick to the stakes)
- **pass@k** — succeeds in **at least one** of k tries. Right for capability/exploration ("can the model do this at all?").
- **pass^k** — succeeds in **all** k tries. Right for reliability ("can I ship this without it flaking?"). Running once and seeing green tells you neither — you need k.

## Graders — cheapest reliable one wins
1. **Code / assertion** — exact or structural check. Fast, deterministic, preferred.
2. **Rule / regex** — pattern match on output.
3. **Model-as-judge** — an LLM grades the output against a written rubric. Use only when the output is genuinely open-ended.
4. **Human** — last resort, for subjective quality.

## Building the eval set
Real inputs paired with expected behavior, covering: the common case, the edge cases, and **every past failure** (regression). Keep a held-out slice you never tune against.

## Anti-patterns
- **Overfitting** prompts to the eval set — always score on held-out cases, or you're memorizing, not improving.
- Chasing pass-rate while **ignoring cost/latency drift** — track tokens and time alongside accuracy.
- Evals that only exercise the happy path.

## Evaluating a prompt or skill itself
Same shape as `forge:tdd`'s watch-it-fail, applied to instructions: **baseline a fresh agent WITHOUT the skill/prompt** (does it fail or behave wrong?), then add it and confirm it now passes. If it passes either way, the skill isn't earning its place. (This is how Anthropic's `skill-creator` validates skills.)

## Exit
Capability evals at target pass@k **and** regression evals at pass^k = 1.0 → `forge:verify` / `forge:ship`. For an AI app like this one, the LLM ranking, extraction, and tailoring paths are exactly what to put behind evals.
