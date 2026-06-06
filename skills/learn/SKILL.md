---
name: learn
description: Distill durable "instincts" (trigger → action patterns) from this session into project-scoped memory that auto-loads at the start of future sessions in this repo. Use when the user asks you to learn or remember a workflow pattern, after solving something non-obvious worth not re-deriving, at the end of a productive session, or when invoked directly.
---

# Learn instincts from this session

shunya's continuous-learning layer. It captures the *non-obvious* patterns of working in **this specific project** so future sessions start already knowing them — instead of re-discovering the same conventions, build quirks, and gotchas every time.

How the layer fits together (it runs **automatically** — you rarely need to invoke this by hand):
- A **PostToolUse hook** silently logs every Edit/Write/Bash action to a project-scoped observations log (deterministic — survives compaction).
- A **Stop hook** (`stop-autolearn.js`) fires when each turn ends and, once enough new work has accumulated (batched — every `SHUNYA_LEARN_EVERY` actions, default 8), spawns a **detached background distiller** (`distill.js`) that asks a small model (Haiku) to extract lessons. It never blocks you; the env-guard `SHUNYA_DISTILLER=1` prevents recursion.
- The distiller applies a **strict quality gate** (confidence floor, length/platitude filters, anonymization lint for global lessons, per-run caps) so only sharp, non-bogus knowledge is kept.
- A **SessionStart hook** auto-injects the highest-confidence **global lessons** (everywhere) + **this project's instincts** into future sessions (capped; nothing injected where there's nothing learned).

**This skill (`shunya:learn`) is the manual/deliberate path** — use it to capture a specific lesson on demand, force a distillation now, or curate (prune/refine) what's been learned. The automatic loop handles the steady-state.

All data lives under `~/.claude/shunya-data/`; nothing is written into the repo.

## Two tiers — choose the right one for each lesson
- **Project instinct** (`instincts/<projId>.jsonl`) — specific to THIS repo: its conventions, build quirks, domain rules, file-specific gotchas. Loads only in this project.
- **Global lesson** (`global-lessons.jsonl`, also rendered to `~/.claude/shunya-data/LESSONS.md`) — an **anonymized, transferable** behavioral correction that should make you better in *every* project. Loads into every session everywhere.

**Anonymization is mandatory for global lessons.** A global lesson must contain **no** project, company, repo, file, path, framework-version, or domain-specific identifier. Phrase it as a general rule. Litmus test: *"Would this lesson help on a completely different codebase?"* If yes → global. If it only makes sense with this project's specifics → project instinct. When in doubt, write it as a project instinct (cheap) rather than polluting the global layer.

Global lessons are best for **mistakes and their corrections**: a wrong assumption you made, a verification step you skipped, a process that went sideways — distilled into "when X → do Y instead" so you never repeat it.

## Procedure

Run the CLI with the project's working directory as cwd (use `$HOME`, which the shell expands):

**1. Gather evidence.**
```
node "$HOME/.claude/skills/shunya/scripts/shunya-store.js" observations 60
```
Read that log, then review the conversation for signals worth keeping:
- corrections the user made to your approach
- non-obvious decisions and *why* they went that way
- repeated commands/sequences (build, test, run, deploy)
- gotchas, footguns, and this repo's specific conventions

**2. Distill ATOMIC instincts.** Each is `{ trigger, action, confidence, evidence }`:
- **Good:** specific, reusable, project-true, not already obvious. e.g. `trigger: "running tests in this repo", action: "use 'pnpm vitest run <path>' — the bare 'test' script watches and hangs", confidence: 0.85`.
- **Bad:** vague ("write clean code"), generic model-knowledge, or one-off trivia. Don't record those.
- Keep them few and sharp. A handful of high-signal instincts beats fifty platitudes.

**3. Set confidence honestly:**
- `0.8–0.9` — user stated it explicitly, or you saw it hold 3+ times
- `0.5–0.7` — observed clearly once
- `0.3–0.4` — tentative hypothesis

**4. Show the candidates to the user.** List the instincts you intend to save. Unless they already said "just do it," get a quick confirm — they may correct or drop some.

**5. Write them:**
```
node "$HOME/.claude/skills/shunya/scripts/shunya-store.js" add '{"trigger":"...","action":"...","confidence":0.8,"evidence":"..."}'
```
(Accepts a single JSON object or a JSON array. Re-adding refines confidence — the highest wins, dupes collapse.)

For an **anonymized global lesson** (transferable, no project specifics), use `add-global` instead — it also re-renders `~/.claude/shunya-data/LESSONS.md`:
```
node "$HOME/.claude/skills/shunya/scripts/shunya-store.js" add-global '{"trigger":"<general situation>","action":"<corrected behavior>","confidence":0.8,"evidence":"<why, no project names>"}'
```

**6. Confirm and tidy:**
```
node "$HOME/.claude/skills/shunya/scripts/shunya-store.js" list          # this project's instincts
node "$HOME/.claude/skills/shunya/scripts/shunya-store.js" list-global   # global lessons (+ path to LESSONS.md)
node "$HOME/.claude/skills/shunya/scripts/shunya-store.js" clear-observations
```

## Rules of the road
- Instincts are **priors, not laws.** An explicit user instruction always overrides a learned instinct.
- They're **project-scoped** — React patterns stay in the React project. They auto-load next session via the SessionStart hook (restart Claude Code for newly-written instincts to take effect).
- **Prune** stale ones: `shunya-store.js remove "<substring>"`. Curate ruthlessly; bloat here costs context on every session start.

## Tunables (env vars — set under `"env"` in `~/.claude/settings.json`)
**Injection (recall):**
- `SHUNYA_INSTINCT_MAX` / `SHUNYA_INSTINCT_MIN_CONF` — cap & confidence floor for **project instincts** (defaults `12` / `0`).
- `SHUNYA_GLOBAL_MAX` / `SHUNYA_GLOBAL_MIN_CONF` — cap & confidence floor for **global lessons** (defaults `15` / `0`).

**Auto-learn (the automatic distiller):**
- `SHUNYA_AUTOLEARN` — set to `off` to disable automatic learning entirely (default `on`).
- `SHUNYA_LEARN_EVERY` — distill after this many new logged actions (default `8`). Lower = more continuous + more cost; higher = leaner.
- `SHUNYA_LEARN_MIN_CONF` — the distiller's quality floor; lessons below this are dropped (default `0.6`).
- `SHUNYA_LEARN_MODEL` — model id for distillation (default Haiku).
- `SHUNYA_DATA_DIR` — relocate the data dir (default `~/.claude/shunya-data`).

Global lessons load into every session, so keep them few and high-signal — raise `SHUNYA_GLOBAL_MIN_CONF` to `0.7+` once the list grows. The distiller never blocks you and silently no-ops on any error.
