# forge 🔨

**A curated, state-of-the-art software-development-lifecycle skill set for Claude Code — with a memory layer that learns as you work.**

forge is one cohesive plugin instead of a dozen overlapping ones. It distills the best, most
distinctive *techniques* from across the Claude Code skills ecosystem (see [CREDITS.md](./CREDITS.md))
into a single lifecycle — and adds a continuous-learning layer so your agent stops repeating the same
mistakes, in this project and across all of them.

> ⚠️ forge ships **hooks** that write a local log and run **background model calls on your own
> Claude subscription**. This is fully disclosed below under [What the hooks actually do](#-what-the-hooks-actually-do).
> Read that section before installing, and know you can disable it with one env var.

---

## The lifecycle skills (14)

Each skill is a synthesis — the best mechanism for that phase, distilled and made cohesive.

| Skill | Phase | What it enforces |
|---|---|---|
| `forge:principles` | doctrine | think before coding · simplicity first · surgical changes · goal-driven · evidence over assertion (each with a falsifiable test) |
| `forge:understand` | orient | map unfamiliar code before touching it; iterative retrieval; uses a code-graph MCP if present |
| `forge:brainstorm` | spec | one-question grilling → an approved written spec; hard gate before any code |
| `forge:architect` | design | search-first (adopt/extend/compose/build) · design-it-twice · deletion & two-adapter tests |
| `forge:plan` | breakdown | vertical tracer-bullet slices · no placeholders |
| `forge:tdd` | implement | red-green-refactor; delete code written before its test; watch it fail; no horizontal slicing |
| `forge:debug` | fix | the feedback loop *is* the skill; falsifiable hypotheses; 3 fixes → question the architecture |
| `forge:review` | quality | two parallel axes (Spec / Standards) by a fresh reviewer (author-bias elimination) |
| `forge:verify` | proof | claim → required-proof; evidence in-hand before any "done" |
| `forge:ship` | land | verify-first; provenance-aware cleanup; never push without asking |
| `forge:orchestrate` | parallelize | dispatch independent work to fresh agents; the independence rule |
| `forge:eval` | measure | eval-driven dev for non-deterministic/LLM work (pass@k vs pass^k) |
| `forge:design-ui` | frontend | anti-slop UI: dials + mechanically-checkable bans + render-and-look |
| `forge:learn` | memory | distill durable lessons (manual + automatic) |

---

## The learning layer

forge has three always-on parts (all backed by local files under `~/.claude/forge-data/`):

1. **Capture** — a `PostToolUse` hook logs your edits/commands to a project-scoped observations log.
2. **Learn** — a `Stop` hook, throttled (batched), spawns a **detached background** distiller that asks a
   small model to extract lessons, then runs a **strict quality gate** (confidence floor, length &
   platitude filters, anonymization lint, per-run caps) so only sharp, non-bogus knowledge survives.
3. **Recall** — a `SessionStart` hook injects the highest-confidence lessons back into every session.

Lessons live in **two tiers**:

- **Project instincts** — specific to one repo (its conventions, build quirks, gotchas). Load only there.
- **Global lessons** — *anonymized*, transferable behavioral lessons (best for mistakes → corrections).
  Load into **every** project, and are rendered to a human-readable `~/.claude/forge-data/LESSONS.md`.

You can also run `forge:learn` manually to capture or curate on demand.

---

## Install

### Recommended: skills-directory plugin
Clone directly into your Claude Code skills directory so it loads as a namespaced plugin:

```bash
git clone https://github.com/vasu-devs/Forge ~/.claude/skills/forge
```
Then restart Claude Code (or run `/reload-plugins`). Skills appear as `forge:tdd`, `forge:debug`, etc.

> The manual `forge:learn` CLI assumes this install path. The automatic learning (hooks) works
> regardless of install method, since hooks resolve their own location via `${CLAUDE_PLUGIN_ROOT}`.

### Alternative: marketplace
```
/plugin marketplace add vasu-devs/Forge
/plugin install forge@forge
```

### Requirements
- Claude Code v2.1+ (plugin hooks auto-load) and Node.js on PATH (the hook scripts are Node, zero-dependency).

---

## ⚠️ What the hooks actually do

Transparency, because always-on hooks deserve it. When forge is installed and enabled:

- **`PostToolUse`** writes one line per `Edit`/`Write`/`Bash` to `~/.claude/forge-data/observations/<project>.jsonl`.
  Bash commands are logged (truncated). **This stays on your machine** and is never transmitted by forge.
- **`Stop`** may spawn a background `claude -p` (headless) call **on your Claude subscription** to distill
  lessons. It is batched (default: after ~12 logged actions) and runs detached so it never blocks you.
- **`SessionStart`** reads local lesson files and injects a small text block into the session context.

Nothing leaves your machine except the background `claude -p` calls you'd already be authorized to make.
No telemetry, no network calls beyond Claude itself.

**Turn it all off** with one setting (`~/.claude/settings.json`):
```json
{ "env": { "FORGE_AUTOLEARN": "off" } }
```
That stops the background learning entirely; the lifecycle skills still work.

---

## Configuration (env vars, set under `"env"` in `~/.claude/settings.json`)

| Var | Default | Effect |
|---|---|---|
| `FORGE_AUTOLEARN` | `on` | `off` disables the background distiller entirely |
| `FORGE_LEARN_EVERY` | `8` | distill after this many new logged actions (higher = leaner) |
| `FORGE_LEARN_MODEL` | Haiku | model id for distillation (e.g. `claude-sonnet-4-6` for sharper judgment) |
| `FORGE_LEARN_MIN_CONF` | `0.6` | quality floor; weaker lessons are dropped |
| `FORGE_INSTINCT_MAX` / `FORGE_INSTINCT_MIN_CONF` | `12` / `0` | cap & floor for injected project instincts |
| `FORGE_GLOBAL_MAX` / `FORGE_GLOBAL_MIN_CONF` | `15` / `0` | cap & floor for injected global lessons |
| `FORGE_DATA_DIR` | `~/.claude/forge-data` | relocate the data directory |

Curate lessons anytime:
```bash
node ~/.claude/skills/forge/scripts/forge-store.js list           # project instincts
node ~/.claude/skills/forge/scripts/forge-store.js list-global     # global lessons
node ~/.claude/skills/forge/scripts/forge-store.js remove-global "<substring>"
```

---

## Privacy

The learned data (`~/.claude/forge-data/`) lives **outside this repo** and is git-ignored defensively.
Observations can contain raw commands and file paths; instincts and lessons can carry project detail;
**global-lesson anonymization is best-effort** (model + lint), not a guarantee. Treat `forge-data/`
like a log file — review `LESSONS.md` before ever sharing it, and never commit it.

---

## Credits & License

Built by synthesizing ideas from a number of excellent projects — full attribution in
[CREDITS.md](./CREDITS.md). Licensed under [MIT](./LICENSE). Not affiliated with or endorsed by
Anthropic or the credited projects.
