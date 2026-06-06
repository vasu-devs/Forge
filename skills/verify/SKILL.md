---
name: verify
description: Prove that work is actually complete, fixed, or passing before saying so. Use right before claiming success, marking a task done, committing, or opening a PR — any moment you're about to assert that something works.
---

```
██╗   ██╗███████╗██████╗ ██╗███████╗██╗   ██╗
██║   ██║██╔════╝██╔══██╗██║██╔════╝╚██╗ ██╔╝
██║   ██║█████╗  ██████╔╝██║█████╗   ╚████╔╝
╚██╗ ██╔╝██╔══╝  ██╔══██╗██║██╔══╝    ╚██╔╝
 ╚████╔╝ ███████╗██║  ██║██║██║        ██║
  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚═╝╚═╝        ╚═╝
```

# Verify before you claim

A success claim without evidence is a false report, not efficiency. This skill is the gate between "I think it works" and "it works."

## The gate
Before any completion claim, you must have **run a check and read its output in this same response.** No fresh evidence → no claim. Downgrade "it works" to "it should work — verifying now," then go get the evidence.

## Claim → required proof
| Claim | What counts as proof (nothing less) |
|---|---|
| "Tests pass" | The runner's output, this turn — exit 0 **and** a non-zero test count with no unexpected skips (a run that collected 0 tests is a failure, not a pass) |
| "The build works" | The build command's output, exit 0 |
| "The bug is fixed" | The reproducing test, now green |
| "Typecheck/lint clean" | The tool's output, not your reading of the code |
| "The subagent completed X" | The git diff / files on disk — not the agent's success message |
| "The feature works" | The feature exercised (test, curl, or a rendered view) producing the expected result |
| "The migration / destructive op is safe" | It ran on a copy or dry-run and row counts + spot-checks match — not that the script *reads* correctly |

For UI specifically: **render the real view and actually look at it** — capture a screenshot with a headless browser, then *read the image back in* (and/or assert on the DOM / computed styles / a visual-diff baseline). Producing a screenshot you never inspect is the same blind-ship failure this rule exists to stop. Don't infer from CSS.

## Goal-driven verification
The success criteria should already exist from `forge:plan` / `forge:principles` #4 — each task had a `verify:` check. Run those checks. If criteria were never defined, define them now and then verify against them.

## Anti-evasion
Rephrasing doesn't exempt the rule. "Should be working," "looks correct," "I've implemented it" are all the same unverified claim wearing different words. Either you have this-turn evidence or you don't.

## Deterministic vs not
This skill is for **deterministic** work — run it once, read the output. But if a supposedly-deterministic check has *ever* flaked (timing, ordering, shared state), it isn't deterministic — re-run it N times or fix the flake before trusting green. For genuinely **non-deterministic** behavior (LLM features, agents, prompts), a single green run is luck — use `forge:eval` (pass@k / pass^k) instead of a one-shot check.

## If you can't verify
Say so plainly: name what you couldn't check and why, and present the work as unverified. An honest "I couldn't run the e2e suite — here's what I did confirm" is worth more than a confident false "done."

## Exit
Green with evidence → `forge:ship`.
