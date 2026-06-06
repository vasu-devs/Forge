---
name: design-ui
description: Build or redesign frontend UI that doesn't look templated or AI-generated. Use when creating components, pages, landing pages, or restyling existing UI — before writing CSS/markup, and before shipping any visual work.
---

```
██████╗ ███████╗███████╗██╗ ██████╗ ███╗   ██╗      ██╗   ██╗██╗
██╔══██╗██╔════╝██╔════╝██║██╔════╝ ████╗  ██║      ██║   ██║██║
██║  ██║█████╗  ███████╗██║██║  ███╗██╔██╗ ██║█████╗██║   ██║██║
██║  ██║██╔══╝  ╚════██║██║██║   ██║██║╚██╗██║╚════╝██║   ██║██║
██████╔╝███████╗███████║██║╚██████╔╝██║ ╚████║      ╚██████╔╝██║
╚═════╝ ╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝       ╚═════╝ ╚═╝
```

# Design UI with taste (anti-slop)

Default AI design fails because it reaches for statistical clichés. This skill replaces "looks fine" with deliberate, checkable taste. The premise: bad AI UI is *predictable*, so the fixes can be mechanical.

## Start with a Design Read + dials
Before any markup, state one line: *"Reading this as a `<page kind>` for `<audience>`, vibe `<word>`, leaning `<direction>`."* Then set three dials (1-10) and let them drive choices:
- **DESIGN_VARIANCE** — low = clean/centered; high = asymmetric/editorial
- **MOTION_INTENSITY** — low = hover/focus transitions only; mid = entrance + scroll reveals; high = scroll-scrub/parallax/magnetic
- **VISUAL_DENSITY** — low = spacious; high = dense dashboard

The dials are **constraints, not decoration** — let the value gate the technique: `MOTION_INTENSITY ≤ 3` → no scroll-jacking/parallax, hover/focus only; `VISUAL_DENSITY ≤ 3` → generous whitespace, one primary action per view. If a choice violates its dial, change the choice.

## Commit to one direction
Pick a single aesthetic and execute it fully — minimalist editorial (Notion/Linear), high-end agency, brutalist/industrial, etc. Averaging directions produces mush. If the user hasn't chosen, propose one with rationale.

## Mechanically-checkable anti-slop bans
These are the AI tells; treat them as hard checks, not suggestions:
- **No em-dash in UI copy.** Binary ban — not "use sparingly." (Em-dashes are the #1 AI-text tell.)
- **No Inter/Roboto as the default font**, and no system-font-stack-by-default. Use ≥2 deliberate weights/sizes from a stated type scale (name the ratio, e.g. 1.25).
- **No AI-purple / generic gradient-on-white hero.** No `#8B5CF6`-family default gradients.
- **No three-equal-cards row** as the default content layout.
- **Eyebrow restraint:** at most ~1 uppercase-tracked "eyebrow" label per 3 sections. Count them; if more, cut.
- **Kill the cheap defaults — by rendered property, not framework class:** no hairline neutral-gray 1px border on every surface; no single uniform low-opacity drop shadow on everything (`shadow-md`-equivalent); no default `linear`/`ease-in-out` timing. Use intentional borders, layered/soft shadows, and ≥1 custom easing or spring. (Tailwind names are just examples — the rule is the *rendered property*, so it applies equally on vanilla CSS, styled-components, SwiftUI, etc.)

## Verify visually — never ship CSS blind
Render the real view (dev-preview harness + headless browser / Playwright with system Chrome), then **re-read the screenshots** — don't infer from CSS. Make it a mechanical gate: capture at **390 / 768 / 1280 px** widths, save to a scratch dir, and forbid "done" unless those files exist *and you've inspected them* for spacing, hierarchy, contrast, overflow, and small-screen fit. A screenshot you never open is not verification. (This is `forge:verify` applied to pixels.)

## Pre-flight gate
Before "done," tick: direction committed · type deliberate · spacing rhythm consistent · hierarchy clear · states (hover/focus/empty/error) handled · responsive checked · **text contrast ≥ 4.5:1 (WCAG AA) on the rendered output** · **visible focus ring on every interactive element** · **all motion gated behind `prefers-reduced-motion: no-preference`** · all bans above honestly clear · rendered-and-eyeballed. If any box can't be honestly ticked, it isn't finished.

## Note
For *reference-image-first* workflows (generate comps, then build to match), the `tasteskill:imagegen-*` and `tasteskill:image-to-code` skills complement this — this skill is the code-side taste enforcer.
