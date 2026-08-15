# ARCHITECTURE — The Journey

This document defines the interaction and scene architecture for the experience described in `DESIGN.md`. No Three.js scene is built here — this is the decision record implementation follows. The Interactive-mode half (Intro through Space Transition) is now implemented, including a mixed story-step content model and a lightweight persistent background; the Cinematic-mode half (Earth journey onward) is still a plan, not code.

Stack: React, TypeScript, Vite, GSAP + `@gsap/react` (installed). ScrollTrigger, Three.js, and React Three Fiber are not installed yet — they belong to the Earth-journey milestone.

## 1. Narrative Flow

The experience has two macro-modes, and the architecture treats the seam between them as a real state transition, not a visual trick:

- **Interactive Mode** (click/tap-driven): Intro → Questions → Empty Beat → Space Transition. Exactly one scene is mounted at a time; advancing is an explicit user action or a short timed pause.
- **Cinematic Mode** (scroll-driven): Earth Journey → Destination Reveal → Gift Reveal → Final Scene. These mount together as one continuous scrollable document; scroll position (not app state) drives what's visible.

The switch from Interactive to Cinematic happens once, at the end of the Space Transition scene, and is one-way — there is no going back to click-driven question UI except via Replay.

**Decision:** Scene 06 (Earth Reveal) and Scene 07 (Earth Approach + Waypoints) from the brief are implemented as a single component, `EarthJourneyScene`, not two. The brief itself asks for "one master normalized progress value from 0 to 1" — splitting Reveal and Approach into separate components would just recreate the WebGL context and mean re-deriving continuity between them. Instead, Earth Reveal is progress `0.00–0.08` of the same pinned timeline. See §8.

**Decision:** Scene 03 (Last Question) is not a separate component either. It's the same `StoryStepScene` rendering the final entry of `story.ts`, distinguished only by an `isFinal` flag that changes pacing/copy treatment (longer hold, no immediate "next" affordance). This is what lets the step count stay fully data-driven — always `story.length`, never a fixed number — without special-casing a "last screen" component.

**Decision:** The interactive sequence is no longer choice-only. `StoryStepScene` renders one of four step types from a discriminated union (`ChoiceStep | TextStep | TaskStep | CodeStep`, `data/story.ts`) through the *same* entrance/exit choreography and progress bookkeeping — only the body content differs per type. This keeps the "outgoing fully out before incoming in" motion contract (§7) from ever forking per step type. See §4 for the data model and §17-equivalent notes below for validation behavior.

**Decision:** The WebGL layer is not owned by any single narrative scene — it is a `PersistentVisualLayer` that mounts once (at `space-transition`) and stays mounted through `earth` and `destination-reveal`, independent of which scene component `ExperienceRouter` is currently showing. See §6 for the full lifecycle; this is what guarantees no WebGL context is ever recreated mid-journey. **This is distinct from `AmbientBackground`** (§6a), the lightweight non-WebGL layer that already runs behind the entire Interactive-mode half — see §6a for how the two relate.

## 2. Scene List

| # | Scene | Mode | Pinned | Purpose |
|---|-------|------|--------|---------|
| S01 | Intro | click | no | Intrigue, mood, invitation to begin |
| S02 | Story Step ×N | click | no | One step at a time — choice, free text, physical task, or code — data-driven from `story.ts` |
| S03 | *(last item of S02, `isFinal`)* | click | no | Emotionally heavier close to the story sequence |
| S04 | Empty Beat | timed | no | Deliberate near-empty pause; no UI |
| S05 | Space Transition | timed/click-to-continue | no | Darkens, stars begin, violet → atmosphere blue |
| S06+S07 | Earth Journey | **scroll** | **yes** | Earth reveal → approach → waypoints → final approach, one progress timeline |
| — | Destination Reveal | scroll | no | Cinematic hinge into a still/video/photo asset slot |
| — | Gift Reveal | scroll | no | "Your gift is a trip." + personal line |
| — | Final Scene | scroll + click | no | Destination, dates, message, optional replay |

## 3. React Component Structure

