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

Deterministic code gets `forge:verify` — run it once, read the output, done. **Non-deterministic behavior** (anything LLM- or agent-driven) needs evals, because a single green run can be luck. Evals are the unit tests of AI work: a repeatable input set + expected behavior + a grader, run **enough times that the result isn't luck** (see "how many runs" below).

## Two kinds of eval
- **Capability** — *can it do the thing?* Target a pass rate (e.g. **pass@k ≥ 0.90**). Used while building/improving a feature.
- **Regression** — *does a known-good case still hold?* For release-critical paths, demand **pass^k = 1.0** (every single run passes). Each bug you fix becomes a regression eval so it can't silently return.

## pass@k vs pass^k (pick to the stakes)
- **pass@k** — succeeds in **at least one** of k tries. Right for capability/exploration ("can the model do this at all?").
- **pass^k** — succeeds in **all** k tries. Right for reliability ("can I ship this without it flaking?"). Running once and seeing green tells you neither — you need k.

## How many runs (pick k by stakes, not vibe)
"Run it a few times" is not a number. With **0 failures in n runs** you can only claim the failure rate is below ~`3/n` at 95% confidence (the "rule of three") — so `pass^k = 1.0` at k=3 proves almost nothing, and a release-critical path needs ~20 clean runs to claim <~15% failure. Defaults: capability **k ≥ 10**; release-path regression **k ≥ 20**; never k=1.

## Graders — cheapest reliable one wins
1. **Code / assertion** — exact or structural check. Fast, deterministic, preferred.
2. **Schema / constrained-output** — validate structured output against a JSON schema or type contract; the best cheap grader for any LLM feature emitting structured data.
3. **Rule / regex** — pattern match on output.
4. **Model-as-judge** — an LLM grades against a written rubric. Use only for genuinely open-ended output, and treat the judge as a model under test: **validate it against human labels first** (target ≥0.8 agreement), **pin the judge model + version**, prefer **pairwise/reference comparison** over absolute 1-5 scores, and **randomize answer order** to cancel position bias.
5. **Human** — last resort, for subjective quality.

## Building the eval set
Real inputs paired with expected behavior, covering: the common case, the edge cases, and **every past failure** (regression). Keep a held-out slice you never tune against.

## Anti-patterns
- **Overfitting** prompts to the eval set — always score on held-out cases, or you're memorizing, not improving.
- Chasing pass-rate while **ignoring cost/latency drift** — track tokens and time alongside accuracy.
- Evals that only exercise the happy path.

## Evaluating a prompt or skill itself
Same shape as `forge:tdd`'s watch-it-fail, applied to instructions: **baseline a fresh agent WITHOUT the skill/prompt** (does it fail or behave wrong?), then add it and confirm it now passes — and run that with/without comparison **k times and compare pass rates**, not once (a single before/after is the same luck this skill warns against). If it passes either way, the skill isn't earning its place. (This is how Anthropic's `skill-creator` validates skills.)

## Exit
Capability evals at target pass@k **and** regression evals at pass^k = 1.0 → `forge:verify` / `forge:ship`. For an AI app like this one, the LLM ranking, extraction, and tailoring paths are exactly what to put behind evals.
