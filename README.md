```
███████╗ ██████╗ ██████╗  ██████╗ ███████╗
██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
█████╗  ██║   ██║██████╔╝██║  ███╗█████╗  
██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  
██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

# forge 🔨

> **A curated, state-of-the-art software-development-lifecycle skill set for Claude Code — with a memory layer that learns as you work.**

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-7C3AED)
![Version](https://img.shields.io/badge/version-2.0.0-informational)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)
![Core dependencies: zero](https://img.shields.io/badge/core%20deps-zero-brightgreen)
![Skills: 15](https://img.shields.io/badge/skills-15-orange)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey)

Most people accumulate a dozen overlapping Claude Code skill packs and then have to remember which one to invoke when. **forge replaces that pile with one cohesive plugin.** It distills the single best, most distinctive *technique* for each phase of software work — from across the Claude Code skills ecosystem (full attribution in [CREDITS.md](./CREDITS.md)) — into one unambiguous lifecycle, and adds a **continuous-learning memory layer** so your agent actually gets better over time instead of repeating the same mistakes.

```
understand → brainstorm → architect → plan → tdd ⇄ debug → review → verify → ship
                         ( + orchestrate · eval · design-ui · principles · learn · recall )
```

> [!IMPORTANT]
> forge ships **hooks** that write a local activity log and run **background model calls on your own Claude subscription**. This is fully and deliberately disclosed in [What the hooks actually do](#-what-the-hooks-actually-do). Everything stays on your machine, and you can turn it all off with a single setting.

---

## Quick start

```bash
# 1. Install (clone into your Claude Code skills directory)
git clone https://github.com/vasu-devs/Forge ~/.claude/skills/forge

# 2. Reload Claude Code
#    run  /reload-plugins  inside Claude Code, or just restart it

# 3. Verify
claude plugin list            # should list:  forge@skills-dir
```

That's it — the 15 skills (`forge:tdd`, `forge:debug`, …) and the automatic learning layer are now active. The optional cross-session memory add-on is one extra step; see [Cross-session recall](#cross-session-recall--personalization-opt-in).

---

## Table of contents

- [Why forge](#why-forge)
- [Design philosophy](#design-philosophy)
- [Features at a glance](#features-at-a-glance)
- [See it in action](#see-it-in-action)
- [Requirements](#requirements)
- [Installation](#installation)
- [Using forge day to day](#using-forge-day-to-day)
- [The 15 skills](#the-15-skills)
- [The continuous-learning memory layer](#the-continuous-learning-memory-layer)
- [Cross-session recall & personalization (opt-in)](#cross-session-recall--personalization-opt-in)
- [Command reference](#command-reference)
- [Configuration](#configuration)
- [What the hooks actually do](#-what-the-hooks-actually-do)
- [Privacy & security model](#privacy--security-model)
- [Performance & cost](#performance--cost)
- [Architecture](#architecture)
- [Compatibility](#compatibility)
- [Updating & uninstalling](#updating--uninstalling)
- [FAQ & troubleshooting](#faq--troubleshooting)
- [Contributing](#contributing)
- [Credits & license](#credits--license)

---

## Why forge

Claude Code is enormously capable, but a raw model has predictable failure modes: it **assumes silently**, **over-builds**, **edits code it doesn't understand**, **patches symptoms instead of root causes**, and **claims success it never verified**. The community responded with excellent but *fragmented* skill packs — each strong in one area, none covering the whole lifecycle, and many that collide or compete to trigger.

forge takes a different stance:

- **One cohesive lifecycle, not a grab-bag.** Fifteen skills, each the synthesis of the *single best mechanism* for its phase. They hand off to one another (`brainstorm → plan → tdd → review → verify → ship`) so there's never ambiguity about what to use when.
- **Opinionated discipline, mechanically enforced.** Test-first, root-cause-before-patching, evidence-before-"done", anti-slop UI — expressed as **falsifiable rules**, not vibes.
- **It compounds.** A memory layer captures how you work, distills durable lessons, and feeds them back into future sessions — both per-project and as anonymized cross-project lessons.
- **Namespaced and collision-free.** Every skill is `forge:*`, so it coexists with any other packs you have installed.
- **Zero core dependencies, fully local.** The core is plain Node with no install step; nothing leaves your machine except the background `claude` calls you're already authorized to make.

---

## Design philosophy

Four principles run through every skill and every script:

1. **Name the rationalization and forbid it.** The model's excuses are predictable ("this is too simple to test", "I'll add tests after", "it should work"). forge names each one and gives the honest rebuttal, so the shortcut is harder to take than to skip.
2. **Mechanically-checkable rules over vague advice.** "Write clean code" is unenforceable. "No production code without a failing test you watched fail" is. Every principle ships a *test* you can actually fail.
3. **Separate deterministic scaffolding from model judgment.** Hooks and scripts do the plumbing (logging, throttling, storage, path normalization) deterministically; the model is asked only for judgment; a code-level quality gate vets that judgment before anything is stored.
4. **Build verification into the work.** Success criteria are defined up front (`forge:plan`), proven with fresh evidence (`forge:verify`), and — for non-deterministic/LLM behavior — measured with repeatable evals (`forge:eval`).

---

## Features at a glance

| | |
|---|---|
| 🔁 **Full SDLC** | 15 hand-off-linked skills from understanding code to shipping it |
| 🧠 **Learns as you work** | background distiller turns your sessions into durable "instincts" |
| 🌍 **Two memory tiers** | per-project instincts + anonymized cross-project lessons |
| 🔎 **Cross-session recall** | *(opt-in)* local semantic search over past chats + `claude --resume` links |
| 👤 **Personalization** | *(opt-in)* an auto-built profile of how you like to work |
| 🧩 **Namespaced** | `forge:*` — no collisions with other skill packs |
| 📦 **Zero core deps** | plain Node; only the recall add-on needs one `npm install` |
| 🔒 **Local & disclosed** | no telemetry; every hook documented; one-switch off |
| 🖥️ **Cross-platform** | macOS, Linux, Windows (path-normalized project keys) |

---

## See it in action

You rarely call skills by name — they trigger from what you're doing. A typical feature slice:

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
     investigate the root cause first (race, shared state)   (conf 0.85)
```

