---
name: graph
description: Query forge's live, always-fresh code map — a dependency graph of the repo with god-nodes, modules, and neighbors/impact (blast-radius) queries. Use before editing to know what depends on a file, to find the most-depended-on hotspots, to map an unfamiliar codebase's architecture, or whenever you need current structural context instead of guessing.
---

```
 ██████╗ ██████╗  █████╗ ██████╗ ██╗  ██╗
██╔════╝ ██╔══██╗██╔══██╗██╔══██╗██║  ██║
██║  ███╗██████╔╝███████║██████╔╝███████║
██║   ██║██╔══██╗██╔══██║██╔═══╝ ██╔══██║
╚██████╔╝██║  ██║██║  ██║██║     ██║  ██║
 ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝
```

# The live code map

forge keeps a **dependency graph of the whole repo** — built once, then patched automatically as files change, so your structural context never goes stale. It's a zero-dependency, fully-local synthesis of the three things a code graph is good for:

- **god-nodes** — the most-depended-on files (highest fan-in); the architectural hotspots to touch with care.
- **modules / clusters** — the architecture at a glance (which directories form cohesive units, how many communities exist).
- **neighbors / impact** — who imports a file, and the **transitive blast radius** of changing it.

It updates itself: a `SessionStart` hook injects a fresh map and triggers a background refresh; the `Stop` hook patches changed files after every turn (mtime-diff — only changed files are reparsed). You usually **read the injected map for free**; reach for the CLI when you need a specific answer.

## When to use it
- **Before editing a shared file** — run `impact` to see everything that could break.
- **Entering an unfamiliar repo** — run `map` to learn the hotspots and module layout in one call (cheaper and more accurate than grepping around).
- **"Where is X / what uses X"** — `neighbors` gives importers and imports directly.
- It's the structural layer `forge:understand` leans on — use the graph first, then read only the files on the path.

## Commands
```bash
G=~/.claude/skills/forge/scripts/graph.js
node "$G" map                 # god-nodes + module map for this repo
node "$G" neighbors <file>    # direct imports ↑ and importers ↓ of a repo-relative file
node "$G" impact <file>       # transitive blast radius — who breaks if this changes
node "$G" stats               # files / deps / clusters / last-built
node "$G" refresh             # build if missing, else mtime-patch (the hooks do this for you)
```
Paths are **repo-relative with `/` separators** (e.g. `src/api/client.ts`), exactly as the map prints them.

## What it does and doesn't see
- **Edges = static imports/requires/includes**, resolved to real repo files: JS/TS (`import`/`require`/dynamic-`import`, relative paths + index resolution), Python (absolute + relative, incl. nested-package suffix match), C/C++ (`#include "…"`), Ruby (`require_relative`), Rust (`mod`).
- It does **not** follow dynamic dispatch, runtime reflection, or path-alias imports (`@/…` from tsconfig) — those edges won't appear. Treat the map as a high-accuracy skeleton, not a proof of completeness; confirm a critical call path by reading the code (`forge:verify`).
- If a deeper **symbol-level** call graph is available (e.g. CodeGraph MCP via `/codegraph-here`), prefer it for precise caller/callee analysis; forge:graph is the always-on, zero-setup baseline.

## Freshness
The map is patched after each turn, so during a session it tracks your edits. If you've just made sweeping changes and want certainty before a big query, run `node "$G" refresh` first. Disable the whole subsystem with `FORGE_GRAPH=off`.
