# The Journey — Design System

> a birthday gift told as a short interactive film: a sequence of quiet questions, a fall into darkness, then a world turning slowly beneath you until it finds the one place that matters

**Theme:** dark

The Journey is a cinematic interactive birthday gift, not a website. It opens as a sequence of fullscreen questions on a near-black stage, almost nothing visible but oversized typography and a breath of negative space. As the sequence advances the interface grows quieter and more mysterious — fewer words, more darkness — until it dissolves into a starfield and a real-time 3D Earth. Scroll becomes the camera: the globe turns toward a sequence of countries, each one a beat in the reveal, until it settles on the actual destination and the gift — a trip — is spoken plainly. Typography is monolithic and weightless, PPNeueMontreal at weight 400 carrying every headline through scale rather than boldness, exactly as in the reference system. What changes is the palette's temperature: a restrained violet governs the intimate question phase, a cool atmospheric blue takes over once space and the Earth appear, and a soft champagne/gold arrives only at the very end, for the reveal itself. Nothing is decorative. Every color, every motion, every component exists to move the story forward.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Canvas | `#06060a` | `--color-canvas` | Base stage for every scene — a near-black cinematic void (not corporate pure black), the constant beneath all five phases |
| Canvas Elevated | `#111118` | `--color-canvas-elevated` | The one exceptional raised surface — the translucent panel behind Gift Reveal copy or an Earth Scene Overlay scrim, used sparingly, never a default container |
| Text Primary | `#f3ede4` | `--color-text-primary` | Warm off-white — question copy, destination names, reveal headlines; the only color carrying full typographic weight |
| Text Secondary | `#9a97a6` | `--color-text-secondary` | Muted cool gray — supporting body copy, gift reveal sub-text, anything meant to recede just behind primary text |
| Text Tertiary | `#6f6c7a` | `--color-text-tertiary` | Quietest readable gray — progress indicator, scroll hint, captions, coordinates; present but never competing for attention |
| Accent Primary | `#8a7cff` | `--color-accent-primary` | Restrained violet — the signature accent of the question phase: chip borders, selection states, cursor-adjacent glow |
| Accent Atmosphere | `#5fc9e8` | `--color-accent-atmosphere` | Cool atmospheric blue/cyan — governs space, the Earth, and the country sequence: markers, route lines, orbit light |
| Accent Reveal | `#e3c081` | `--color-accent-reveal` | Soft champagne/gold — reserved for the final destination reveal and the gift reveal; the warmest color in the system, spent once |
| Accent Rose | `#c99b8f` | `--color-accent-rose` | Optional muted warm tone — used extremely sparingly beneath the gift reveal for a single point of human warmth; never a dominant color, never pink |
| Border Subtle | `rgba(243, 237, 228, 0.10)` | `--color-border-subtle` | Hairline dividers and chip edges at rest — barely visible, present only to give floating elements a faint edge |

**Glow** — soft radial emphasis used in place of shadows; each is tied to one accent and one phase.

| Name | Value | Token | Role |
|------|-------|-------|------|
| Glow Primary | `rgba(138, 124, 255, 0.32)` | `--glow-primary` | Halo behind a selected Answer Chip or an active focal word during the question phase |
| Glow Atmosphere | `rgba(95, 201, 232, 0.35)` | `--glow-atmosphere` | Halo around Country Markers, Route Highlights, and the Earth's lit edge |
| Glow Reveal | `rgba(227, 192, 129, 0.35)` | `--glow-reveal` | Halo behind the Final Destination Reveal and Gift Reveal headline — the single warmest glow in the system |

**One family governs each phase.** Questions run on monochrome + Accent Primary. Space and the Earth run on Accent Atmosphere with Accent Primary held in reserve. The destination reveal and gift reveal run on Accent Reveal, with Accent Rose permitted only as a whisper beneath the closing message. Do not mix accent families within a single scene.

## Tokens — Typography