---

## Requirements

| Requirement | Why |
|---|---|
| **Claude Code v2.1+** | Plugin hooks auto-load from `hooks/hooks.json` by convention in this version. |
| **Node.js** on your `PATH` | The core hook scripts are plain Node with **zero dependencies**. |
| **An authenticated `claude` CLI** | The background distiller/indexer call `claude -p` on your own plan. You already have this if you use Claude Code. |
| *(optional)* ability to run `npm install` | Only for the `forge:recall` memory add-on, which pulls one local embedding model. |

---

## Installation

### Recommended — skills-directory plugin

Clone directly into your Claude Code skills directory so it loads as a namespaced plugin:

```bash
git clone https://github.com/vasu-devs/Forge ~/.claude/skills/forge
```

Then run `/reload-plugins` inside Claude Code (or restart it) and verify:

```bash
claude plugin list        # look for:  forge@skills-dir
```

Skills now appear as `forge:tdd`, `forge:debug`, `forge:design-ui`, etc.

> The manual `forge-store` / `forge-mem` CLI commands below assume this exact path (`~/.claude/skills/forge`). The **automatic** learning works regardless of install location, because the hooks resolve their own path via `${CLAUDE_PLUGIN_ROOT}`.

### Alternative — marketplace

```text
/plugin marketplace add vasu-devs/Forge
/plugin install forge@forge
```

### First-run notes

- Nothing learns until you've worked a bit. The learning layer activates on the next session start after install.
- The data store (`~/.claude/forge-data/`) is created **lazily** on first use — there's nothing to set up.
- The cross-session **recall** add-on is opt-in; until you run its `npm install`, those hooks no-op silently.

---

## Using forge day to day

You mostly **don't invoke skills manually** — they trigger from what you're doing. Just work normally and forge's discipline kicks in at the right phase. The intended flow:

