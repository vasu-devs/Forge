---
name: brainstorm
description: Turn a vague idea into an approved, written spec before any code is written. Use before building a feature, adding functionality, or changing behavior — whenever the work is more than a trivial mechanical edit and the requirements aren't already pinned down.
---

```
██████╗ ██████╗  █████╗ ██╗███╗   ██╗███████╗████████╗ ██████╗ ██████╗ ███╗   ███╗
██╔══██╗██╔══██╗██╔══██╗██║████╗  ██║██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗████╗ ████║
██████╔╝██████╔╝███████║██║██╔██╗ ██║███████╗   ██║   ██║   ██║██████╔╝██╔████╔██║
██╔══██╗██╔══██╗██╔══██║██║██║╚██╗██║╚════██║   ██║   ██║   ██║██╔══██╗██║╚██╔╝██║
██████╔╝██║  ██║██║  ██║██║██║ ╚████║███████║   ██║   ╚██████╔╝██║  ██║██║ ╚═╝ ██║
╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝
```

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

Present the spec in **digestible sections** — problem, scope, approach, **risks & assumptions** (a 30-second pre-mortem: "assume this shipped and failed; top 2-3 reasons"), what's explicitly out of scope, and success criteria — and get sign-off section by section, not as one giant block.

**"Approved" is mechanical, not inferred.** Approval = the user affirmatively says yes to the section you explicitly presented. Silence, an "ok" aimed at something else, a fresh question, or a topic change is **not** approval — if unsure, ask "Approve this section?" verbatim and wait. Assuming consent from a non-answer is the rationalization this gate exists to forbid.

## Capture decisions as you go (don't batch)

- Maintain a **CONTEXT.md glossary** of the project's terms — definitions only, *no implementation details*. When a term gets pinned down, update it immediately.
- Record an **ADR** (architecture decision record) only when **all three** hold: the decision is hard to reverse, it would be surprising to a newcomer without context, and it's the result of a real trade-off. Otherwise an ADR is noise.
- Durable artifacts contain **no file paths or line numbers** — they rot. Describe behavior, not locations.

## Exit
**Write the approved spec to a file** (e.g. `docs/specs/<feature>.md`, or as the header of the plan) so `forge:plan` consumes an artifact, not scrollback — durable facts belong in files, not fragile conversation memory. Then hand off to `forge:plan`, not directly to coding. Brainstorm decides *what* and *why*; plan decides *the steps*.