### PPNeueMontreal — single typeface across the entire experience. Display sizes (78–113px) carry the intro title and the two major reveals at weight 400 with tight negative tracking, so the most important words in the piece feel sculptural rather than read. Weight 200 is reserved for the few lines of body copy that exist (gift reveal support line, any narrative aside) — a deliberately airy, non-aggressive register against so much darkness. Weight 600 at 14px with 0.35px tracking, uppercase, serves only the progress indicator and country-marker labels: the smallest, quietest text in the system. Hierarchy is built entirely from scale, never from boldness — no heading in this project should ever be weight 700. · `--font-ppneuemontreal`
- **Substitute:** Inter, ui-sans-serif, system-ui
- **Weights:** 200 (light), 400 (regular), 600 (semibold)
- **Sizes:** 12, 14, 18, 24, 27, 36, 42, 48, 78, 113px
- **Line height:** 1.0, 1.1, 1.2, 1.25, 1.5
- **Letter spacing:** -4.52px at 113px, -3.12px at 78px, -1.68px at 48/42px, -0.48px at 24px, 0.35px at 14px (uppercase), normal at 18/27/36px
- **OpenType features:** `"ss01" on`

### Type Scale

Every size below is inherited unchanged from the source system — only the semantic role changed, so hierarchy stays exactly as tested.

| Role | Size | Line Height | Tracking | Token | Used for |
|------|------|-------------|----------|-------|----------|
| micro | 12px | 1.5 | normal | `--text-micro` | Scroll Hint, fine print |
| label | 14px | 1.2 | 0.35px | `--text-label` | Progress Indicator, Country Marker label (uppercase) |
| body | 18px | 1.5 | normal | `--text-body` | Gift Reveal supporting line, any narrative aside |
| answer | 24px | 1.25 | -0.48px | `--text-answer` | Answer Chip text |
| waypoint | 27px | 1.0 | normal | `--text-waypoint` | Compact Destination Label, Country Marker caption |
| transition | 36px | 1.2 | normal | `--text-transition` | Transition Message (default), Earth Scene Overlay copy |
| question | 42px | 1.2 | -1.68px | `--text-question` | Question Screen headline |
| destination | 48px | 1.1 | -1.68px | `--text-destination` | Destination Label (default scale) |
| reveal | 78px | 1.1 | -3.12px | `--text-reveal` | Final Destination Reveal, Intro subtitle, large Transition Message |
| display | 113px | 1.1 | -4.52px | `--text-display` | Intro Title Block, Gift Reveal headline |

## Tokens — Spacing & Shapes

**Base unit:** 6px

**Density:** spacious — one or two elements visible per scene, never information-dense

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 6 | 6px | `--spacing-6` |
| 12 | 12px | `--spacing-12` |
| 18 | 18px | `--spacing-18` |
| 24 | 24px | `--spacing-24` |
| 30 | 30px | `--spacing-30` |
| 36 | 36px | `--spacing-36` |
| 60 | 60px | `--spacing-60` |
| 96 | 96px | `--spacing-96` |
| 120 | 120px | `--spacing-120` |

### Border Radius

| Element | Value | Token | Role |
|---------|-------|-------|------|
| markers & indicators | 9999px | `--radius-full` | Country Marker dot, scroll hint dot, any tiny circular point |
| answer chip | 16px | `--radius-answer` | Answer Chip / Answer Button — soft rounded rectangle, deliberately short of a full pill |
| elevated surface | 24px | `--radius-surface` | The one exceptional translucent panel (Gift Reveal, Earth Scene Overlay scrim) |

### Layout

- **Content max-width:** 640px — bounds question, transition, and gift-reveal text blocks for readability against full-bleed scenes
- **Scene padding:** 96px — safe inset between scene content and the viewport edge (reduces on mobile, see Responsive)
- **Element gap:** 18px — default spacing between a headline and what follows it (chips, caption, scroll hint)

