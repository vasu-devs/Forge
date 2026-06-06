---
name: tdd
description: Implement features and fix bugs test-first with a strict red-green-refactor loop. Use whenever you are about to write implementation code or fix a bug — before the production code exists.
---

```
████████╗██████╗ ██████╗
╚══██╔══╝██╔══██╗██╔══██╗
   ██║   ██║  ██║██║  ██║
   ██║   ██║  ██║██║  ██║
   ██║   ██████╔╝██████╔╝
   ╚═╝   ╚═════╝ ╚═════╝
```

# Test-Driven Development

The discipline that makes every other quality claim trustworthy. Skipping it feels faster and is the most expensive habit in software.

## The Iron Law
**No production code without a failing test first.**

If *you* wrote production code this session before its test and it isn't committed yet: **delete it.** Not comment it out, not keep it as "reference," not glance at it while writing the test — delete it, then re-derive it test-first.

This applies to **your own uncommitted work**, never the repo's existing code. To put *pre-existing, untested* code under test, do **not** delete it — first write a **characterization test** that pins its current observable behavior (even behavior you suspect is wrong), get it green, and only then change it.

Why this is non-negotiable: tests written *after* code ask "what does this code do?" and tend to enshrine whatever you happened to write, bugs included. Tests written *first* ask "what *should* this do?" — the only question that catches the gap.

**For a bug, the law is identical:** the first RED is a test that *reproduces the bug* and fails for the bug's reason; GREEN is the fix. No fix before that test exists (use `forge:debug` to find the cause if it isn't obvious).

## Watch it fail
After writing the test, **run it and watch it fail** before implementing. If you didn't see RED, you don't know the test actually exercises the behavior — a test that passes against no implementation is testing nothing. Confirm it fails **on the assertion you intended**, with the expected-vs-actual you predicted — not on an import error, typo, or fixture/collection error. A test that fails for the wrong reason hasn't been watched fail.

## One slice at a time (no horizontal batching)
One failing test → the minimum implementation to make it pass → repeat. Do **not** write all the tests and then all the code. Bulk-writing tests verifies *imagined* behavior and tends to test the *shape* of the code rather than what it does. Tracer bullets, not layers.

## Refactor only on green
Never refactor while a test is RED — you won't know whether the refactor or the unfinished feature broke it. Get to GREEN, then improve with the safety net in place. During a refactor you may **not** change a test assertion or add new behavior; the tests stay green and unchanged. If a test has to change, you're not refactoring — go back to RED.

## Test behavior, not internals
Assert observable, external behavior. Renaming a private function, splitting a class, or reorganizing internals should **not** break a test. If it does, that test was coupled to structure and was wrong.

**Mock only at trust boundaries** — network, clock, filesystem, external services. Asserting that a mock *was called N times* is testing internals (forbidden) unless that call **is** the observable behavior. Prefer real collaborators over mocks for in-process code.

## Forbidden rationalizations (and the honest rebuttal)
| You'll think… | The truth |
|---|---|
| "This is too simple to test." | Simple code breaks too, and the test is then trivial to write. Write it. |
| "I'll add tests after." | Tests-after enshrine bugs (see Iron Law). After rarely comes. |
| "I already manually verified it." | Manual checks don't run in CI and don't catch regressions tomorrow. |
| "It's the spirit that matters, not the ritual." | The ritual *is* the spirit. The order (fail → pass) is what creates the guarantee. |

## Exit
After a coherent chunk: `forge:review` (quality), then `forge:verify` (proof) before any "done." For bugs, start from `forge:debug` to get a reproducing test first.
