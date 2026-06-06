---
name: verify
description: Prove that work is actually complete, fixed, or passing before saying so. Use right before claiming success, marking a task done, committing, or opening a PR — any moment you're about to assert that something works.
---

# Verify before you claim

A success claim without evidence is a false report, not efficiency. This skill is the gate between "I think it works" and "it works."

## The gate
Before any completion claim, you must have **run a check and read its output in this same response.** No fresh evidence → no claim. Downgrade "it works" to "it should work — verifying now," then go get the evidence.

## Claim → required proof
| Claim | What counts as proof (nothing less) |
|---|---|
| "Tests pass" | The test runner's actual output, this turn |
| "The build works" | The build command's output, exit 0 |
| "The bug is fixed" | The reproducing test, now green |
| "Typecheck/lint clean" | The tool's output, not your reading of the code |
| "The subagent completed X" | The git diff / files on disk — not the agent's success message |
| "The feature works" | The feature exercised (test, curl, or a rendered view) producing the expected result |

For UI specifically: **render the real view and look at it** (a screenshot / headless browser), don't infer from CSS — shipping visuals blind is how regressions hit production.

## Goal-driven verification
The success criteria should already exist from `shunya:plan` / `shunya:principles` #4 — each task had a `verify:` check. Run those checks. If criteria were never defined, define them now and then verify against them.

## Anti-evasion
Rephrasing doesn't exempt the rule. "Should be working," "looks correct," "I've implemented it" are all the same unverified claim wearing different words. Either you have this-turn evidence or you don't.

## Deterministic vs not
This skill is for **deterministic** work — run it once, read the output. For **non-deterministic** behavior (LLM features, agents, prompts), a single green run can be luck — use `shunya:eval` (pass@k / pass^k) instead of a one-shot check.

## If you can't verify
Say so plainly: name what you couldn't check and why, and present the work as unverified. An honest "I couldn't run the e2e suite — here's what I did confirm" is worth more than a confident false "done."

## Exit
Green with evidence → `shunya:ship`.