## Motion

Motion is not decoration here — it is the narrative engine. The experience is felt through pacing as much as through words.

### Principles

- **Scene transitions** — cross-fade with a gentle blur pass (4–8px) and a slight scale (0.98 → 1), `--duration-scene` (1200ms), `--ease-cinematic`. Never a hard cut, never a slide.
- **Text entrances/exits** — opacity + 8–12px translateY, staggered 60–100ms per line when multiple lines appear together, `--duration-text` (600ms), `--ease-cinematic`. Exits are the mirror of entrances, slightly faster.
- **Question changes** — outgoing question and its chips fade/blur out first; the next question does not begin entering until the stage is empty. No overlap, no crossfire between two questions.
- **Answer selection** — immediate, tactile, small: border brightens to Accent Primary, `--glow-primary` blooms softly, background washes to `--surface-answer-selected`. `--duration-micro` (200ms), `--ease-standard`. No bounce, no scale-pop.
- **Fade into space** — the slowest transition in the piece: canvas darkens, UI chrome dissolves, stars fade in beneath, all over 2–3× `--duration-cinematic`. This is the hinge of the whole experience and should feel inevitable, not sudden.
- **Scroll-linked transitions** — Earth rotation, camera distance, marker reveals, and route-line draw-on are all driven directly by scroll progress (not by time), so the user's own pace controls the film. Motion should track scroll 1:1 with light easing smoothing only, never decoupled or auto-advancing.
- **Earth camera movement** — slow orbital drift and distance change only; no whip-pans, no roll. `--duration-cinematic` (2400ms) per major camera beat, `--ease-cinematic`.
- **Destination transitions** — as the camera settles on a new country: marker fades in first, route line draws on, destination label enters last with the text-entrance pattern above. Sequential, not simultaneous.
- **Final reveal** — the slowest, most deliberate beat in the system. Accent Reveal glow blooms in gradually beneath the display headline; nothing else moves on screen at the same time.

### Avoid
- Bouncing, springy easing, or SaaS-style microinteractions
- Parallax applied everywhere by default
- Animation running on every element simultaneously
- Fast, flashy, game-like transitions

### Prefer
- Opacity, gentle blur, translate, scale — in that order of frequency
- Camera movement and controlled depth over UI motion
- Carefully timed stagger over simultaneous reveal
- Subtle glow changes over hard state changes

### `prefers-reduced-motion`
When set, replace translate/blur/camera-drift transitions with plain opacity cross-fades at a shortened duration (≈150ms), disable scroll-linked camera drift in favor of discrete scroll-triggered steps, and keep the Ambient Star Field and Route Highlight static rather than animated. The narrative sequence and every reveal must still occur — only the motion carrying it is reduced.

## Components

### Intro Title Block
**Role:** The first thing the user sees — a large, centered cinematic title composition that opens the experience

Centered on `--color-canvas`, no other UI visible. Title at `--text-display` (113px, clamped down on smaller viewports), weight 400, `--color-text-primary`, tight negative tracking. An optional single-line kicker above it at `--text-label`, `--color-text-tertiary`, uppercase. A Scroll Hint anchors the bottom of the viewport. Nothing else on screen.

### Question Screen
**Role:** Fullscreen composition for each question in the sequence, with almost no visible UI

Centered or slightly off-center on `--color-canvas`. Question text at `--text-question` (42px) by default, weight 400, `--color-text-primary`. A Progress Indicator sits quietly in a corner. Answer Chips are arranged below the question with `--element-gap` spacing. No borders, no card, no background panel — text and chips float directly on the void.

### Answer Button / Answer Chip
**Role:** A minimal, tactile choice — not a form control

Text at `--text-answer` (24px), weight 400, `--color-text-primary`. Shape: `--radius-answer` (16px), a soft rounded rectangle, not a pill. Rest state: transparent fill, 1px `--color-border-subtle` edge. Hover: border brightens toward `--color-accent-primary` at reduced opacity, faint `--glow-primary`. Selected: fill washes to `--surface-answer-selected`, border solidifies to `--color-accent-primary`, `--glow-primary` blooms. Touch target minimum 44px tall regardless of visual text size.