```
App
├── ExperienceProvider              — state/ExperienceContext.tsx, see §5
│
├── AmbientBackground                — implemented now; persistent non-WebGL layer behind every
│                                        Interactive-mode scene, see §6a
│
├── PersistentVisualLayer            — future (Milestone 2+); owns <EarthCanvas>; mount lifecycle
│    └── EarthCanvas                    keyed to storyPhase, independent of which scene renders — see §6
│         ├── StarField.tsx
│         ├── Earth.tsx
│         ├── CameraRig.tsx
│         ├── RouteLine.tsx
│         └── WaypointMarkers.tsx        — DOM-overlay labels/markers positioned from lat/lng
│
└── ExperienceRouter                 — renders exactly one Interactive scene, OR the Cinematic
                                          document, based on storyPhase
```

```
src/
  app/
    App.tsx                     — mounts ExperienceProvider, AmbientBackground, ExperienceRouter
    ExperienceRouter.tsx         — narrative UI switch, see tree above
  visual/
    AmbientBackground.tsx        — implemented; persistent CSS + Canvas2D background, see §6a
    backgroundPhases.ts           — implemented; derives BackgroundPhase from storyPhase/step, see §6a
    seededRandom.ts                — implemented; deterministic star/grain generation, see §6a
    PersistentVisualLayer.tsx    — future; mount/unmount + visibility lifecycle for the WebGL layer, see §6
  scenes/
    intro/IntroScene.tsx
    story/StoryStepScene.tsx           — implemented; renders choice/text/task/code from story.ts, handles S02 + S03
    story/EmptyBeatScene.tsx           — implemented; S04
    transition/TransitionScene.tsx     — implemented; generic fullscreen-message scene, reused for S05 and any future narrative beat
    earth/EarthPlaceholderScene.tsx    — implemented; temporary Milestone-1 endpoint, see §12
    earth/EarthJourneyScene.tsx        — future; pinned scroll trigger only; does NOT own the canvas, see §6
    destination/DestinationRevealScene.tsx  — future
    gift/GiftRevealScene.tsx                 — future
    closing/FinalScene.tsx                    — future
  components/
    AnswerChip.tsx
    ProgressIndicator.tsx
    TextAnswerInput.tsx           — implemented; shared bottom-line field for TextStep + CodeStep, see §4
    ScrollHint.tsx                 — future
    DestinationLabel.tsx           — future
    AssetSlot.tsx               — future; still/video/photo/placeholder, see §9
    ReplayButton.tsx               — future
  three/                          — future (Milestone 2+)
    EarthCanvas.tsx             — mounted by PersistentVisualLayer, see §6
    Earth.tsx
    StarField.tsx
    AtmosphereGlow.tsx
    RouteLine.tsx
    CameraRig.tsx                — reads progress, drives camera
    WaypointMarkers.tsx           — DOM-overlay labels/markers positioned from lat/lng
  data/
    story.ts                      — implemented; StoryStep discriminated union + getProgress(), see §4
    journey.ts                    — future; geography/narrative content only, see §3 note below and §8
    timeline.ts                    — future; buildTimeline(), converts journey + duration weights into scroll ranges, see §8
  state/
    ExperienceContext.tsx        — phase/step/answers reducer, see §5
  hooks/
    useScrollProgress.ts          — future; wraps a ScrollTrigger, exposes a ref-based progress store
    usePrefersReducedMotion.ts    — implemented
    useMediaQuery.ts               — future
  gsap/
    registerGsap.ts                — plugin registration, called once
  styles/
    global.css                     — imports variables.css from DESIGN.md
public/
  assets/
    destinations/<waypointId>/     — future; empty until Higgsfield assets exist; see §9
```

