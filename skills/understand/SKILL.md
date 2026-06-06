---
name: understand
description: Build an accurate mental map of unfamiliar code before changing it. Use when starting work in a codebase or area you don't know well, before editing code whose ripple effects you can't predict, or when the user asks how something works or where something lives.
---

# Understand before you touch

Editing code you haven't mapped is the fastest route to breakage. Spend a little to orient first, then change with confidence. The goal is a short, accurate map in the project's *own* vocabulary — not a file dump.

## 1. Pick the cheapest accurate lens

- **If CodeGraph MCP tools are available** (`codegraph_explore`, `codegraph_search`, `codegraph_callers`, `codegraph_impact` — present when `/codegraph-here` has been activated for this repo): prefer `codegraph_explore` for "how does X work / how does X reach Y" and `codegraph_impact` before changing a symbol. One call replaces many grep/read round-trips and follows dynamic-dispatch hops grep can't.
- **Otherwise**: Grep/Glob for entry points and definitions, then Read only the files on the relevant path. Don't read the whole tree.

## 2. Iterative retrieval — learn the repo's words

The codebase rarely uses your words. Search by the obvious term; if it comes back empty, that's a signal, not a dead end:
1. Search the concept ("rate limit").
2. Empty? Find what *this* repo calls it (skim a nearby module, a config, a test) — maybe it's "throttle" or "quota".
3. Re-search with the repo's term. Repeat up to ~3 cycles.

Adopt the repo's vocabulary in everything you write afterward — it makes your map, plans, and PRs legible to the team.

## 3. Produce the map, then stop

Before editing, state a compact map:
- **Entry points** — where execution starts for this area.
- **Key modules** — the 3-6 that matter, one line each, in the project's vocabulary.
- **The path** — the call/data flow relevant to the task (A → B → C).
- **Hotspots** — the most complex / highest-fan-in pieces you'll be near (handle with extra care).

If you're lost, **zoom out one layer**: ask for a map of the relevant modules and their callers rather than diving deeper into one file.

## When to skip
A localized edit in code you already understand doesn't need a mapping pass. This is for unfamiliar territory or changes with non-obvious blast radius. Pair with `forge:architect` (designing new shape) or `forge:debug` (tracing a failure).
