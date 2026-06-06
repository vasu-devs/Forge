---
name: debug
description: Find the root cause of a bug, test failure, or performance regression before proposing any fix. Use the moment something is broken, throwing, failing, flaky, or slower than expected — and resist the urge to patch first.
---

```
██████╗ ███████╗██████╗ ██╗   ██╗ ██████╗
██╔══██╗██╔════╝██╔══██╗██║   ██║██╔════╝
██║  ██║█████╗  ██████╔╝██║   ██║██║  ███╗
██║  ██║██╔══╝  ██╔══██╗██║   ██║██║   ██║
██████╔╝███████╗██████╔╝╚██████╔╝╚██████╔╝
╚═════╝ ╚══════╝╚═════╝  ╚═════╝  ╚═════╝
```

# Debug to root cause

## The Iron Law
**No fix without a root-cause investigation first.** A patch applied to a symptom you don't understand usually moves the bug rather than removing it.

## The feedback loop IS the skill
Everything else is mechanical. Your first job is a **fast, deterministic pass/fail signal** for the bug. Build the best one you can afford, preferring higher rungs:
1. A failing automated test that reproduces it (best — becomes your regression test)
2. A one-shot command: `curl`, a CLI invocation, a script with a snapshot diff
3. A tiny harness that exercises the path
4. Manual reproduction with logged output (last resort)

A 2-second deterministic loop is a debugging superpower; invest in it before theorizing. If you can't reproduce it, that's the bug to solve first.

## Hypotheses: plural and falsifiable
Don't anchor on the first idea. Write **3-5 ranked hypotheses**, each with a *prediction* you can test ("if it's a caching issue, then clearing the cache fixes it; if it's a race, then adding a delay changes the outcome"). Instrument to *discriminate* between them, not just to confirm a favorite.

Tag every diagnostic probe you add with a marker like `[DEBUG-a4f2]` so cleanup at the end is a single grep — never leave instrumentation behind.

## The 3-fixes rule
If you've tried **3 fixes and the problem keeps reappearing somewhere new, STOP.** Do not attempt fix #4. Cascading symptom-fixes mean your mental model of the architecture is wrong — go back to Phase 1 and question the *structure*, not the hypothesis. (Your human's tells — "stop guessing", "ultrathink this", "why does this keep happening" — are the same signal: restart at root cause.)

## Close the loop
Once you've found and fixed the root cause, the reproducing test becomes a **permanent regression test** (hand to `forge:tdd` if it isn't already a test). Remove all `[DEBUG-]` probes. Then `forge:verify` with the now-green test as evidence.
