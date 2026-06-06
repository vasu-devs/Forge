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
The reviewer must **not** be the author. A self-review shares the exact blind spots that produced the bug. Dispatch a **fresh subagent** with *crafted context* — the diff plus the originating spec/issue — **not** your session history. The reviewer should reach its verdict without your reasoning leaking in.

## Two independent axes
Run two reviews that don't pollute each other (ideally as **parallel** subagents that never see each other's findings), then present them **side by side without merging or reranking**:

- **Spec** — does the change do what was actually asked? Right behavior, all the acceptance criteria, nothing missing or scope-crept.
- **Standards** — does it follow this repo's conventions and quality bar? Naming, structure, error handling, tests, security.

Keep them separate because code routinely passes one and fails the other: it can follow every convention while building the wrong thing, or build exactly the right thing while violating the codebase's patterns. A merged review lets one mask the other.

Tell the Standards reviewer to **skip anything tooling already enforces** (formatting, lint) and spend its attention on judgment calls.

## Adversarial framing
Assume there *are* problems and go find them. "I found zero issues" almost always means you weren't looking hard enough — look harder before concluding clean.

## Severity tiers → action
- **Critical** — correctness/security/data-loss. Block. Fix before anything else.
- **Important** — real problems that should be fixed before proceeding.
- **Minor** — note them; don't gate on them.

## Receiving the findings (when feedback comes to you)
- Evaluate each point **technically**. Don't perform agreement ("Great catch!") — just assess and act.
- If a finding is wrong, push back with reasoning rather than complying blindly.
- If asked to "implement this properly/fully," grep for actual usage first — don't build flexibility nobody needs (`forge:principles` #2).

## Exit
Fix Critical/Important, then `forge:verify` with evidence, then `forge:ship`.
