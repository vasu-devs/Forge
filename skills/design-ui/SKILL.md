---
name: design-ui
description: Build or redesign frontend UI that doesn't look templated or AI-generated. Use when creating components, pages, landing pages, or restyling existing UI — before writing CSS/markup, and before shipping any visual work.
---

# Design UI with taste (anti-slop)

Default AI design fails because it reaches for statistical clichés. This skill replaces "looks fine" with deliberate, checkable taste. The premise: bad AI UI is *predictable*, so the fixes can be mechanical.

## Start with a Design Read + dials
Before any markup, state one line: *"Reading this as a `<page kind>` for `<audience>`, vibe `<word>`, leaning `<direction>`."* Then set three dials (1-10) and let them drive choices:
- **DESIGN_VARIANCE** — low = clean/centered; high = asymmetric/editorial
- **MOTION_INTENSITY** — low = hover only; high = scroll/scrub/magnetic
- **VISUAL_DENSITY** — low = spacious; high = dense dashboard

## Commit to one direction
Pick a single aesthetic and execute it fully — minimalist editorial (Notion/Linear), high-end agency, brutalist/industrial, etc. Averaging directions produces mush. If the user hasn't chosen, propose one with rationale.

## Mechanically-checkable anti-slop bans
These are the AI tells; treat them as hard checks, not suggestions:
- **No em-dash in UI copy.** Binary ban — not "use sparingly." (Em-dashes are the #1 AI-text tell.)
- **No Inter/Roboto as the default font**, and no system-font-stack-by-default. Choose type deliberately.
- **No AI-purple / generic gradient-on-white hero.** No `#8B5CF6`-family default gradients.
- **No three-equal-cards row** as the default content layout.
- **Eyebrow restraint:** at most ~1 uppercase-tracked "eyebrow" label per 3 sections. Count them; if more, cut.
- **Kill the cheap defaults:** generic 1px gray borders everywhere, `shadow-md` on everything, and `linear`/`ease-in-out` transitions. Use intentional borders, layered/soft shadows, and custom easing/springs.

## Verify visually — never ship CSS blind
Render the real view and *look at it* (a dev-preview harness + headless browser / Playwright with system Chrome) before declaring it done. Check spacing, hierarchy, contrast, overflow, and small-screen fit on the actual rendered output — not from reading the CSS. (This is `forge:verify` applied to pixels.)

## Pre-flight gate
Before "done," tick: direction committed · type deliberate · spacing rhythm consistent · hierarchy clear · states (hover/focus/empty/error) handled · responsive checked · all bans above honestly clear · rendered-and-eyeballed. If any box can't be honestly ticked, it isn't finished.

## Note
For *reference-image-first* workflows (generate comps, then build to match), the `tasteskill:imagegen-*` and `tasteskill:image-to-code` skills complement this — this skill is the code-side taste enforcer.