### Progress Indicator
**Role:** A very subtle current-question marker, e.g. `02 / 06` — illustrative only; the total always reflects the actual number of questions, never a fixed count

`--text-label` (14px), weight 600, uppercase-style tracking, `--color-text-tertiary` at reduced opacity (~0.6). No background, no border, no icon. Fixed in a single corner across every question in the sequence so it never redraws attention by moving. It must never be the largest or brightest thing in the scene.

### Transition Message
**Role:** A short fullscreen line of text used between major narrative phases (e.g. entering the space sequence)

Centered on `--color-canvas`, using `--text-transition` (36px) for standard beats or `--text-reveal` (78px) for the heaviest ones (e.g. the line just before the fall into space). Weight 400, `--color-text-primary`. Appears alone, holds briefly, and dissolves — never accompanied by other UI.

### Scroll Hint
**Role:** The minimum possible indication that scrolling continues the experience

`--text-micro` (12px), `--color-text-tertiary`, low opacity, paired with a thin vertical line or small chevron that pulses gently. Bottom-center by default. Present only where a scroll action is actually expected next; removed once the user has started scrolling.

### Earth Scene Overlay
**Role:** Typography and UI rules for text layered above the real-time WebGL Earth

Uses `--text-transition`, `--text-destination`, or `--text-reveal` depending on the beat, always `--color-text-primary` with `--color-accent-atmosphere` permitted for small supporting labels (coordinates, flight-line captions). If contrast against the globe is insufficient, add a soft vertical scrim using `--color-canvas-elevated` at low opacity behind the text block only — never a full-width panel, and only as a last resort for legibility.

### Country Marker
**Role:** A minimal geographic point on the globe

A small filled dot, `--radius-full`, ~6–8px, `--color-accent-atmosphere` fill with a soft `--glow-atmosphere` halo. Pulses gently while idle at a stop; on approach it brightens rather than growing in size.

### Destination Label
**Role:** Country/city name typography during the globe sequence

`--text-destination` (48px) by default, scaling up to `--text-reveal` (78px) for major stops. Weight 400, `--color-text-primary`, tight tracking. A small caption beneath in `--text-waypoint` or `--text-label`, `--color-text-tertiary` — coordinates, a date, or a short phrase — never a full sentence.

### Route Highlight
**Role:** Visual language for movement between destinations on the globe

A thin (1px) arced line in `--color-accent-atmosphere` at reduced opacity (~0.4–0.6), following the globe's curvature between two markers, with a soft `--glow-atmosphere` outer edge. Draws on progressively as the camera travels, rather than appearing instantly.

### Final Destination Reveal
**Role:** The major cinematic reveal of the real destination — the peak of the experience

`--text-display` (113px), weight 400, `--color-accent-reveal` or `--color-text-primary` with `--glow-reveal` blooming behind it. This is the first and only moment `--color-accent-reveal` is used at full typographic scale. Everything else on screen goes quiet — no marker, no route line, no progress indicator — to let this stand alone.

### Gift Reveal
**Role:** The emotional closing message explaining that the gift is a trip

Headline at `--text-display` or `--text-reveal`, `--color-text-primary`, followed by one supporting line at `--text-body` (18px, weight 200), `--color-text-secondary`. `--color-accent-reveal` may tint a single word or the supporting glow; `--color-accent-rose` may appear once, faintly, beneath the closing line — never as the dominant color. If a surface is needed for legibility, this is the one place `--color-canvas-elevated` + `--color-border-subtle` + `--radius-surface` may form a translucent panel — used exceptionally, not as a default pattern.

### Ambient Star Field
**Role:** Background atmosphere for the space and Earth scenes — supporting imagery, never the primary content

