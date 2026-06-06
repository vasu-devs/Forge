---
name: review
description: Review code changes for correctness and quality before merging. Use after implementing a meaningful chunk or feature, between plan tasks, or before opening a PR — to catch issues while they're cheap.
---

```
██████╗ ███████╗██╗   ██╗██╗███████╗██╗    ██╗
██╔══██╗██╔════╝██║   ██║██║██╔════╝██║    ██║
██████╔╝█████╗  ██║   ██║██║█████╗  ██║ █╗ ██║
██╔══██╗██╔══╝  ╚██╗ ██╔╝██║██╔══╝  ██║███╗██║
██║  ██║███████╗ ╚████╔╝ ██║███████╗╚███╔███╔╝
╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚═╝╚══════╝ ╚══╝╚══╝
```

# Review on two axes, by a fresh set of eyes

## Author-bias elimination
The reviewer must **not** be the author. A self-review shares the exact blind spots that produced the bug. Dispatch a **fresh subagent** with *crafted context* — the diff plus the originating spec/issue — **not** your session history. The reviewer should reach its verdict without your reasoning leaking in. If you can't spawn a subagent, simulate the reset: review strictly from the diff + spec, deliberately setting aside your implementation reasoning.

## Independent axes
Run these reviews so they don't pollute each other (ideally as **parallel** subagents that never see each other's findings), then present them **side by side without merging or reranking**:

- **Spec** — does the change do what was actually asked? Right behavior, all the acceptance criteria, nothing missing or scope-crept.
- **Correctness** — is the code *actually right*, independent of the spec? Edge cases, boundary/off-by-one, error and failure paths, null/empty, concurrency and races, resource leaks, injection. (Code can satisfy the spec and follow every convention and still be wrong — this axis is the "correctness" the skill's name promises.)
- **Standards** — does it follow this repo's conventions and quality bar? Naming, structure, tests, idioms.

Keep them separate because a change routinely passes one and fails another. A merged review lets one mask the others.

First **run the repo's own lint / typecheck / test commands and confirm they're green**; then the Standards reviewer can skip what tooling already enforces (formatting, lint) and spend its attention on judgment calls. Never skip a check you didn't actually run.

## Adversarial framing
Assume there *are* problems and go find them. "I found zero issues" almost always means you weren't looking hard enough. A **clean verdict is only valid if** you inspected every changed hunk and can name the single riskiest line you considered and why it's actually safe.

## Severity tiers → action
- **Critical** — security hole, data loss, crash, incorrect output, or a regression. Block; fix before anything else.
- **Important** — missing test for new logic, an unhandled error path, or a performance cliff. Fix before proceeding.
- **Minor** — style not enforced by tooling, naming. Note them; don't gate.

## Receiving the findings (when feedback comes to you)
- Evaluate each point **technically**. Don't perform agreement ("Great catch!") — just assess and act.
- If a finding is wrong, push back with reasoning rather than complying blindly.
- If asked to "implement this properly/fully," grep for actual usage first — don't build flexibility nobody needs (`forge:principles` #2).

## Exit
Fix Critical/Important, then `forge:verify` with evidence, then `forge:ship`.
