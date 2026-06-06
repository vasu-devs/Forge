---
name: plan
description: Break an approved spec or design into a precise, executable implementation plan. Use after the what/why and the shape are agreed, and before writing implementation code for any multi-step task.
---

# Plan in vertical, executable slices

A plan good enough that a context-free executor with questionable taste could follow it without guessing. Vague plans get vague work.

## Slices are vertical tracer bullets

Each task cuts through **all** layers end-to-end (schema → API → logic → UI → tests) and leaves the program **working**. Never slice horizontally (all schema, then all API, then all UI) — horizontal slices can't be verified until the end and hide integration problems until it's expensive.

A good first slice is the thinnest thing that produces a real, observable end-to-end result.

## Each task is bite-sized and test-shaped

Size each task to one 2-5 minute action, in this rhythm:
1. Write a failing test for this slice → 2. Run it, watch it fail (RED) → 3. Implement the minimum to pass → 4. Run it (GREEN) → 5. Commit.

State the verifiable success criterion for each task — a test or concrete check, not "make it work." (This is `shunya:principles` #4, made concrete.)

## No placeholders

The executor may read tasks out of order and has no context beyond the plan. Therefore:
- No "TBD", no "add appropriate error handling", no "handle edge cases."
- No "similar to Task 3" — restate the actual intent/code, because Task 3 may not have been read.
- If a value, path, or signature matters, write it down.

## Order and parallelism

- Order by dependency. Reference blockers by real task IDs ("blocked by T2"), added only once T2 exists.
- Mark which tasks are independent and safe to parallelize — hand those to `shunya:orchestrate` to run concurrently with fresh agents.
- Keep the plan in a file, not just the conversation — it's a durable artifact that survives compaction.

## Exit
Execute with `shunya:tdd` (one slice at a time), request `shunya:review` after meaningful chunks, and `shunya:verify` before claiming done.