Sparse procedural points, mostly `--color-text-tertiary` or white at low, varying opacity (0.2–0.6), density increasing gradually as the fade-into-space transition completes. Occasional larger points carry a faint `--glow-atmosphere` tint. Sits behind all typography and the Earth itself, and must never reduce foreground text contrast.

## Do's and Don'ts

### Do
- Set every headline at weight 400, never bold — hierarchy comes from scale (up to 113px) and tracking, exactly as in the source system
- Use `--color-canvas` (`#06060a`) as the constant base of every scene — a near-black cinematic void, not corporate pure black
- Let one accent family govern each phase: violet for questions, atmospheric blue for space/Earth, champagne/gold for the two reveals
- Reserve `--color-accent-reveal` for the Final Destination Reveal and Gift Reveal only — spending it earlier weakens the payoff
- Use glow (`--glow-primary`, `--glow-atmosphere`, `--glow-reveal`) in place of shadows for emphasis — this system has no drop shadows
- Keep Answer Chips at `--radius-answer` (16px), short of a full pill, so they read as elegant rather than as generic form controls
- Drive Earth rotation, markers, and route lines directly from scroll progress so the user controls pace

### Don't
- Do not use `--color-accent-reveal` or its glow anywhere before the destination and gift reveals — it must feel earned
- Do not set headline text below weight 400, and never introduce weight 700 — this system deliberately has no bold
- Do not introduce card containers, borders, or shadows as a default pattern — content floats on the canvas; the one exception is the Gift Reveal's optional translucent panel
- Do not mix accent families within a single scene (e.g. violet chip glow inside the Earth sequence)
- Do not animate more than one major element at a time during a transition — sequence, don't simultaneously stack, motion
- Do not let the Progress Indicator, Scroll Hint, or any caption-scale element grow larger or brighter than the scene's primary text
- Do not add bounce, spring, or scale-pop to any interaction — every motion curve in this system is `--ease-cinematic` or `--ease-standard`

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Canvas | `#06060a` | The constant base of every scene, across all five phases |
| 1 | Elevated Surface | `#111118` | The one exceptional translucent panel — Gift Reveal legibility backing, Earth Scene Overlay scrim |
| Interactive | Answer Selected | `rgba(138, 124, 255, 0.12)` | Wash behind a selected Answer Chip only |

## Elevation

This system uses no drop shadows. Hierarchy and emphasis come from scale, color temperature, and glow — never from cast shadow. Where a shadow-like effect is needed (a selected chip, a marker, a reveal headline), use the matching `--glow-*` token as a soft radial halo instead. The one exception to "content floats directly on the canvas" is the Gift Reveal's optional translucent panel (`--color-canvas-elevated` + `--color-border-subtle` + `--radius-surface`), used only when legibility genuinely requires it, never as a default container.

## Imagery

Imagery is atmospheric and in service of the narrative, never decorative for its own sake. The Ambient Star Field is procedural and supporting — sparse, low-opacity points, never competing with foreground typography. The real-time 3D Earth is the hero visual of the experience's second half: it should read as tangible and slowly alive, lit with cool atmospheric light, not stylized or cartoonish. Cinematic destination photography and Higgsfield-generated visual assets may appear briefly around a Destination Label or the Final Destination Reveal to ground a place in reality — treated as fleeting, high-quality fragments, not galleries or hero banners. Short cinematic video may be used the same way, sparingly, at moments of maximum emotional weight (the final reveal, the gift reveal). No product screenshots, no illustration, no particle-brain or abstract "intelligence" visualization of any kind — every image in this system points at a real place or a real feeling.

## Layout

