# Contributing to shunya

Thanks for your interest! shunya is a **curated synthesis**, not a kitchen sink — so the bar for
anything new is *"is this the single best version of this idea, and does it earn its place?"*
Sharper mechanisms, bug fixes, cross-platform fixes, and well-scoped new lifecycle skills are all welcome.

**Please open an issue to discuss before a large PR** (especially a new skill), so we can agree on scope.

## Project layout

See the [README — How it works under the hood](./README.md#how-it-works-under-the-hood) for the file tree.
In short: `skills/<name>/SKILL.md` are the skills; `hooks/hooks.json` + `scripts/*.js` are the
learning layer; `.claude-plugin/` holds the manifests.

## Writing or editing a skill

shunya skills follow Anthropic's skill-authoring guidance:

- **The description is the trigger.** Write it as *what it does* + *when to use it* — not a summary of
  the workflow. If the description summarizes the steps, the model follows the description and skips the body.
- **Explain the *why*.** Prefer reasoning over walls of all-caps `MUST`/`NEVER`; a capable model
  generalizes from rationale.
- **Prefer mechanically-checkable rules** over vague advice (e.g. "≤1 eyebrow per 3 sections", not "use eyebrows sparingly").
- **Keep it focused.** One skill, one job. Cross-reference sibling skills rather than duplicating them.
- Keep `SKILL.md` reasonably short; push long reference material into separate files if needed.

## Working on the scripts (the learning layer)

The Node scripts are **zero-dependency** and must stay that way (`node --check` is the only build step).
Hard rules, because these run as hooks on every turn:

- **Never throw out of a hook path; always `exit 0`.** A learning bug must never break the user's tool flow.
- **Cross-platform.** Windows (Git Bash/MSYS) + macOS + Linux. Directory keys go through
  `lib.js` `projId()`/`normDir()` so msys (`/c/Users/...`) and native (`C:\Users\...`) paths reconcile —
  use those helpers, don't hand-roll path keys.
- **Recursion-safe.** Anything that spawns `claude -p` must set `SHUNYA_DISTILLER=1`; the `Stop` hook
  no-ops when it sees that. Do **not** use `--bare` for the distill call (it strips auth).

### Testing scripts without spending tokens or polluting data
- Syntax: `for f in scripts/*.js; do node --check "$f"; done`
- Throttle logic: run `stop-autolearn.js` with `SHUNYA_DISTILL_DRYRUN=1` (prints instead of spawning).
- The distiller's gate/write logic: run `distill.js` with `SHUNYA_DISTILL_MOCK=<file>` (a canned
  `{"result":"{...}"}`) — no model call, no spend.
- Isolation: set `SHUNYA_DATA_DIR=<temp dir>` so a real run never touches your live `~/.claude/shunya-data`.

## Commits & PRs

- Clear, focused commits. **Do not add AI/Claude co-author trailers or "Generated with" lines.**
- Line endings are normalized to LF via `.gitattributes` — don't fight it.
- If a change is inspired by another project's technique, credit it in [CREDITS.md](./CREDITS.md).
- Run the script checks above before opening a PR; describe what you changed and why.

## Be decent
Be kind and constructive in issues and reviews. Assume good faith.
