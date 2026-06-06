---
name: orchestrate
description: Run multiple independent pieces of work in parallel with fresh subagents, then integrate the results. Use when you have 2+ tasks with no shared state or sequential dependency, when executing an implementation plan whose slices are independent, or when one large task decomposes into chunks that can progress at the same time.
---

```
 ██████╗ ██████╗  ██████╗██╗  ██╗███████╗███████╗████████╗██████╗  █████╗ ████████╗███████╗
██╔═══██╗██╔══██╗██╔════╝██║  ██║██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔══██╗╚══██╔══╝██╔════╝
██║   ██║██████╔╝██║     ███████║█████╗  ███████╗   ██║   ██████╔╝███████║   ██║   █████╗
██║   ██║██╔══██╗██║     ██╔══██║██╔══╝  ╚════██║   ██║   ██╔══██╗██╔══██║   ██║   ██╔══╝
╚██████╔╝██║  ██║╚██████╗██║  ██║███████╗███████║   ██║   ██║  ██║██║  ██║   ██║   ███████╗
 ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
```

# Orchestrate parallel work

Fan-out is leverage — but only when the pieces are genuinely independent. Misapplied, it produces merge chaos and duplicated effort. This skill decides *when* to parallelize and *how* to keep it clean.

## The discriminating rule (when to dispatch)
Dispatch parallel agents **only when the tasks are truly independent** — solving one would not solve or change another. Litmus test: "if I fix A, might that also fix or alter B?" If yes, they share a root cause or state — **investigate them together first** (`forge:debug`), don't parallelize. Parallelism is for orthogonal problems, not for hoping volume hides a shared cause.

## Crafted context, never session history
Each agent gets a **purpose-built prompt**: the specific task plus exactly the context it needs — not your conversation history. Shape and constrain it ("find the real root cause; do not just bump the timeout"). A vague hand-off produces vague work; the prompt is the product.

Require a **structured return** from each agent so synthesis is mechanical: `{ files changed, tests added, verification command + its result, open questions }`. Dispatch via the Task tool, one agent per worktree.

## Isolation when agents write
- **Read-only fan-out** (exploration, review, analysis): no isolation needed.
- **Agents that mutate files concurrently:** give each its **own git worktree** (native worktree tooling) so they can't clobber each other. Since the tasks are independent there's no dependency order — **merge sequentially and re-run the tests after each merge** to catch textual or semantic conflicts even between logically independent changes.

## Per-task review (author-bias elimination)
After each agent finishes, a **fresh reviewer that did not do the work** checks it — spec-compliance first, then code quality (`forge:review`). A self-review shares the blind spots that produced the bug.

## Execution discipline
- **Continuous execution:** don't stop to ask "should I keep going?" between independent tasks — run them through. Stop only on a real blocker, and then ask rather than guess.
- **Model-tier by a decidable rule:** if the task fits in one sentence and names the exact files → fast/cheap tier; if it needs a design decision, touches an interface, or its file set is unknown → capable tier. When unsure, capable.
- **Cap concurrency** at ~3-4 in-flight writers (context and cost blow up past that); queue the rest.
- **Isolate failures:** if one agent fails verification, quarantine its worktree and integrate the passing ones — don't block the whole batch on one bad result.

## Synthesis
Collect all results, **dedupe and merge**, resolve any conflicts explicitly, and present one unified outcome — don't just concatenate agent reports.

## When NOT to orchestrate
Sequential dependencies, shared mutable state, or a single coherent change. Those are `forge:plan` + `forge:tdd` territory — forcing them parallel just creates rework.

## Exit
Review each result (`forge:review`), then `forge:verify` the integrated whole before `forge:ship`.