Primarily fullscreen and scene-based — this project is not built from ordinary page sections, and most important scenes occupy approximately one viewport. Compositions draw from a small set of patterns: centered typography (Intro Title, Transition Message, Final Destination Reveal), slightly off-center editorial typography (Question Screen), foreground text over a WebGL background (Earth Scene Overlay, Destination Label), and large negative space around one dominant focal element. `--content-max-width` (640px) bounds text blocks for readability without ever constraining the full-bleed backgrounds behind them. The Earth scene is explicitly designed to be pinned, with scroll progress driving camera position, marker reveals, and route-line animation — this system supports scroll-driven storytelling as a first-class layout mode, not an add-on. Density stays extremely spacious throughout: one or two elements visible per scene, never a grid, never a dashboard.

## Responsive Behavior

The experience must hold its cinematic quality on desktop, laptop, and mobile portrait alike — mobile is not a scaled-down desktop layout.

- **Typography:** use `clamp()` for every display-scale role (`--text-display`, `--text-reveal`, `--text-destination`) so headlines shrink intelligently rather than overflowing or forcing horizontal scroll — e.g. `clamp(2.5rem, 12vw, 7.0625rem)` for `--text-display`. Body, answer, and label sizes may stay closer to fixed since they're already small.
- **Spacing:** reduce `--scene-padding` toward `--spacing-36`–`--spacing-60` on mobile portrait rather than keeping the full 96px inset.
- **Touch targets:** Answer Chips and any interactive element must stay at least 44px tall on touch devices, even where the visual text is small.
- **Effects:** reduce Ambient Star Field density and disable or shrink blur-based transitions on lower-powered devices; the Earth's glow and route-line effects should degrade gracefully rather than dropping the WebGL scene entirely.
- **Narrative order:** the full Intro → Questions → Transition → Space → Earth → Destination → Gift sequence must be preserved exactly on every viewport — nothing is reordered or cut for mobile.
- **WebGL overlays:** Earth Scene Overlay text must remain legible at every breakpoint; prefer the `--color-canvas-elevated` scrim fallback described in that component over shrinking text past `--text-waypoint`.

## Design Progression

The mood shifts continuously across five phases — it should feel like one film, not five different sites stitched together.

**Phase 1 — Questions:** quiet, dark, restrained, intimate. Monochrome (`--color-canvas`, `--color-text-primary/secondary`) with `--color-accent-primary` as the only color accent, used solely on chip interaction.

**Phase 2 — Transition:** increasing darkness, UI chrome recedes further, the first stars appear faintly. Still monochrome + violet, but violet begins to fade out as the canvas darkens toward black.

**Phase 3 — Earth:** deep space, cool atmospheric light, real scale and depth. `--color-accent-atmosphere` takes over completely; violet is fully retired for the remainder of the experience.

**Phase 4 — Destination:** more geographic detail, stronger visual focus per stop. Still `--color-accent-atmosphere`-led, with `--glow-atmosphere` intensifying as the camera nears the final country.

**Phase 5 — Gift reveal:** warmer light, `--color-accent-reveal` emphasis, emotional resolution. The only phase where gold appears, and the only place `--color-accent-rose` may whisper in beneath the closing line.

Each phase transition (Motion section, "Fade into space") should carry the color temperature change gradually — violet cooling into blue, blue warming into gold — so no cut ever feels like a jump to a different product.

## Agent Prompt Guide

### Quick Color Reference
- Text: `#f3ede4` (primary), `#9a97a6` (secondary), `#6f6c7a` (tertiary)
- Canvas: `#06060a` (base), `#111118` (elevated — exceptional use only)
- Border: `rgba(243, 237, 228, 0.10)` — hairline only, never a heavy stroke
- Accent — questions: `#8a7cff` (violet)
- Accent — space/Earth: `#5fc9e8` (atmospheric blue)
- Accent — reveals: `#e3c081` (champagne/gold), `#c99b8f` (rose, extremely sparing)

### Example Component Prompts

