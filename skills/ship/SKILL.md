---
name: ship
description: Finish a completed piece of work and integrate it cleanly — verify, then decide how to merge, PR, or set it aside. Use when implementation is done and tests pass, and you need to land the work and clean up.
---

```
███████╗██╗  ██╗██╗██████╗
██╔════╝██║  ██║██║██╔══██╗
███████╗███████║██║██████╔╝
╚════██║██╔══██║██║██╔═══╝
███████║██║  ██║██║██║
╚══════╝╚═╝  ╚═╝╚═╝╚═╝
```

# Ship and clean up

The end of a task is where state gets messy — half-merged branches, orphaned worktrees, premature pushes. This closes work out cleanly.

## 1. Verify first, always
Do not start shipping until `forge:verify` is green **with this-turn evidence**. Re-run the verify command(s) **now** and read the exit code / summary line in this same turn — "it passed earlier" is not evidence. If you can't show the output from this turn, stop and go verify. If anything is red or unverified, you're not finishing; you're still working.

## 2. Detect the environment
Establish where you are before acting: Are you in a git worktree or the main checkout? On a feature branch, main, or detached HEAD? Is the tree clean? This determines which options are even valid.

## 3. Present fixed options (let the user choose)
1. **Merge** into the main/integration branch
2. **Open a PR** (target the base it was branched from — if cut from a non-default branch, don't accidentally target `main` and create a fat diff)
3. **Keep the branch** as-is for later
4. **Discard** the work (require the user to type "discard" to confirm — it's destructive)

(On detached HEAD, drop option 1.) Don't assume — integration choices are the user's.

## 4. Provenance-aware cleanup
- Only remove worktrees/branches **you created** in this work. Never touch harness-owned or pre-existing ones.
- Before removing a worktree, confirm its tree is **clean** (`git status` inside it shows nothing to commit) — removing a dirty worktree loses work and is forbidden. After deleting a worktree directory, run `git worktree prune`.
- Order matters: **merge → remove the worktree (from outside it, never from within) → delete the branch.** Doing it out of order strands state.

## 5. Commit & push hygiene
- Write a clear commit message that matches **this repo's existing convention**: run `git log --oneline -20`; if most subjects follow Conventional Commits (`type(scope): subject`), use that form, otherwise mirror the dominant style — and state which you detected before committing. Do **not** add AI/Claude co-author attribution or "generated with" trailers unless the user explicitly asks — match the user's own commit style.
- **Never `push` or force-push without an explicit request.** Landing locally and pushing are separate decisions; the second is the user's to make.
- If on the default branch and about to commit substantial work, branch first.

## Exit
Work landed (or deliberately parked) with a clean tree and no orphaned state.
