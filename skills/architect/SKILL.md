---
name: architect
description: Design the shape of a non-trivial module, API, or system before implementing it. Use when a design decision has more than one reasonable answer, when introducing a new abstraction or interface, or when getting the shape wrong would be expensive to undo.
---

# Architect the shape first

Code is easy to write and hard to reshape. The interface you choose outlives the implementation. This skill produces a deliberate design instead of the first one that compiles.

## 1. Search before you build

Before designing anything custom, decide where this work belongs on the ladder:
- **Adopt** — a library/tool already does this well. Use it.
- **Extend** — something close exists; extend it.
- **Compose** — combine existing pieces.
- **Build** — only when the above genuinely don't fit.

Check package registries, the existing codebase, and installed skills/MCP tools first. Report what you found and why you're building rather than adopting. Most "new" problems are solved problems.

## 2. Design it twice (at least)

Never ship the first design. Generate **2-3 genuinely different** designs, each forced apart by a *different constraint*:
- minimize the interface surface
- maximize flexibility
- optimize the common case
- imitate a known, well-understood paradigm

If subagents are available, dispatch them in parallel — one design each — so the options don't converge. Then compare.

## 3. Judge on depth, not effort

- A **deep** interface is small but hides significant complexity (good). A **shallow** one is a large surface over a thin implementation (bad — it just relocates complexity onto callers).
- Optimize for **ease of correct use** and **hardness of misuse**.
- Do **not** rank designs by how much code they take to implement — that's the cheapest part and the wrong axis.

## 4. Earn every abstraction

- **Deletion test:** imagine deleting this module. If the same complexity reappears, duplicated across N callers, the module earned its place. If not, you're abstracting for its own sake — don't.
- **Two-adapter rule:** one adapter is a *hypothetical* seam; two real adapters prove a seam exists. Don't introduce an interface for a single implementation "in case." (This is `shunya:principles` #2 applied to structure.)

## 5. Name and record

- Name every concept in the project's **ubiquitous language** — one canonical term per idea, aliases explicitly retired. Update CONTEXT.md.
- Record an **ADR** only when the decision is hard to reverse *and* surprising without context *and* a real trade-off. Capture the *decision and why*, not file locations (those rot).

## Exit
Hand the chosen shape to `shunya:plan` to break into vertical slices, then `shunya:tdd` to build.
