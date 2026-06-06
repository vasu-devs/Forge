---
name: plan
description: Break an approved spec or design into a precise, executable implementation plan. Use after the what/why and the shape are agreed, and before writing implementation code for any multi-step task.
---

```
██████╗ ██╗      █████╗ ███╗   ██╗
██╔══██╗██║     ██╔══██╗████╗  ██║
██████╔╝██║     ███████║██╔██╗ ██║
██╔═══╝ ██║     ██╔══██║██║╚██╗██║
██║     ███████╗██║  ██║██║ ╚████║
╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝
```

# Plan in vertical, executable slices

A plan good enough that a context-free executor with questionable taste could follow it without guessing. Vague plans get vague work.

## Slices are vertical tracer bullets

Each task cuts end-to-end through **whatever layers the artifact actually has** and leaves the program **working**. For a web feature that may be schema → API → logic → UI → tests; for a CLI it's flag → handler → output; for a library it's public function → behavior → test. The rule is end-to-end-to-an-observable-result — *not* a fixed layer list. Never slice horizontally (all of one layer, then all of the next) — horizontal slices can't be verified until the end and hide integration problems until they're expensive.

Among valid first slices, pick the one that **retires the most risk** — the integration most likely to be wrong (the unproven third-party call, the gnarly migration), not merely the easiest. De-risk first; polish later.

## Each task is bite-sized and test-shaped

Size each task to **one RED→GREEN→commit cycle** — the minimum change that makes exactly one new test pass. If a task needs two assertions about two different behaviors, split it. (The loop itself lives in `forge:tdd` — don't restate it; plan just chooses the slices.)

Write each task so a context-free executor can run it. Give every task these fields:
- **id** (T1, T2…) + a one-line **intent**
- **target** — the file(s) and the function/signature it adds or changes
- **test** — the assertion that should fail first, then pass (the success criterion — a concrete check, never "make it work")
- **blocked-by** — real task IDs, or "none"

(This is `forge:principles` #4 made concrete.)

## No placeholders

The executor may read tasks out of order and has no context beyond the plan. Therefore:
- No "TBD", no "add appropriate error handling", no "handle edge cases."
- No "similar to Task 3" — restate the actual intent/code, because Task 3 may not have been read.
- If a value, path, or signature matters, write it down.

## Order and parallelism

- Order by dependency. Reference blockers by real task IDs ("blocked by T2"), added only once T2 exists.
- Mark which tasks are independent and safe to parallelize — hand those to `forge:orchestrate` to run concurrently with fresh agents.
- Keep the plan in a file, not just the conversation — it's a durable artifact that survives compaction.

## Exit
Execute with `forge:tdd` (one slice at a time), request `forge:review` after meaningful chunks, and `forge:verify` before claiming done.
