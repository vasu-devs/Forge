---
name: brainstorm
description: Turn a vague idea into an approved, written spec before any code is written. Use before building a feature, adding functionality, or changing behavior — whenever the work is more than a trivial mechanical edit and the requirements aren't already pinned down.
---

# Brainstorm to an approved spec

Most failed work isn't bad code — it's the wrong thing built confidently. This skill closes the gap between what the user said and what they meant, *before* a line is written.

## The method: grill, don't interview

- **One question at a time.** A wall of questions gets shallow answers. Ask the single highest-leverage question, get the answer, then ask the next.
- **Always propose your own recommended answer** with a one-line why. Make it easy for the user to say "yes" or "no, because…" — don't offload all the thinking onto them.
- **Explore the code to answer your own questions** whenever you can, instead of asking. Asking what you could have discovered wastes the user's time.
- **Surface trade-offs and disagreements.** If the user's framing has a tension or a simpler alternative exists, say so now.
- Walk every branch of the decision tree until there's nothing material left unresolved.

## The HARD GATE

Do **not** write implementation code, edit files, or jump to a plan until the user has approved a written spec. This gate is the whole point — it's the cheapest place to be wrong. When you think "this is simple enough to just build," that's exactly when a 2-minute spec saves an hour.

Present the spec in **digestible sections** (problem, scope, approach, what's explicitly out of scope, success criteria) and get sign-off section by section, not as one giant block.

## Capture decisions as you go (don't batch)

- Maintain a **CONTEXT.md glossary** of the project's terms — definitions only, *no implementation details*. When a term gets pinned down, update it immediately.
- Record an **ADR** (architecture decision record) only when **all three** hold: the decision is hard to reverse, it would be surprising to a newcomer without context, and it's the result of a real trade-off. Otherwise an ADR is noise.
- Durable artifacts contain **no file paths or line numbers** — they rot. Describe behavior, not locations.

## Exit
When the spec is approved, hand off to `forge:plan` — not directly to coding. Brainstorm decides *what* and *why*; plan decides *the steps*.