1. **Question Screen**: Full-bleed `#06060a` canvas. Centered question text at 42px PPNeueMontreal weight 400, `#f3ede4`, letter-spacing -1.68px, reading 'What's the first place that comes to mind when you think of us?' Below it, three Answer Chips in a row with 18px gaps: each a 16px-radius rounded rectangle, transparent fill, 1px `rgba(243,237,228,0.10)` border, text at 24px weight 400 `#f3ede4`. Progress indicator '03 / 06' (illustrative — actual total comes from the question count) fixed bottom-left, 14px weight 600 uppercase, `#6f6c7a` at 60% opacity.

2. **Transition Message**: Full-bleed `#06060a` canvas, nothing else visible. Centered single line at 78px PPNeueMontreal weight 400, `#f3ede4`, letter-spacing -3.12px, reading 'Now close your eyes for a moment.' Fades in over 600ms, holds, fades out into darkness.

3. **Earth Scene Overlay — Destination Label**: Real-time WebGL Earth centered, camera settled on a coastline. Overlaid text, lower-third-left: destination name at 48px weight 400 `#f3ede4`, letter-spacing -1.68px. Caption beneath at 14px weight 600 uppercase `#6f6c7a`, reading coordinates. A single accent-atmosphere marker dot (`#5fc9e8`, 8px, `--radius-full`) glows softly on the globe surface at the corresponding point, connected by a thin `#5fc9e8` route line at 50% opacity to the previous stop.

4. **Final Destination Reveal**: Earth scene dims, camera settles, all markers and route lines fade out. Centered display text at 113px PPNeueMontreal weight 400, `#e3c081`, letter-spacing -4.52px, reading the destination name alone. A soft `rgba(227,192,129,0.35)` glow blooms behind the text over 2.4s. Nothing else on screen.

5. **Gift Reveal**: `#06060a` canvas, warm gold glow ambient in the background. Centered headline at 78px weight 400 `#f3ede4`, reading 'Your gift is a trip.' One supporting line beneath at 18px weight 200 `#9a97a6`, max-width 640px, reading a short personal sentence. `#e3c081` tints a single word in the headline. No card, no border — text floats on the glow.

## Reference Touchpoints

- **Apple Event pages** — cinematic scroll-driven product reveals, fullscreen scene composition, restrained UI in service of pacing rather than navigation
- **A24 title sequences** — oversized, weightless display type carrying emotional tone through scale and timing alone, never through decoration
- **Google Earth Studio** — the real-time-globe-as-hero pattern: camera movement over a 3D world doing the storytelling work that copy would otherwise have to do
- **Bruno Simon–style WebGL portfolios** — scroll or interaction directly driving a 3D scene's camera and state, rather than a scene that merely plays in the background

