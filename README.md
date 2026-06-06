```
  __                          ·  ✦  ·
 / _| ___  _ __ __ _  ___    ( ◕ ‿ ◕ )
| |_ / _ \| '__/ _` |/ _ \  __|     |__
|  _| (_) | | | (_| |  __/ |___________|
|_|  \___/|_|  \__, |\___|     |   |
               |___/         /_____\
```

# forge 🔨

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-7C3AED)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)
![Dependencies: zero](https://img.shields.io/badge/dependencies-zero-brightgreen)
![Skills: 15](https://img.shields.io/badge/skills-15-orange)

**A curated, state-of-the-art software-development-lifecycle skill set for Claude Code — with a memory layer that learns as you work.**

Most people end up with a dozen overlapping Claude Code skill packs and have to remember which to invoke when. **forge is one cohesive plugin instead.** It distills the best, most distinctive *techniques* from across the Claude Code skills ecosystem (full attribution in [CREDITS.md](./CREDITS.md)) into a single, unambiguous lifecycle — `understand → brainstorm → architect → plan → tdd → debug → review → verify → ship`, plus `orchestrate`, `eval`, and `design-ui`.

On top of that, forge adds a **continuous-learning memory layer**: it quietly notices how you work, distills durable lessons, and feeds them back into future sessions — both per-project and as anonymized, cross-project lessons — so your agent stops repeating the same mistakes anywhere.

> ⚠️ **Heads-up:** forge ships **hooks** that write a local activity log and run **background model calls on your own Claude subscription**. This is fully disclosed in [What the hooks actually do](#️-what-the-hooks-actually-do). It's all local, and you can disable it with one setting.

---

## Table of contents
- [What forge is](#what-forge-is)
- [In action](#in-action)
- [Requirements](#requirements)
- [Installation](#installation)
- [Using forge day to day](#using-forge-day-to-day)
- [The 15 skills](#the-15-skills)
- [The continuous-learning memory layer](#the-continuous-learning-memory-layer)
- [Configuration](#configuration)
- [⚠️ What the hooks actually do](#️-what-the-hooks-actually-do)
- [Privacy & safety](#privacy--safety)
- [Updating & uninstalling](#updating--uninstalling)
- [How it works under the hood](#how-it-works-under-the-hood)
- [FAQ / troubleshooting](#faq--troubleshooting)
- [Contributing](#contributing)
- [Credits & license](#credits--license)

---

## What forge is

forge is a **Claude Code plugin**: a folder of *skills* (instructions Claude loads on demand), plus a few *hooks* (small scripts Claude Code runs on events) and *agents-free* Node utilities. It has two halves:

1. **A complete SDLC methodology.** Fifteen skills, each a synthesis of the single best mechanism for its phase — not a grab-bag. The discipline is opinionated: test-first, root-cause-before-patching, evidence-before-claiming-done, anti-slop UI, and so on. Skills are namespaced (`forge:tdd`, `forge:debug`, …) so they never collide with anything else you have installed.

2. **A memory that compounds.** Three hooks form a loop: **capture** what you do → **learn** durable lessons from it → **recall** them in future sessions. Lessons are stored in two tiers — *project instincts* (specific to one repo) and *global lessons* (anonymized, useful everywhere).

The design philosophy throughout: **name the rationalization and forbid it**, prefer **mechanically-checkable rules** over vague advice, separate **deterministic scaffolding from model judgment**, and **build verification into the work**.

---

## In action

You rarely call skills by name — they trigger from what you're doing. A typical feature slice looks like this:

```text
you:  add OAuth login to the settings page

forge:brainstorm → "Before any code: which providers? where do tokens live?
                    here's my recommended answer for each…"   (HARD GATE — nothing built until you approve)
forge:plan       → vertical slices, each: failing test → implement → commit
forge:tdd        → writes the failing test FIRST, watches it fail, then implements
forge:review     → a fresh reviewer checks Spec + Standards, side by side
forge:verify     → runs the suite and shows you the GREEN output before saying "done"
```

…and the memory loop, across sessions:

```text
[session 1]  you correct it: "stop bumping timeouts, find the root cause"
             → forge distills an anonymized GLOBAL lesson in the background

[session 2 — any project]  SessionStart injects:
   ## forge — global lessons (cross-project)
   - When intermittent test failures tempt a retry/timeout patch →
     investigate the root cause first (race, shared state)  (conf 0.85)
```

> 📹 Recording a short walkthrough? Drop a GIF in `docs/` and embed it here: `![forge demo](docs/demo.gif)`

---

## Requirements

- **Claude Code v2.1+** — plugin hooks auto-load from `hooks/hooks.json` by convention in this version.
- **Node.js** on your `PATH` — the core hook scripts are plain Node with **zero dependencies**. Only the *optional* `forge:recall` memory add-on needs a one-time `npm install` (a local embedding model).
- For the automatic learning/memory features: an authenticated `claude` CLI (you already have this if you use Claude Code). The background distiller/indexer call `claude -p` on your own plan.

---

## Installation

### Recommended — skills-directory plugin
Clone directly into your Claude Code skills directory so it loads as a namespaced plugin:

```bash
git clone https://github.com/vasu-devs/Forge ~/.claude/skills/forge
```

Then restart Claude Code (or run `/reload-plugins`). Verify it loaded:

```bash
claude plugin list        # look for: forge@skills-dir
```

Skills now appear as `forge:tdd`, `forge:debug`, `forge:design-ui`, etc.

> The manual `forge:learn` CLI commands assume this exact path (`~/.claude/skills/forge`). The **automatic** learning works regardless of install method, because the hooks resolve their own location via `${CLAUDE_PLUGIN_ROOT}`.

### Alternative — marketplace
```
/plugin marketplace add vasu-devs/Forge
/plugin install forge@forge
```

### First-run note
Nothing learns until you've worked a bit. The learning layer activates on the next session start after install, and the memory store (`~/.claude/forge-data/`) is created lazily on first use.

---

## Using forge day to day

You mostly **don't invoke skills manually** — they trigger from what you're doing. Just work normally and forge's discipline kicks in at the right phase. The intended flow:

```
forge:understand   ── map unfamiliar code before you touch it
      │
forge:brainstorm   ── turn a vague idea into an approved written spec  (HARD GATE: no code yet)
      │
forge:architect    ── design the shape; search-first; design-it-twice
      │
forge:plan         ── break into vertical, test-first slices (no placeholders)
      │
forge:tdd  ⇄  forge:debug      ── implement test-first; root-cause failures
      │           (forge:orchestrate to fan out independent slices to parallel agents)
forge:review       ── two-axis review by a fresh reviewer (spec + standards)
      │
forge:verify  /  forge:eval    ── prove it (deterministic) / measure it (LLM/non-deterministic)
      │
forge:ship         ── verify-first, clean up, integrate (never pushes without asking)
```

`forge:design-ui` slots in whenever you build frontend; `forge:principles` is the always-applicable doctrine; `forge:learn` runs automatically (and on demand).

You can always invoke a skill explicitly, e.g. *"use forge:architect for this"* or `/forge:debug`.

---

## The 15 skills

| Skill | Phase | What it does (and the key mechanism it enforces) |
|---|---|---|
| **`forge:principles`** | doctrine | The operating constitution: **think before coding** (state assumptions, surface trade-offs), **simplicity first** (minimum code, no speculative abstractions), **surgical changes** (every changed line traces to the request), **goal-driven execution** (turn tasks into verifiable goals), **evidence over assertion**. Each principle ships a falsifiable *test*. |
| **`forge:understand`** | orient | Build an accurate map of unfamiliar code *before* editing. Uses a code-graph MCP if present, else surgical grep/read; **iterative retrieval** (learn the repo's own vocabulary); produces a compact map of entry points, key modules, the call path, and hotspots. |
| **`forge:brainstorm`** | spec | One-question-at-a-time grilling into an approved, written spec. A **hard gate** forbids any implementation until you approve the design. Captures decisions to a `CONTEXT.md` glossary; records an ADR only when a decision is hard-to-reverse *and* surprising *and* a real trade-off. |
| **`forge:architect`** | design | **Search-first** (Adopt / Extend / Compose / Build) before writing custom code. **Design-it-twice**: generate 2-3 divergent designs under different constraints. Judge on *depth* (small interface hiding real complexity), the **deletion test**, and the **two-adapter seam rule** (don't abstract until a second real implementation exists). |
| **`forge:plan`** | breakdown | Turn an approved design into a precise plan of **vertical tracer-bullet slices** (each cuts through all layers and leaves the program working). **No placeholders** — every task is concrete enough for a context-free executor. Each task carries a `verify:` check. |
| **`forge:tdd`** | implement | Red-green-refactor with an iron law: **no production code without a failing test first**; if you wrote code first, **delete it**; **watch the test fail** before implementing; one test → one slice (no horizontal batching); refactor only on green; test behavior not internals. Includes a rationalization-rebuttal table. |
| **`forge:debug`** | fix | Root-cause before any patch. **The feedback loop *is* the skill** — build the fastest deterministic pass/fail signal you can. Form 3-5 *falsifiable* hypotheses; tag probes `[DEBUG-id]` for one-grep cleanup; **after 3 failed fixes, stop and question the architecture**. |
| **`forge:review`** | quality | Review by a **fresh subagent that didn't write the code** (author-bias elimination), on **two parallel axes** — *Spec* (does it do what was asked?) and *Standards* (does it follow repo conventions?) — presented side by side. Severity-tiered (Critical / Important / Minor). |
| **`forge:verify`** | proof | The gate between "I think it works" and "it works." No completion claim without **fresh evidence this turn** — a claim→required-proof table (tests → runner output, "fixed" → the now-green reproducing test, "agent did X" → the diff). For UI: render and look. |
| **`forge:ship`** | land | Finish cleanly: **verify first**, detect the environment, present fixed merge/PR/keep/discard options, **provenance-aware cleanup** (only remove what you created), match the repo's commit style, and **never push without explicit ask**. |
| **`forge:orchestrate`** | parallelize | Run genuinely independent work concurrently with fresh agents. The **independence rule** ("if fixing A might fix B, don't parallelize"); crafted context per agent (never your session history); worktree isolation when agents write; fresh-reviewer per task. |
| **`forge:eval`** | measure | Eval-driven development for **non-deterministic / LLM** work that `forge:verify` can't catch in one shot. **pass@k** (capability) vs **pass^k** (regression); a grader hierarchy (code > rule > model-judge > human); baseline-without-the-skill validation. |
| **`forge:design-ui`** | frontend | Anti-slop UI. Tunable **dials** (variance / motion / density); **mechanically-checkable bans** (em-dash ban, eyebrow-per-3-sections rule, banned palettes, no Inter/AI-purple defaults); commit to one direction; **render-and-look** before shipping; a pre-flight gate. |
| **`forge:learn`** | memory | Distill durable lessons from the session into project instincts and anonymized global lessons. Runs **automatically** (see below); also invokable for deliberate capture and curation. |
| **`forge:recall`** | memory (cross-session) | Search your PAST sessions semantically and **resume a specific chat to go deeper** (`claude --resume <id>`), backed by a local embedding index + an auto-loaded personalization profile. Opt-in add-on (`npm install` in `memory/`). |

---

## The continuous-learning memory layer

This is what makes forge get better over time. It's three hooks forming a loop, all backed by local files under `~/.claude/forge-data/`:

### 1. Capture — `PostToolUse` hook
Every `Edit` / `Write` / `Bash` action is logged (one compact line: tool + file/command, truncated) to a **project-scoped** observations log. Deterministic, fast, fire-and-forget — it survives context compaction so the learner has ground truth of what actually happened.

### 2. Learn — `Stop` hook → background distiller
When a turn ends, a tiny hook checks a **throttle**: once `FORGE_LEARN_EVERY` (default **8**) new actions have accumulated, it spawns a **detached background** distiller (`distill.js`) that:
1. Reads the recent session transcript.
2. Calls a small model (`claude -p`, default Haiku — set `FORGE_LEARN_MODEL` to `claude-sonnet-4-6` for sharper judgment) to extract candidate lessons as strict JSON.
3. Runs a **strict quality gate** so only sharp, non-bogus knowledge survives:
   - a **confidence floor** (`FORGE_LEARN_MIN_CONF`, default 0.6),
   - **length checks** (no one-word triggers/actions),
   - a **platitude filter** (rejects "write clean code", "be careful", etc.),
   - an **anonymization lint** for global lessons (rejects anything containing a path or filename),
   - **per-run caps** (≤4 project instincts, ≤3 global lessons).
4. Appends survivors to the stores; dedup keeps the highest-confidence copy.

It runs **detached and non-blocking** (you never wait on it), uses an env-guard (`FORGE_DISTILLER=1`) to prevent the headless call from recursively triggering itself, and **silently no-ops on any error** — it can never break your tool flow.

### 3. Recall — `SessionStart` hook
At the start of every session, the highest-confidence lessons are injected back into context: **global lessons** (everywhere) plus **this project's instincts** (where they exist). Capped and confidence-sorted, so it stays small.

### Two tiers of memory

| | **Project instincts** | **Global lessons** |
|---|---|---|
| Scope | one repo (its conventions, build quirks, gotchas) | **anonymized**, transferable — every project |
| Stored in | `instincts/<project>.jsonl` | `global-lessons.jsonl` + a readable **`LESSONS.md`** |
| Best for | "in *this* repo, do X" | mistakes → corrections that apply anywhere |
| Loads | only in that repo | into **every** session |

Global lessons are deliberately anonymized (no project/path/domain identifiers) so they transfer cleanly and never leak project details across repos. They're rendered to `~/.claude/forge-data/LESSONS.md`, which you can read anytime to see your agent's accumulated wisdom.

### Manual use & curation (`forge:learn` + the CLI)

The automatic loop handles steady state, but you can drive it by hand:

```bash
node ~/.claude/skills/forge/scripts/forge-store.js list           # this project's instincts
node ~/.claude/skills/forge/scripts/forge-store.js list-global     # global lessons (+ path to LESSONS.md)
node ~/.claude/skills/forge/scripts/forge-store.js observations 40 # recent captured actions

# add a lesson by hand
node ~/.claude/skills/forge/scripts/forge-store.js add '{"trigger":"...","action":"...","confidence":0.8}'
node ~/.claude/skills/forge/scripts/forge-store.js add-global '{"trigger":"...","action":"...","confidence":0.8}'

# prune
node ~/.claude/skills/forge/scripts/forge-store.js remove "<substring>"
node ~/.claude/skills/forge/scripts/forge-store.js remove-global "<substring>"
```

### Cross-session recall & personalization (`forge:recall`) — opt-in

Beyond per-project instincts, forge can build a **semantic memory of your past chats** plus a **global personalization profile** ("who you are / how you work") that auto-loads at the start of every session. This add-on has one dependency (a local embedding model), so it's opt-in:

```bash
cd ~/.claude/skills/forge/memory && npm install   # one-time; pulls a small local ONNX embedding model
```

It then grows hands-free — a `SessionEnd` hook indexes each finished session in the background. Use it conversationally (*"what did we decide about X?"*, *"continue that thing from yesterday"*) or directly:

```bash
M=~/.claude/skills/forge/memory/forge-mem.mjs
node $M index             # ingest past transcripts (--all | --limit N)
node $M recall "<query>"  # semantic recall of memories, each with a `claude --resume <id>` link
node $M chats  "<query>"  # find a past chat to reopen
node $M profile           # (re)build the personalization profile (profile.md)
node $M status
```

Every memory carries a **source-chat reference**, so recall hands you the exact `claude --resume <sessionId>` to reopen and go deeper. It's **100% local and personal** — never transmitted. The design + citations behind it: [`docs/research/cross-session-memory-and-personalization.md`](docs/research/cross-session-memory-and-personalization.md).

---

## Configuration

All settings are environment variables. Set them under `"env"` in `~/.claude/settings.json`:

```json
{
  "env": {
    "FORGE_LEARN_MODEL": "claude-sonnet-4-6",
    "FORGE_LEARN_EVERY": "12"
  }
}
```

| Variable | Default | Effect |
|---|---|---|
| `FORGE_AUTOLEARN` | `on` | Set to `off` to disable the background distiller entirely (skills still work). |
| `FORGE_LEARN_EVERY` | `8` | Distill after this many new logged actions. Higher = leaner/less frequent. |
| `FORGE_LEARN_MODEL` | Haiku | Model id for distillation. `claude-sonnet-4-6` gives notably better judgment. |
| `FORGE_LEARN_MIN_CONF` | `0.6` | Quality floor — the distiller drops lessons below this confidence. |
| `FORGE_INSTINCT_MAX` / `FORGE_INSTINCT_MIN_CONF` | `12` / `0` | Cap & confidence floor for injected **project instincts**. |
| `FORGE_GLOBAL_MAX` / `FORGE_GLOBAL_MIN_CONF` | `15` / `0` | Cap & confidence floor for injected **global lessons**. Raise the floor to `0.7+` as the list grows. |
| `FORGE_DATA_DIR` | `~/.claude/forge-data` | Relocate the data directory. |
| `FORGE_AUTOINDEX` | `on` | *(memory add-on)* `off` disables auto-indexing finished sessions at `SessionEnd`. |
| `FORGE_EMBED_MODEL` | `Xenova/all-MiniLM-L6-v2` | *(memory add-on)* local embedding model used for recall. |
| `FORGE_PROFILE_EVERY` | `3` | *(memory add-on)* rebuild the personalization profile every N auto-indexed sessions. |

**Cost note:** the distiller runs on *your* Claude subscription. Sonnet gives sharper, less-bogus lessons but uses more of your usage budget than Haiku; pair it with a higher `FORGE_LEARN_EVERY` to keep it lean.

---

## ⚠️ What the hooks actually do

Transparency, because always-on hooks deserve it. When forge is installed and enabled:

- **`PostToolUse`** writes one line per `Edit`/`Write`/`Bash` to `~/.claude/forge-data/observations/<project>.jsonl`. Bash commands are logged (truncated). **This stays on your machine** and is never transmitted by forge.
- **`Stop`** may spawn a background `claude -p` (headless) call **on your Claude subscription** to distill lessons. Batched (default: after 8 logged actions), detached, never blocks you.
- **`SessionStart`** reads the local lesson files (+ the personalization profile, if present) and injects a small text block into the session context.
- **`SessionEnd`** — *only if the optional memory add-on is installed* — indexes the finished session into your local memory in the background. Disable with `FORGE_AUTOINDEX=off`.

Nothing leaves your machine except the background `claude -p` calls you'd already be authorized to make. **No telemetry, no network calls beyond Claude itself.**

**Turn it all off** with one setting:
```json
{ "env": { "FORGE_AUTOLEARN": "off" } }
```

---

## Privacy & safety

- The learned data (`~/.claude/forge-data/`) lives **outside this repo** and is git-ignored defensively.
- Observations can contain **raw commands and file paths**; instincts and lessons can carry project detail.
- **Global-lesson anonymization is best-effort** (model + lint), not a guarantee.
- Treat `~/.claude/forge-data/` like a log file: **review `LESSONS.md` before ever sharing it, and never commit it.**
- The distiller never executes anything from your code; it only reads the transcript and writes JSONL.

---

## Updating & uninstalling

**Update** (skills-directory install):
```bash
git -C ~/.claude/skills/forge pull
```
Then `/reload-plugins` or restart.

**Disable temporarily:** `claude plugin disable forge` — turns off the whole plugin including its hooks.

**Uninstall:** remove the folder (`rm -rf ~/.claude/skills/forge`) or `claude plugin uninstall` for a marketplace install. Your learned data in `~/.claude/forge-data/` is left untouched — delete it separately if you want a clean slate.

---

## How it works under the hood

```
forge/
├── .claude-plugin/
│   ├── plugin.json          # plugin manifest
│   └── marketplace.json     # lets others /plugin marketplace add this repo
├── hooks/hooks.json         # PostToolUse + SessionStart + Stop + SessionEnd (auto-loaded, Claude Code v2.1+)
├── scripts/                 # zero-dependency Node (core)
│   ├── lib.js               # shared paths/storage helpers + cross-platform project-id normalization
│   ├── log-tool-use.js      # PostToolUse: append observation
│   ├── inject-instincts.js  # SessionStart: inject profile + global lessons + project instincts
│   ├── stop-autolearn.js    # Stop: throttle + spawn the detached distiller
│   ├── distill.js           # background: transcript → claude -p → quality gate → store
│   ├── session-index.js     # SessionEnd: background-index the finished session (if memory add-on present)
│   └── forge-store.js       # CLI: list/add/remove instincts & global lessons
├── memory/                  # OPT-IN recall add-on (one dependency: local embeddings)
│   ├── package.json · lib-mem.mjs · forge-mem.mjs   # index / recall / chats / profile
├── docs/                    # research/ (the ASCII banner lives in this README)
└── skills/<name>/SKILL.md   # the 15 skills
```

Design choices worth knowing:
- **Deterministic scaffolding + model judgment, separated.** Hooks and scripts do the deterministic plumbing; the model is only asked for judgment, and the code gate vets its output.
- **Cross-platform project keys.** `lib.js` normalizes directory paths (reconciles `/c/Users/...` ↔ `C:\Users\...`, separators, case) so the `Stop`/`SessionStart` hooks and the CLI always agree on which project a lesson belongs to — on Windows, macOS, and Linux.
- **Recursion-safe.** The background `claude -p` runs with `FORGE_DISTILLER=1`; the `Stop` hook no-ops whenever that's set, so the learner can't trigger itself.

---

## FAQ / troubleshooting

**Skills aren't showing up.** Run `/reload-plugins` or restart Claude Code; confirm `claude plugin list` shows `forge`. Ensure you cloned into `~/.claude/skills/forge`.

**Nothing is being learned.** Learning is batched — it fires after `FORGE_LEARN_EVERY` (default 8) edits/commands, in the background. Check `~/.claude/forge-data/distiller.log`. Make sure `FORGE_AUTOLEARN` isn't `off` and that `claude` and `node` are on PATH.

**It feels too token-hungry.** Raise `FORGE_LEARN_EVERY` (e.g. 15–20), keep `FORGE_LEARN_MODEL` on Haiku, or set `FORGE_AUTOLEARN=off`.

**Lessons are low quality.** Raise `FORGE_LEARN_MIN_CONF` (e.g. 0.75) and switch `FORGE_LEARN_MODEL` to `claude-sonnet-4-6`. Prune existing ones with the `forge-store.js remove*` commands.

**I have other skill packs and they conflict.** forge is namespaced (`forge:*`), so there's no hard collision. If multiple packs' skills compete to trigger, use Claude Code's `skillOverrides` in settings to set the ones you don't want to `off` or `name-only`.

---

## Contributing

Contributions are welcome — sharper mechanisms, bug fixes, cross-platform fixes, and well-scoped new
lifecycle skills that earn their place. forge is a *curated* synthesis, so the bar is "is this the best
version of this idea?" Please **open an issue to discuss new skills before a large PR**.

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for the conventions: skill-authoring style, the
zero-dependency cross-platform script rules, how to test the hooks without spending tokens, and the
commit norms.

---

## Credits & license

forge is a **synthesis** — it re-expresses ideas and techniques from several excellent open projects in original wording; it copies none of their code or text. Full attribution and licenses are in [CREDITS.md](./CREDITS.md) (Superpowers, Matt Pocock's skills, Taste Skill, Anthropic Agent Skills, andrej-karpathy-skills, ECC — all MIT or Apache-2.0).

Licensed under [MIT](./LICENSE). Not affiliated with or endorsed by Anthropic or any of the credited projects.