```
forge:understand   ── map unfamiliar code before you touch it
      │
forge:brainstorm   ── turn a vague idea into an approved written spec   (HARD GATE: no code yet)
      │
forge:architect    ── design the shape; search-first; design-it-twice
      │
forge:plan         ── break into vertical, test-first slices (no placeholders)
      │
forge:tdd  ⇄  forge:debug      ── implement test-first; root-cause failures
      │        (forge:orchestrate to fan independent slices out to parallel agents)
forge:review       ── two-axis review by a fresh reviewer (spec + standards)
      │
forge:verify  /  forge:eval    ── prove it (deterministic) / measure it (LLM/non-deterministic)
      │
forge:ship         ── verify-first, clean up, integrate (never pushes without asking)
```

- `forge:design-ui` slots in whenever you build frontend.
- `forge:principles` is the always-applicable doctrine underneath everything.
- `forge:learn` runs **automatically** in the background (and is invokable for deliberate capture).
- `forge:recall` answers "what did we do before?" across past sessions (opt-in).

You can always invoke a skill explicitly — *"use forge:architect for this"* or `/forge:debug`.

---

## The 15 skills

| Skill | Phase | What it does (and the key mechanism it enforces) |
|---|---|---|
| **`forge:principles`** | doctrine | The operating constitution: **think before coding**, **simplicity first**, **surgical changes**, **goal-driven execution**, **evidence over assertion**. Each principle ships a falsifiable *test*. |
| **`forge:understand`** | orient | Build an accurate map of unfamiliar code *before* editing. Uses a code-graph MCP if present, else surgical grep/read; **iterative retrieval** (learn the repo's own vocabulary); outputs entry points, key modules, the call path, and hotspots. |
| **`forge:brainstorm`** | spec | One-question-at-a-time grilling into an approved, written spec. A **hard gate** forbids implementation until you approve. Captures decisions to a `CONTEXT.md` glossary; records an ADR only when a decision is hard-to-reverse *and* surprising *and* a real trade-off. |
| **`forge:architect`** | design | **Search-first** (Adopt / Extend / Compose / Build) before custom code. **Design-it-twice**: 2–3 divergent designs under different constraints. Judge on *depth*, the **deletion test**, and the **two-adapter seam rule** (don't abstract until a second real implementation exists). |
| **`forge:plan`** | breakdown | Turn a design into **vertical tracer-bullet slices** (each cuts through all layers and leaves the program working). **No placeholders** — every task is concrete enough for a context-free executor. Each task carries a `verify:` check. |
| **`forge:tdd`** | implement | Red-green-refactor with an iron law: **no production code without a failing test first**; if you wrote code first, **delete it**; **watch it fail** before implementing; one test → one slice; refactor only on green; test behavior not internals. |
| **`forge:debug`** | fix | Root-cause before any patch. **The feedback loop *is* the skill** — build the fastest deterministic pass/fail signal. 3–5 *falsifiable* hypotheses; tag probes `[DEBUG-id]` for one-grep cleanup; **after 3 failed fixes, stop and question the architecture**. |
| **`forge:review`** | quality | Review by a **fresh subagent that didn't write the code** (author-bias elimination), on **two parallel axes** — *Spec* and *Standards* — side by side. Severity-tiered (Critical / Important / Minor). |
| **`forge:verify`** | proof | The gate between "I think it works" and "it works." No completion claim without **fresh evidence this turn** — a claim→required-proof table. For UI: render it and look. |
| **`forge:ship`** | land | Finish cleanly: **verify first**, detect the environment, present fixed merge/PR/keep/discard options, **provenance-aware cleanup** (only remove what you created), match the repo's commit style, **never push without explicit ask**. |
| **`forge:orchestrate`** | parallelize | Run genuinely independent work concurrently with fresh agents. The **independence rule** ("if fixing A might fix B, don't parallelize"); crafted per-agent context; worktree isolation when agents write; a fresh reviewer per task. |
| **`forge:eval`** | measure | Eval-driven development for **non-deterministic / LLM** work that one-shot verification can't catch. **pass@k** (capability) vs **pass^k** (regression); a grader hierarchy (code > rule > model-judge > human); baseline-without-the-skill validation. |
| **`forge:design-ui`** | frontend | Anti-slop UI. Tunable **dials** (variance / motion / density); **mechanically-checkable bans** (em-dash ban, eyebrow-per-3-sections, banned palettes, no Inter/AI-purple defaults); commit to one direction; **render-and-look** before shipping. |
| **`forge:learn`** | memory | Distill durable lessons from the session into project instincts and anonymized global lessons. Runs **automatically** (see below); also invokable for deliberate capture and curation. |
| **`forge:recall`** | memory (x-session) | Search PAST sessions semantically and **resume a specific chat to go deeper** (`claude --resume <id>`), backed by a local embedding index + an auto-loaded personalization profile. Opt-in add-on. |

---

## The continuous-learning memory layer

This is what makes forge get better over time. It's a loop of hooks, all backed by local files under `~/.claude/forge-data/`.

### 1. Capture — `PostToolUse` hook

Every `Edit` / `Write` / `Bash` action is logged as one compact line (tool + file/command, truncated) to a **project-scoped** observations log. Deterministic, fast, fire-and-forget — it survives context compaction, so the learner always has ground truth of what actually happened.

### 2. Learn — `Stop` hook → background distiller

When a turn ends, a tiny hook checks a **throttle**. Once `FORGE_LEARN_EVERY` (default **8**) new actions have accumulated, it spawns a **detached background** distiller (`distill.js`) that:

1. Reads the recent session transcript.
2. Calls a small model (`claude -p`, default **Haiku** — set `FORGE_LEARN_MODEL` to `claude-sonnet-4-6` for sharper judgment) to extract candidate lessons as strict JSON.
3. Runs a **strict quality gate** so only sharp, non-bogus knowledge survives:
   - a **confidence floor** (`FORGE_LEARN_MIN_CONF`, default `0.6`),
   - **length checks** (no one-word triggers/actions),
   - a **platitude filter** (rejects "write clean code", "be careful", …),
   - an **anonymization lint** for global lessons (rejects anything containing a path or filename),
   - **per-run caps** (≤ 4 project instincts, ≤ 3 global lessons).
4. Appends survivors to the stores; dedup keeps the highest-confidence copy.

It runs **detached and non-blocking** (you never wait on it), uses an env-guard (`FORGE_DISTILLER=1`) so the headless call can't recursively trigger itself, and **silently no-ops on any error** — it can never break your tool flow.

### 3. Recall — `SessionStart` hook

At the start of every session, the highest-confidence lessons are injected back into context: **global lessons** (everywhere) plus **this project's instincts** (where they exist), plus the **personalization profile** if the add-on is installed. Capped and confidence-sorted, so the injected block stays small.

### Two tiers of memory

| | **Project instincts** | **Global lessons** |
|---|---|---|
| Scope | one repo (its conventions, build quirks, gotchas) | **anonymized**, transferable — every project |
| Stored in | `instincts/<project>.jsonl` | `global-lessons.jsonl` + a readable **`LESSONS.md`** |
| Best for | "in *this* repo, do X" | mistakes → corrections that apply anywhere |
| Loads | only in that repo | into **every** session |

Global lessons are deliberately anonymized (no project / path / domain identifiers) so they transfer cleanly and never leak project details across repos.

### The lesson data model

Both tiers store one JSON object per line (JSONL). The shape is intentionally tiny:

```json
{ "trigger": "when intermittent test failures tempt a retry/timeout patch",
  "action":  "investigate the root cause first (race, shared state) before adding any wait",
  "confidence": 0.85 }
```

`trigger` is the situation, `action` is what to do, `confidence` (0–1) drives sorting, the injection floor, and dedup. `LESSONS.md` is a rendered, human-readable view of `global-lessons.jsonl` — the JSONL is the source of truth; edit via the CLI, not by hand.

---

## Cross-session recall & personalization (opt-in)

Beyond per-project instincts, forge can build a **semantic memory of your past chats** plus a **global personalization profile** ("who you are / how you work") that auto-loads at the start of every session. This add-on has one dependency (a local ONNX embedding model), so it's opt-in:

```bash
cd ~/.claude/skills/forge/memory && npm install   # one-time; pulls a small local embedding model
```

Once installed it grows hands-free — a `SessionEnd` hook indexes each finished session in the background. Use it conversationally (*"what did we decide about X?"*, *"continue that thing from yesterday"*) via `forge:recall`, or directly with the CLI (see below).

Every memory carries a **source-chat reference**, so recall hands you the exact `claude --resume <sessionId>` to reopen the conversation and go deeper. It is **100% local and personal** — never transmitted. The design and citations behind it live in [`docs/research/cross-session-memory-and-personalization.md`](docs/research/cross-session-memory-and-personalization.md).

---

## Command reference

> All paths assume the recommended install at `~/.claude/skills/forge`.

### Lessons & instincts — `scripts/forge-store.js` (zero-dependency, always available)

```bash
S=~/.claude/skills/forge/scripts/forge-store.js

node $S list                 # this project's instincts
node $S list-global          # global lessons (+ path to LESSONS.md)
node $S observations [N]     # recent captured actions (alias: obs)
node $S clear-observations   # wipe this project's observation log

# add a lesson by hand (JSON: trigger, action, confidence)
node $S add        '{"trigger":"...","action":"...","confidence":0.8}'
node $S add-global '{"trigger":"...","action":"...","confidence":0.8}'

# prune by substring match
node $S remove        "<substring>"
node $S remove-global "<substring>"
```

### Cross-session memory — `memory/forge-mem.mjs` (after the add-on `npm install`)

```bash
M=~/.claude/skills/forge/memory/forge-mem.mjs

node $M index             # ingest past transcripts        (flags: --all | --limit N)
node $M recall "<query>"  # semantic recall; each hit has a `claude --resume <id>` link
node $M chats  "<query>"  # find a past chat to reopen
node $M profile           # (re)build the personalization profile (profile.md)
node $M status            # counts: memories / chats / profile presence
node $M autoindex --session <path>   # (used internally by the SessionEnd hook)
```

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

### Core (learning) settings

| Variable | Default | Effect |
|---|---|---|
| `FORGE_AUTOLEARN` | `on` | Set to `off` to disable the background distiller entirely (skills still work). |
| `FORGE_LEARN_EVERY` | `8` | Distill after this many new logged actions. Higher = leaner / less frequent. |
| `FORGE_LEARN_MODEL` | `claude-haiku-4-5-20251001` | Model id for distillation. `claude-sonnet-4-6` gives notably sharper judgment. |
| `FORGE_LEARN_MIN_CONF` | `0.6` | Quality floor — the distiller drops candidate lessons below this confidence. |
| `FORGE_INSTINCT_MAX` / `FORGE_INSTINCT_MIN_CONF` | `12` / `0` | Cap & confidence floor for injected **project instincts**. |
| `FORGE_GLOBAL_MAX` / `FORGE_GLOBAL_MIN_CONF` | `15` / `0` | Cap & confidence floor for injected **global lessons**. Raise the floor to `0.7+` as the list grows. |
| `FORGE_DATA_DIR` | `~/.claude/forge-data` | Relocate the data directory. |

### Memory add-on settings

| Variable | Default | Effect |
|---|---|---|
| `FORGE_AUTOINDEX` | `on` | `off` disables auto-indexing finished sessions at `SessionEnd`. |
| `FORGE_EMBED_MODEL` | `Xenova/all-MiniLM-L6-v2` | Local embedding model used for recall. |
| `FORGE_PROFILE_EVERY` | `3` | Rebuild the personalization profile every N auto-indexed sessions. |

### Advanced / testing

| Variable | Effect |
|---|---|
| `FORGE_DISTILLER` | Set to `1` inside the headless distiller call; the `Stop` hook no-ops when present (recursion guard). Don't set this yourself. |
| `FORGE_DISTILL_DRYRUN` / `FORGE_DISTILL_MOCK` | Let you exercise the distiller's pipeline and quality gate **without** spending tokens — used by the test workflow in [CONTRIBUTING.md](./CONTRIBUTING.md). |

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

## Privacy & security model

- **Local-only.** All learned data lives under `~/.claude/forge-data/`, **outside this repo**, and is git-ignored defensively. forge performs no network I/O of its own.
- **Observations can be sensitive.** They may contain **raw commands and file paths**; project instincts and lessons can carry project detail. Treat `~/.claude/forge-data/` like a log file.
- **Global anonymization is best-effort.** A model pass plus an anonymization lint strip paths/filenames from global lessons, but it is *not* a cryptographic guarantee — **review `LESSONS.md` before ever sharing it.**
- **Stored memory is treated as untrusted context.** The distiller only *reads* the transcript and *writes* JSONL; it never executes anything from your code or your stored data.
- **No auto-exfiltration.** Lessons are never uploaded, synced, or shared. If you want a clean slate, delete the data directory.

---

## Performance & cost

- **Core hooks are nearly free.** Logging, throttling, and injection are tiny synchronous Node scripts (timeouts of 5–15 s as a safety net; they typically finish in milliseconds) and they exit 0 on any error so they can never stall your tool flow.
- **The distiller costs tokens — on your own plan — but is batched and detached.** It only runs after `FORGE_LEARN_EVERY` actions and never blocks you.
- **Tuning knobs:** raise `FORGE_LEARN_EVERY` (e.g. 15–20) to distill less often; keep `FORGE_LEARN_MODEL` on Haiku for cheap runs or switch to Sonnet for sharper lessons; set `FORGE_AUTOLEARN=off` to disable learning entirely while keeping all 15 skills.
- **The recall add-on runs a small embedding model locally** (no API cost) and indexes in the background at `SessionEnd`.

---

## Architecture

```
forge/
├── .claude-plugin/
│   ├── plugin.json          # plugin manifest (name, version, description, author)
│   └── marketplace.json     # lets others /plugin marketplace add this repo
├── hooks/hooks.json         # PostToolUse + SessionStart + Stop + SessionEnd (auto-loaded, CC v2.1+)
├── scripts/                 # zero-dependency Node (core)
│   ├── lib.js               # shared paths/storage helpers + cross-platform project-id normalization
│   ├── log-tool-use.js      # PostToolUse: append one observation line
│   ├── inject-instincts.js  # SessionStart: inject profile + global lessons + project instincts
│   ├── stop-autolearn.js    # Stop: throttle + spawn the detached distiller
│   ├── distill.js           # background: transcript → claude -p → quality gate → store
│   ├── session-index.js     # SessionEnd: background-index the finished session (if add-on present)
│   └── forge-store.js       # CLI: list/add/remove instincts & global lessons
├── memory/                  # OPT-IN recall add-on (one dependency: local embeddings)
│   ├── package.json
│   ├── lib-mem.mjs          # embeddings, cosine similarity, scoring, transcript flattening
│   └── forge-mem.mjs        # CLI: index / recall / chats / profile / status
├── docs/research/           # the deep-research report behind the memory design
└── skills/<name>/SKILL.md   # the 15 skills
```

Data lives separately, under `~/.claude/forge-data/`:

```
forge-data/
├── observations/<project>.jsonl   # captured Edit/Write/Bash actions (per project)
├── instincts/<project>.jsonl      # distilled project instincts (per project)
├── global-lessons.jsonl           # anonymized cross-project lessons (source of truth)
├── LESSONS.md                     # human-readable rendering of the above
├── state/                         # throttle counters
├── distiller.log                  # background distiller log
└── memory/                        # opt-in: memories.jsonl, chats.jsonl, profile.md, indexed.json
```

**Design choices worth knowing:**

- **Deterministic scaffolding + model judgment, separated.** Hooks and scripts do the deterministic plumbing; the model is only asked for judgment, and the code gate vets its output before storage.
- **Cross-platform project keys.** `lib.js` normalizes directory paths (reconciles `/c/Users/...` ↔ `C:\Users\...`, separators, case) so the `Stop`/`SessionStart` hooks and the CLI always agree on which project a lesson belongs to — on Windows, macOS, and Linux.
- **Recursion-safe.** The background `claude -p` runs with `FORGE_DISTILLER=1`; the `Stop` hook no-ops whenever that's set, so the learner can't trigger itself.
- **Fail-open.** Every hook swallows its own errors and exits 0 — a broken hook degrades to "no learning this turn", never to a blocked tool call.

---

## Compatibility

| | |
|---|---|
| **Claude Code** | v2.1+ (hooks auto-load from `hooks/hooks.json`). |
| **OS** | macOS, Linux, Windows (PowerShell or msys/Git-Bash). Project keys are path-normalized across all three. |
| **Node.js** | Any reasonably current LTS. Core scripts use only the standard library. |
| **Other skill packs** | Fully compatible — forge is namespaced `forge:*`. Use Claude Code's `skillOverrides` if multiple packs compete to trigger. |

---

## Updating & uninstalling

**Update** (skills-directory install):

```bash
git -C ~/.claude/skills/forge pull
```

Then `/reload-plugins` or restart.

**Disable temporarily:**

```bash
claude plugin disable forge      # turns off the whole plugin, including its hooks
```

**Uninstall:** remove the folder (`rm -rf ~/.claude/skills/forge`) or `claude plugin uninstall` for a marketplace install. Your learned data in `~/.claude/forge-data/` is left untouched — delete it separately if you want a clean slate.

---

## FAQ & troubleshooting

**Skills aren't showing up.**
Run `/reload-plugins` or restart Claude Code; confirm `claude plugin list` shows `forge@skills-dir`. Ensure you cloned into `~/.claude/skills/forge`.

**Nothing is being learned.**
Learning is *batched* — it fires only after `FORGE_LEARN_EVERY` (default 8) edits/commands, in the background. Check `~/.claude/forge-data/distiller.log`. Make sure `FORGE_AUTOLEARN` isn't `off` and that both `claude` and `node` are on your `PATH`.

**It feels too token-hungry.**
Raise `FORGE_LEARN_EVERY` (e.g. 15–20), keep `FORGE_LEARN_MODEL` on Haiku, or set `FORGE_AUTOLEARN=off`.

**Lessons are low quality.**
Raise `FORGE_LEARN_MIN_CONF` (e.g. `0.75`) and switch `FORGE_LEARN_MODEL` to `claude-sonnet-4-6`. Prune existing ones with `forge-store.js remove` / `remove-global`.

**`forge:recall` says it's not available.**
The recall add-on is opt-in. Run `cd ~/.claude/skills/forge/memory && npm install` once, then `node memory/forge-mem.mjs index` to backfill past chats.

**I have other skill packs and they conflict.**
forge is namespaced (`forge:*`), so there's no hard collision. If multiple packs' skills compete to *trigger*, set the ones you don't want to `off` or `name-only` via Claude Code's `skillOverrides` in settings.

**How do I see what it has learned about me / my projects?**
`node scripts/forge-store.js list-global` and `list`, or read `~/.claude/forge-data/LESSONS.md`. The personalization profile is `~/.claude/forge-data/memory/profile.md`.

---

## Contributing

Contributions are welcome — sharper mechanisms, bug fixes, cross-platform fixes, and well-scoped new lifecycle skills that earn their place. forge is a *curated* synthesis, so the bar is "is this the best version of this idea?" Please **open an issue to discuss new skills before a large PR**.

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for the conventions: skill-authoring style, the zero-dependency cross-platform script rules, how to test the hooks without spending tokens (`FORGE_DISTILL_DRYRUN` / `FORGE_DISTILL_MOCK`), and the commit norms.

---

## Credits & license

forge is a **synthesis** — it re-expresses ideas and techniques from several excellent open projects in original wording; it copies none of their code or text. Full attribution and licenses are in [CREDITS.md](./CREDITS.md) (Superpowers, Matt Pocock's skills, Taste Skill, Anthropic Agent Skills, andrej-karpathy-skills, ECC — all MIT or Apache-2.0).

Licensed under [MIT](./LICENSE). Not affiliated with or endorsed by Anthropic or any of the credited projects.