## Quick Start

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-canvas: #06060a;
  --color-canvas-elevated: #111118;
  --color-text-primary: #f3ede4;
  --color-text-secondary: #9a97a6;
  --color-text-tertiary: #6f6c7a;
  --color-accent-primary: #8a7cff;
  --color-accent-atmosphere: #5fc9e8;
  --color-accent-reveal: #e3c081;
  --color-accent-rose: #c99b8f;
  --color-border-subtle: rgba(243, 237, 228, 0.10);

  /* Glow */
  --glow-primary: rgba(138, 124, 255, 0.32);
  --glow-atmosphere: rgba(95, 201, 232, 0.35);
  --glow-reveal: rgba(227, 192, 129, 0.35);

  /* Surfaces */
  --surface-canvas: var(--color-canvas);
  --surface-elevated: var(--color-canvas-elevated);
  --surface-answer-selected: rgba(138, 124, 255, 0.12);

  /* Typography — Font Families */
  --font-ppneuemontreal: 'PPNeueMontreal', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-micro: 12px;
  --leading-micro: 1.5;
  --text-label: 14px;
  --leading-label: 1.2;
  --tracking-label: 0.35px;
  --text-body: 18px;
  --leading-body: 1.5;
  --text-answer: 24px;
  --leading-answer: 1.25;
  --tracking-answer: -0.48px;
  --text-waypoint: 27px;
  --leading-waypoint: 1;
  --text-transition: 36px;
  --leading-transition: 1.2;
  --text-question: 42px;
  --leading-question: 1.2;
  --tracking-question: -1.68px;
  --text-destination: 48px;
  --leading-destination: 1.1;
  --tracking-destination: -1.68px;
  --text-reveal: 78px;
  --leading-reveal: 1.1;
  --tracking-reveal: -3.12px;
  --text-display: 113px;
  --leading-display: 1.1;
  --tracking-display: -4.52px;

  /* Typography — Weights */
  --font-weight-light: 200;
  --font-weight-regular: 400;
  --font-weight-semibold: 600;

  /* Spacing */
  --spacing-unit: 6px;
  --spacing-6: 6px;
  --spacing-12: 12px;
  --spacing-18: 18px;
  --spacing-24: 24px;
  --spacing-30: 30px;
  --spacing-36: 36px;
  --spacing-60: 60px;
  --spacing-96: 96px;
  --spacing-120: 120px;

  /* Layout */
  --content-max-width: 640px;
  --scene-padding: 96px;
  --element-gap: 18px;

  /* Border Radius */
  --radius-full: 9999px;
  --radius-answer: 16px;
  --radius-surface: 24px;

  /* Motion */
  --duration-micro: 200ms;
  --duration-text: 600ms;
  --duration-scene: 1200ms;
  --duration-cinematic: 2400ms;
  --ease-cinematic: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-canvas: #06060a;
  --color-canvas-elevated: #111118;
  --color-text-primary: #f3ede4;
  --color-text-secondary: #9a97a6;
  --color-text-tertiary: #6f6c7a;
  --color-accent-primary: #8a7cff;
  --color-accent-atmosphere: #5fc9e8;
  --color-accent-reveal: #e3c081;
  --color-accent-rose: #c99b8f;
  --color-border-subtle: rgba(243, 237, 228, 0.10);

  /* Glow */
  --glow-primary: rgba(138, 124, 255, 0.32);
  --glow-atmosphere: rgba(95, 201, 232, 0.35);
  --glow-reveal: rgba(227, 192, 129, 0.35);

  /* Typography */
  --font-ppneuemontreal: 'PPNeueMontreal', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-micro: 12px;
  --leading-micro: 1.5;
  --text-label: 14px;
  --leading-label: 1.2;
  --tracking-label: 0.35px;
  --text-body: 18px;
  --leading-body: 1.5;
  --text-answer: 24px;
  --leading-answer: 1.25;
  --tracking-answer: -0.48px;
  --text-waypoint: 27px;
  --leading-waypoint: 1;
  --text-transition: 36px;
  --leading-transition: 1.2;
  --text-question: 42px;
  --leading-question: 1.2;
  --tracking-question: -1.68px;
  --text-destination: 48px;
  --leading-destination: 1.1;
  --tracking-destination: -1.68px;
  --text-reveal: 78px;
  --leading-reveal: 1.1;
  --tracking-reveal: -3.12px;
  --text-display: 113px;
  --leading-display: 1.1;
  --tracking-display: -4.52px;

  /* Typography — Weights */
  --font-weight-light: 200;
  --font-weight-regular: 400;
  --font-weight-semibold: 600;

  /* Spacing */
  --spacing-6: 6px;
  --spacing-12: 12px;
  --spacing-18: 18px;
  --spacing-24: 24px;
  --spacing-30: 30px;
  --spacing-36: 36px;
  --spacing-60: 60px;
  --spacing-96: 96px;
  --spacing-120: 120px;

  /* Border Radius */
  --radius-full: 9999px;
  --radius-answer: 16px;
  --radius-surface: 24px;

  /* Motion */
  --duration-micro: 200ms;
  --duration-text: 600ms;
  --duration-scene: 1200ms;
  --duration-cinematic: 2400ms;
  --ease-cinematic: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
}
```
