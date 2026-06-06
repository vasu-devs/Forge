---
name: orchestrate
description: Run multiple independent pieces of work in parallel with fresh subagents, then integrate the results. Use when you have 2+ tasks with no shared state or sequential dependency, when executing an implementation plan whose slices are independent, or when one large task decomposes into chunks that can progress at the same time.
---

# Orchestrate parallel work

Fan-out is leverage — but only when the pieces are genuinely independent. Misapplied, it produces merge chaos and duplicated effort. This skill decides *when* to parallelize and *how* to keep it clean.

## The discriminating rule (when to dispatch)
Dispatch parallel agents **only when the tasks are truly independent** — solving one would not solve or change another. Litmus test: "if I fix A, might that also fix or alter B?" If yes, they share a root cause or state — **investigate them together first** (`shunya:debug`), don't parallelize. Parallelism is for orthogonal problems, not for hoping volume hides a shared cause.

## Crafted context, never session history
Each agent gets a **purpose-built prompt**: the specific task plus exactly the context it needs — not your conversation history. Shape and constrain it ("find the real root cause; do not just bump the timeout"). A vague hand-off produces vague work; the prompt is the product.

## Isolation when agents write
- **Read-only fan-out** (exploration, review, analysis): no isolation needed.
- **Agents that mutate files concurrently:** give each its **own git worktree** (see `shunya:ship` / native worktree tooling) so they can't clobber each other. Merge afterward in dependency order.

## Per-task review (author-bias elimination)
After each agent finishes, a **fresh reviewer that did not do the work** checks it — spec-compliance first, then code quality (`shunya:review`). A self-review shares the blind spots that produced the bug.

## Execution discipline
- **Continuous execution:** don't stop to ask "should I keep going?" between independent tasks — run them through. Stop only on a real blocker, and then ask rather than guess.
- **Model-tier by task:** a cheap/fast model for mechanical 1-2 file changes; a capable model for design, ambiguity, and review.

## Synthesis
Collect all results, **dedupe and merge**, resolve any conflicts explicitly, and present one unified outcome — don't just concatenate agent reports.

## When NOT to orchestrate
Sequential dependencies, shared mutable state, or a single coherent change. Those are `shunya:plan` + `shunya:tdd` territory — forcing them parallel just creates rework.

## Exit
Review each result (`shunya:review`), then `shunya:verify` the integrated whole before `shunya:ship`.