**Where things live, explicitly (per the brief's checklist):**
- Story-step UI → `scenes/story/StoryStepScene.tsx`, driven entirely by `data/story.ts` (`story.length`, via `getProgress()`, is always the source of truth for the total, never hardcoded).
- Narrative/phase state → `state/ExperienceContext.tsx`.
- GSAP timelines → colocated in each scene via `useGSAP({ scope: ref })`, except the future Earth master timeline, which will live in `hooks/useScrollProgress.ts` + `EarthJourneyScene.tsx`.
- The persistent *lightweight* background → `visual/AmbientBackground.tsx`, mounted once by `App.tsx`, never owned by an individual scene (§6a). The persistent *WebGL* layer (future) → `three/`, mounted once by `PersistentVisualLayer` (§6).
- Scroll progress (future) → computed once, in one `ScrollTrigger`, owned by `EarthJourneyScene`, but written into a store that `PersistentVisualLayer`'s Three.js children read regardless of which scene is currently mounted.
- Destination geography/content (future) → `data/journey.ts`; scroll timing derived separately in `data/timeline.ts` (§8).
- Generated Higgsfield assets (future) → `public/assets/destinations/<waypointId>/` (§9).

## 4. Data Model

```ts
// data/story.ts
interface AnswerOption {
  id: string;
  label: string;
}

interface StoryStepBase {
  id: string;
  eyebrow?: string;
  text: string;
  isFinal?: boolean;              // marks Scene 03 treatment
  continuesProgress?: boolean;     // shares its progress beat with the step before it — see below
}

interface ChoiceStep extends StoryStepBase {
  type: 'choice';
  answers: AnswerOption[];         // 2–4
}

interface TextStep extends StoryStepBase {
  type: 'text';                    // free-form answer, no correct value
  placeholder?: string;
  submitLabel?: string;
}

interface TaskStep extends StoryStepBase {
  type: 'task';                    // a physical action outside the website
  instruction: string;
  continueLabel?: string;
}

interface CodeStep extends StoryStepBase {
  type: 'code';                    // validated free-text answer (e.g. a clue's payoff word)
  placeholder?: string;
  acceptedAnswers: string[];        // never rendered to the DOM; compared only after normalizeAnswer()
  incorrectMessage?: string;
  hint?: string;
  submitLabel?: string;
}

export type StoryStep = ChoiceStep | TextStep | TaskStep | CodeStep;
export type Story = StoryStep[]; // length 4–8, never hardcoded elsewhere

export function normalizeAnswer(value: string): string; // trim + lowercase + collapse whitespace
export function getProgress(steps: StoryStep[], index: number): { current: number; total: number };
```

`getProgress()` is what makes step-sharing possible: a step marked `continuesProgress` doesn't increment the displayed count, so a `TaskStep` + `CodeStep` pair that represent one physical clue can read as a single beat (e.g. `04 / 05` for both) instead of two. This was a deliberate simplification over giving clue-pairs their own grouping concept in the data model — one boolean flag on the *second* step of a pair is enough, and `StoryStepScene` and `ProgressIndicator` need no awareness of "pairs" at all, only of the computed `{ current, total }`.

`CodeStep.acceptedAnswers` is compared via `normalizeAnswer()` (trim, lowercase, collapse whitespace) against the normalized input — never interpolated into any rendered attribute, title, or DOM node, since printing it anywhere would defeat the point of a website→physical-world clue even though it isn't a security secret.

```ts
// data/journey.ts
interface CameraPose {
  distance: number;
  heading?: number;   // degrees
  pitch?: number;      // degrees
}

interface WaypointAsset {
  still?: string;   // e.g. '/assets/destinations/tokyo/reveal.webp' — served from public/, see §9
  video?: string;    // e.g. '/assets/destinations/tokyo/reveal.mp4'
  photo?: string;
}

interface Waypoint {
  id: string;
  country: string;
  city?: string;
  lat: number;
  lng: number;
  label: string;
  clue?: string;
  camera: CameraPose;
  routeFrom?: string;        // waypoint id to draw the RouteHighlight from — need not be the previous array entry, so a "redirect" can visually reconnect to an earlier stop
  isFalseLead?: boolean;      // playful/misdirecting intermediate stop
  isFinal?: boolean;
  durationWeight?: number;     // relative scroll "screen time" vs. other waypoints, default 1 — a semantic pacing hint (e.g. 1.8 = ~80% more scroll than a weight-1 stop), NOT a normalized progress value. See §8.
  asset?: WaypointAsset;
}

export type Journey = Waypoint[]; // order = traversal order; reorder freely — purely narrative/geographic content, no scroll math lives here
```

Answers are stored as `Record<stepId, value>` in state (§5), not inside `story.ts` — content and captured state are kept separate. `value` is whichever string that step resolved to: a choice's answer id, a `TextStep`'s trimmed free text, a `TaskStep`'s fixed confirmation marker, or a `CodeStep`'s normalized (correct) value. A single `Record<string, string>` is sufficient for all four — no per-type state shape was needed.

## 5. State Model

Single `useReducer` in `ExperienceContext`, no external state library — the experience is small and linear enough that Context + reducer is sufficient and keeps the dependency list at zero for state management.

```ts
type StoryPhase =
  | 'intro'
  | 'story'             // was 'questions' — renamed once the step model stopped being choice-only
  | 'empty-beat'
  | 'space-transition'
  | 'earth'            // cinematic document is mounted from here on
  | 'destination-reveal'
  | 'gift-reveal'
  | 'final';

interface ExperienceState {
  storyPhase: StoryPhase;
  currentStepIndex: number;
  answers: Record<string, string>;   // stepId -> resolved value, see §4
  finalWaypointReached: boolean;       // set once Earth progress enters the final segment; can retint any surrounding chrome
}
```

Actions: `START`, `ANSWER_STEP`, `ADVANCE_STEP`, `STEPS_DONE`, `ENTER_SPACE_TRANSITION`, `ENTER_EARTH`, `REACH_FINAL_WAYPOINT`, `RESET`.

Once `storyPhase` becomes `'earth'`, `ExperienceRouter` stops switching components imperatively — it mounts the full cinematic document once, and `destination-reveal` / `gift-reveal` / `final` become descriptive of scroll position (dispatched for bookkeeping/analytics, e.g. reduced-motion fallback step-through) rather than driving which component is rendered.

**Background phase is derived, not stored.** `getBackgroundPhase(storyPhase, currentStep, stepIndex, totalSteps)` (`visual/backgroundPhases.ts`) computes `AmbientBackground`'s phase from existing narrative state on every render, rather than the reducer tracking a redundant `backgroundPhase` field — so the background can never disagree with story progress (§6a).

`RESET` (Replay) returns to `'intro'` and scrolls the window back to top; nothing is persisted to `localStorage` — a fresh reload is a fresh gift.

## 6a. AmbientBackground (implemented — distinct from PersistentVisualLayer)

`AmbientBackground` is the lightweight, non-WebGL layer that already runs for the entire Interactive-mode half. It is deliberately a separate, simpler system from the future `PersistentVisualLayer`/Three.js Earth (§6) — not a prototype of it:

- **Mount:** once, by `App.tsx`, as a fixed sibling behind `ExperienceRouter` (`z-index: 0` vs. the active scene's `z-index: 1`). Never remounted between story steps or phases.
- **Composition:** two CSS radial-gradient "nebula" divs (violet + atmospheric blue, opacities driven by phase config and cross-faded via a plain CSS `transition`), one `<canvas>` drawing a deterministic star field (`requestAnimationFrame`, ~220 points), and one small tiled grain texture generated once into a data URL. No downloaded imagery, no WebGL.
- **Determinism:** star and grain positions come from a seeded PRNG (`visual/seededRandom.ts`, mulberry32) computed once at module load — never `Math.random()` per render — so the sky never reshuffles across story steps or re-renders.
- **Phase-driven, not scene-driven:** `getBackgroundPhase()` (§5) maps current narrative state to one of six `BackgroundPhase` values (`intro`, `early`, `middle`, `physical-task`, `late`, `space-transition`), each with its own `{ starOpacity, nebulaViolet, nebulaBlue, motionSpeed }` in `PHASE_CONFIG`. Changing phase only changes target opacities/speed — the CSS transition (nebula) and the `requestAnimationFrame` loop reading a ref (stars) both interpolate smoothly, so there is never a hard cut between phases.
- **`prefers-reduced-motion`:** the star twinkle animation is skipped (stars render at a fixed opacity) and the nebula drift keyframes are neutralized by the existing global reduced-motion reset (§ Base styles) — no separate reduced-motion branch was needed in the component itself.

**Relationship to Milestone 2:** `PersistentVisualLayer` (§6) is not a replacement built from scratch — the plan is for the space-to-Earth handoff to progressively cross-fade `AmbientBackground` into `PersistentVisualLayer`'s real Three.js scene (stars matching in density/position as the handoff completes), rather than swapping one flat background for another. That cross-fade design is deferred to Milestone 2; for now `AmbientBackground` is a complete, self-contained system on its own.

## 6. Earth / Three.js Architecture

- **One persistent `<Canvas>`, owned by `PersistentVisualLayer`, not by any scene.** `space-transition` is still part of Interactive Mode (§1), but it is the trigger that mounts `PersistentVisualLayer` — the WebGL layer and the narrative-scene switch are deliberately independent concerns. Lifecycle, keyed off `storyPhase`:
  - `intro` / `questions` / `empty-beat` — `PersistentVisualLayer` is unmounted or dormant; no WebGL cost during the question flow.
  - `space-transition` — `PersistentVisualLayer` mounts. `StarField` opacity fades in. `Earth` is already present in the scene graph but fully transparent/invisible (opacity 0, not unmounted) — this is what makes the next step a pure fade rather than a pop-in.
  - `earth` — the same `Canvas` is untouched. `Earth`'s opacity resolves to visible, and `EarthJourneyScene` (a plain pinned DOM section, owning only the `ScrollTrigger`) begins writing progress into the shared store described below; `CameraRig`/`RouteLine`/`WaypointMarkers` start reading it.
  - `destination-reveal` — same `Canvas` stays alive for the cross-fade into the `AssetSlot` still/video.
  - `gift-reveal` — only now does `PersistentVisualLayer` unmount, once the cross-fade has completed and WebGL is no longer needed.
  - **Invariant:** there is no WebGL context creation/teardown anywhere between Space Transition and Final Destination — exactly one mount (at `space-transition`) and one unmount (entering `gift-reveal`).
- **Earth geometry:** a single fixed-detail sphere (roughly 64–128 segments is already more than enough at the camera distances used) with a day-map + low-intensity emissive night-lights texture. No adaptive LOD — the camera range is narrow enough that it isn't needed.
- **Camera:** owned entirely by `CameraRig.tsx`. Every frame it reads the current normalized progress (from the ref-based store in §7, not React state) and interpolates position/lookAt between the two `TimelineSegment`s the progress currently falls between. Camera position is always *derived*, never stored independently — it cannot drift out of sync with scroll.
- **Markers & labels are DOM, not WebGL text.** `WaypointMarkers.tsx` projects each waypoint's lat/lng to screen space and renders real HTML (via drei's `Html` or a plain absolutely-positioned layer) using the actual DESIGN.md typography tokens. This keeps text crisp, screen-reader-visible, and consistent with the rest of the type system instead of canvas-rasterized.
- **RouteLine:** an arc (`CatmullRomCurve3` along the sphere surface) between two waypoints, drawn on progressively via a progress-driven dash-offset/draw-range rather than mounting a new line per segment.
- **StarField:** a static `Points` buffer; only its opacity is progress/phase-driven (fading in during Space Transition, holding steady after). Per DESIGN.md, it is supporting imagery — it does not react to scroll beyond that one opacity fade, and never becomes a parallax field.
- **Progress bridging:** the ScrollTrigger's `onUpdate` writes into a mutable ref (or a tiny external store via `useSyncExternalStore`), which `CameraRig`, `WaypointMarkers`, and `RouteLine` all read inside `useFrame`/render — this avoids driving 60fps React re-renders through Context.

## 7. GSAP / ScrollTrigger Architecture

- `gsap/registerGsap.ts` registers `ScrollTrigger` and `@gsap/react`'s `useGSAP` once, at app entry.
- **Interactive-mode scenes** (Intro, StoryStepScene, EmptyBeat, TransitionScene) use plain GSAP timelines, scoped per component with `useGSAP(() => {...}, { scope: ref })`, triggered imperatively by state/phase changes — not by scroll, since this half of the experience isn't scrollable content.
- **`EarthJourneyScene`** creates exactly one `ScrollTrigger`: `pin: true`, `scrub: true`, sized to give enough scroll distance for every waypoint plus the final approach (e.g. `end: '+=' + journey.length * viewportHeight * factor`). Its `onUpdate` is the single write point into the progress store described in §6.
- **Post-pin scenes** (`DestinationRevealScene`, `GiftRevealScene`, `FinalScene`) each get a lightweight `ScrollTrigger.create({ trigger, toggleActions: 'play none none reverse' })` for simple entrance/exit — no scrubbing, matching the Motion section's "text entrances" pattern rather than continuous scroll-linkage, since by this point the story has landed and no longer needs camera-like control.
- All instances are cleaned up automatically through `useGSAP`'s context revert on unmount, which also covers Replay (full remount of the cinematic document).

## 8. Waypoint Timeline System

`data/timeline.ts` exports one pure function, `buildTimeline(journey: Journey): TimelineSegment[]`, so no magic scroll numbers exist anywhere in component code.

```ts
interface TimelineSegment {
  id: string;                 // 'earth-reveal' | waypoint.id | 'final-reveal'
  start: number;                // 0–1
  end: number;                   // 0–1
  waypoint?: Waypoint;
}
```

`journey.ts` describes **what** the journey contains — geography, narrative labels, camera framing. `timeline.ts` alone decides **when**, in scroll terms, each beat happens. Nothing in `journey.ts` is a normalized `0..1` number.

Rules `buildTimeline` applies:
1. Reserves a fixed leading band for Earth Reveal (e.g. `0.00–0.08`) and a fixed trailing band for the final settle-and-reveal (e.g. `0.90–1.00`) — these two are constants, not derived from `journey.length`.
2. The remaining range (`0.08–0.90`) is divided across the waypoints in array order **proportionally to each waypoint's `durationWeight`** (default `1` when omitted): a waypoint's slice size is `weight / sum(all weights)` of the remaining range. A waypoint marked `isFalseLead` might use `durationWeight: 0.6` to pass quickly; the final approach might use `1.8` to let the reveal breathe.
3. Adjacent segments get a small overlap window so marker/label opacity can cross-fade instead of switching hard at the boundary (per the Motion section's "sequential, not simultaneous" rule for destination transitions).
4. **Escape hatch:** if a genuinely exceptional manual override is ever needed (a fixed scroll position rather than a relative weight), it is passed as a separate `overrides` map into `buildTimeline(journey, overrides?)` at the call site — never stored as a field on the waypoint itself. This keeps `journey.ts` permanently free of scroll math, even for edge cases.

Because `CameraRig`, `WaypointMarkers`, and `RouteLine` all consume the *output* of `buildTimeline`, changing the journey from `A → B → C` to `X → Y → Z` — or inserting a false-lead/redirect stop — means editing only `data/journey.ts` (content) and, if pacing should change, a `durationWeight` (still content, not a scroll number). No animation code changes. `routeFrom` (§4) lets a route line reconnect to a non-adjacent earlier waypoint, so a "redirect" beat can loop back geographically while the scroll timeline itself stays strictly linear.

## 9. Higgsfield Asset Integration Plan

- `AssetSlot.tsx` accepts `{ still?, video?, photo?, alt }` and renders, in priority order: video (muted/looped, falling back to its poster under reduced-motion) → still → photo → a graceful placeholder built from existing tokens (`--color-canvas-elevated` + `--glow-reveal`, no broken-image state).
- **Large runtime destination assets (video, generated stills/photos) live under `public/assets/destinations/<waypointId>/`**, not bundled through `src/assets`. Being in `public/` means they're served as static files at a stable URL rather than passing through the Vite bundler/import graph — appropriate for large, frequently-swapped media that shouldn't trigger a rebuild.
- Referenced from `waypoint.asset` in `journey.ts` as root-relative paths, e.g.:
  ```
  asset: {
    video: '/assets/destinations/tokyo/reveal.mp4',
    still: '/assets/destinations/tokyo/reveal.webp',
  }
  ```
- Small *imported* UI assets (icons, the scroll-hint glyph, etc.) still live under `src/assets/` as before and go through normal bundler imports — the `public/` split is specifically for the heavy, per-destination Higgsfield output, not for the whole asset pipeline.
- **The architecture is fully demoable with zero generated assets** — every waypoint renders through the placeholder path until Higgsfield content is dropped into `public/assets/destinations/`, so this task doesn't block on asset generation.
- Video/still assets are lazy-loaded (`preload="none"` on `<video>`, or the `<img>` only requested) as `DestinationRevealScene` nears the viewport — they're the heaviest payload in the app and shouldn't affect the initial question-flow bundle.

## 10. Responsive / Performance Considerations

- DPR capped via `Math.min(devicePixelRatio, 2)` on `EarthCanvas`, dropped further to `1` on a basic low-end heuristic (narrow viewport + low `navigator.hardwareConcurrency`).
- Mobile reduces `StarField` point count, softens/disables `AtmosphereGlow` blur, and simplifies `RouteLine`'s glow — the WebGL scene itself is never dropped, only its expensive effects.
- Earth stays a single fixed-detail sphere across breakpoints — no adaptive geometry needed given the constrained camera range.
- The `three/` tree is code-split (`React.lazy`) behind the Interactive-mode bundle, so Intro/Questions load and become interactive without paying for Three.js/R3F at all.
- **No-WebGL fallback:** feature-detected at mount. If unavailable, `EarthJourneyScene` renders a static starfield image + gradient background with the same DOM `WaypointMarkers`/`DestinationLabel` components, and swaps scroll-scrub for a simple "continue" button per waypoint — the narrative sequence is fully preserved, just without the 3D camera.
- `prefers-reduced-motion` disables scroll-scrub smoothing (steps discretely between segments instead of interpolating every frame), holds `StarField`/`RouteLine` static, and shortens all GSAP durations per the Motion section's reduced-motion guidance in DESIGN.md.

## 11. Accessibility Considerations

- `AnswerChip` is a real `<button>` with a visible focus ring (accent color matches the active phase), Tab/Arrow-key navigable, Enter/Space to select; selection is signaled by border-weight + glow, never by color alone. `TextAnswerInput` is a real `<input>` + `<button>` pair — native Tab order, native Enter-to-submit, no custom keyboard handling beyond that.
- Focus moves to the first interactive element (whichever it is for that step type) automatically when a new step mounts.
- `ProgressIndicator` is `aria-hidden` (intentionally decorative/subtle per DESIGN.md); the real step count is exposed via an `aria-label` on the step container (e.g. "Step 3 of 5") for assistive tech, derived from `getProgress()` (§4) so it matches whatever `ProgressIndicator` displays.
- `CodeStep` feedback ("Not quite.") is rendered with `role="status"` so a wrong attempt is announced without needing focus to move to it — but the message itself stays a plain restrained line, never a colored/iconic error state (DESIGN.md "no information conveyed solely through color" applies here too: incorrect vs. idle is signaled by the presence of that text, not by tinting the input).
- Because markers and destination text are real DOM (§6), screen readers get the full narrative even though the visual is WebGL — no text exists only inside the canvas.
- Every phase-driven accent shift (violet → atmosphere → reveal) is paired with a scale/position/timing change, never used as the sole signal of meaning.
- `prefers-reduced-motion` is honored automatically at the OS level (§10); no extra in-app toggle is required for v1, but nothing here precludes adding one later.

## 12. Recommended Implementation Order

1. ✅ Scaffold Vite + React + TS; wire `variables.css` in; stand up `ExperienceContext`/reducer and `ExperienceRouter` with placeholder scenes.
2. ✅ Build Intro → Story-step flow end to end, data-driven from `story.ts` (now a mixed choice/text/task/code union, not choice-only), with GSAP entrance/exit. Fully demoable with zero WebGL.
2a. ✅ Layer in `AmbientBackground` (§6a) behind the Interactive-mode half, evolving continuously from `intro` through `space-transition`.
3. ✅ Build `EmptyBeatScene` + `TransitionScene`; wire the one-way transition into `storyPhase: 'earth-placeholder'` (temporary stand-in for `'earth'`, §5).
4. Stand up `PersistentVisualLayer`/`EarthCanvas` with a static (non-scroll-linked) Earth + StarField, and its `space-transition` → `gift-reveal` mount/unmount lifecycle (§6) — validate the look and the no-remount invariant before wiring scroll. Design the cross-fade handoff from `AmbientBackground` (§6a) as part of this step.
5. Add the pinned `ScrollTrigger` in `EarthJourneyScene`, the progress store, and `CameraRig`, driven by a hardcoded 2–3-entry `journey.ts` with default `durationWeight`s. This is the highest-risk, most novel part of the build — validate scroll-scrub feel early.
6. Layer in `WaypointMarkers` and `RouteLine`, driven by `buildTimeline`.
7. Build `DestinationRevealScene` (with `AssetSlot` placeholders), `GiftRevealScene`, `FinalScene` + Replay.
8. Responsive pass: typography `clamp()`, mobile `scene-padding`, DPR caps, effect reduction.
9. Accessibility pass: focus states, `aria-live`/`aria-label` audit, reduced-motion verification.
10. Only then: fill in the real `journey.ts` content and drop in generated Higgsfield assets — the architecture doesn't need to change to accommodate them.
