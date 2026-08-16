# ARCHITECTURE — The Journey

This document defines the interaction and scene architecture for the experience described in `DESIGN.md`. This is the decision record implementation follows; per the top-level instructions for this project, the current application is the source of truth for implemented *behavior* where the two disagree in detail. The Interactive-mode half (Intro through Space Transition) is implemented and fully in Russian; a first real Earth journey (`PersistentVisualLayer`/`EarthCanvas`/`CameraRig`/`WaypointMarkers`, scroll-driven via one `EarthJourneyScene` ScrollTrigger, three test waypoints) is now implemented too. Destination Reveal, Gift Reveal, and Final Scene — the rest of Cinematic Mode — are still a plan, not code.

**Route lines were implemented in an earlier pass and then explicitly removed** on later instruction ("each destination is an isolated geographic marker") — `three/RouteLine.tsx` no longer exists. Do not reintroduce inter-waypoint arcs without direct instruction to do so.

Stack: React, TypeScript, Vite, GSAP + `@gsap/react` + `ScrollTrigger` (installed and registered), Three.js + `@react-three/fiber` + `@react-three/drei` (installed).

## 1. Narrative Flow

The experience has two macro-modes, and the architecture treats the seam between them as a real state transition, not a visual trick:

- **Interactive Mode** (click/tap-driven): Intro → Questions → Empty Beat → Space Transition. Exactly one scene is mounted at a time; advancing is an explicit user action or a short timed pause.
- **Cinematic Mode** (scroll-driven): Earth Journey → Destination Reveal → Gift Reveal → Final Scene. These mount together as one continuous scrollable document; scroll position (not app state) drives what's visible.

The switch from Interactive to Cinematic happens once, at the end of the Space Transition scene, and is one-way — there is no going back to click-driven question UI except via Replay.

**Decision (implemented):** Scene 06 (Earth Reveal) and Scene 07 (Earth Approach + Waypoints) from the brief are implemented as a single component, `EarthJourneyScene`, not two. The brief itself asks for "one master normalized progress value from 0 to 1" — splitting Reveal and Approach into separate components would just recreate the WebGL context and mean re-deriving continuity between them. In practice the reveal is split into two beats rather than one: an *automatic* opacity fade-in (Earth/atmosphere `uOpacity` 0→1, camera fixed at `EARTH_REVEAL_CAMERA`, no scroll input needed) that plays once on entering `earth`, then a fixed leading scroll band (`0.00–0.16`, see §8) before the first waypoint's arrival. This two-part reveal — auto-fade, then scroll — is what makes "Earth appears out of an already-present starfield" read as inevitable rather than scroll-gated.

**Decision (implemented):** All user-facing copy is Russian (`data/story.ts`, `IntroScene`, `TransitionScene`, `EarthJourneyScene`'s scroll hint, waypoint marker labels — coordinates were removed, see the Waypoint Markers note in §6), and `index.html`'s `lang` attribute is `ru`. Internal identifiers (types, actions, file names, CSS class names) stay in English — only rendered/announced text changed. No `PPNeueMontreal` font file exists in the repo (none was added); the existing fallback stack (`ui-sans-serif, system-ui, -apple-system, ... Segoe UI, Roboto, sans-serif`) already renders Cyrillic natively and consistently, so no font work was needed beyond verifying that in-browser.

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
├── AmbientBackground                — persistent non-WebGL layer behind every Interactive-mode
│                                        scene, see §6a; crossfades out from 'space-transition' on
│
├── PersistentVisualLayer            — mounted once, first time storyPhase reaches
│    └── EarthCanvas (lazy-loaded)      'space-transition'; owns <Canvas>; see §6
│         ├── StarField.tsx             — drei <Stars>, restrained, no hyperspace motion
│         ├── Earth.tsx                 — custom shader material, see §6
│         ├── CloudLayer.tsx            — separate sphere, own shader, independent slow drift
│         ├── AtmosphereGlow.tsx        — Fresnel rim shader (thin edge, not a halo)
│         ├── CameraRig.tsx             — reads progressStore every frame, drives camera + Earth rotation
│         └── WaypointMarkers.tsx        — drei <Html> children of the rotating Earth group,
│                                            monochrome pin glyph, no route lines between them
│
└── ExperienceRouter                 — renders exactly one Interactive scene, OR EarthJourneyScene
                                          (the DOM half of the Earth journey), based on storyPhase
```

```
src/
  app/
    App.tsx                     — mounts ExperienceProvider, AmbientBackground, PersistentVisualLayer, ExperienceRouter
    ExperienceRouter.tsx         — narrative UI switch, see tree above
  visual/
    AmbientBackground.tsx        — persistent CSS + Canvas2D background, see §6a; `visible` prop drives its own crossfade-out
    backgroundPhases.ts           — derives BackgroundPhase from storyPhase/step, see §6a
    seededRandom.ts                — deterministic star/grain generation (two depth layers), see §6a
    PersistentVisualLayer.tsx    — mount-once lifecycle + crossfade-in for the WebGL layer, see §6/§D
  scenes/
    intro/IntroScene.tsx
    story/StoryStepScene.tsx           — renders choice/text/task/code from story.ts, handles S02 + S03
    story/EmptyBeatScene.tsx           — S04
    transition/TransitionScene.tsx     — generic fullscreen-message scene, reused for S05
    earth/EarthJourneyScene.tsx        — DOM half of the real Earth journey: one pinned ScrollTrigger,
                                           the "Листай дальше" scroll hint, no canvas of its own — see §6/§7
    destination/DestinationRevealScene.tsx  — future
    gift/GiftRevealScene.tsx                 — future
    closing/FinalScene.tsx                    — future
  components/
    AnswerChip.tsx
    ProgressIndicator.tsx
    TextAnswerInput.tsx           — shared bottom-line field for TextStep + CodeStep, see §4
    ScrollHint.tsx                 — future dedicated component; currently inline markup in EarthJourneyScene
    DestinationLabel.tsx           — future
    AssetSlot.tsx               — future; still/video/photo/placeholder, see §9
    ReplayButton.tsx               — future
  three/
    EarthCanvas.tsx             — mounted (lazily) by PersistentVisualLayer; owns the <Canvas>, lights, Suspense boundary, and the auto Earth-reveal tween, see §6
    Earth.tsx                    — sphere + custom shader material (earthShader.ts)
    earthShader.ts                — day/night terminator, cheap normal-mapped relief, restrained specular
    CloudLayer.tsx                — separate sphere, own shader (cloudShader.ts), independent slow drift
    cloudShader.ts                 — density read from a plain grayscale texture's red channel, not a texture alpha channel
    atmosphereShader.ts           — Fresnel rim glow, sun-weighted, tuned to a thin edge not a halo
    sunDirection.ts                — shared fixed world-space light direction (Earth/cloud shaders + atmosphere + THREE.DirectionalLight)
    StarField.tsx
    AtmosphereGlow.tsx
    CameraRig.tsx                — reads progressStore, drives camera + Earth-group rotation, see §6/§K
    WaypointMarkers.tsx           — thin wrapper, maps journey.ts to one WaypointMarker each
    WaypointMarker.tsx             — one marker's presentation + GSAP entrance/exit choreography (monochrome pin, no route lines)
    latLng.ts                      — latLngToVector3(), quaternionForLatLng()
    progressStore.ts               — the ref-based store described in §6/§7 (not React Context)
    responsive.ts                   — shared mobile breakpoint for texture tier + camera framing
  data/
    story.ts                      — StoryStep discriminated union + getProgress(), see §4
    journey.ts                    — geography/narrative content + CameraPose, see §3 note below and §8
    timeline.ts                    — buildTimeline() + getActiveSegment(), converts journey + duration weights into scroll ranges, see §8
  state/
    ExperienceContext.tsx        — phase/step/answers/earthRevealed reducer, see §5
  hooks/
    usePrefersReducedMotion.ts    — implemented
    useMediaQuery.ts               — future (CameraRig currently reads viewport size directly via useThree())
  gsap/
    registerGsap.ts                — registers ScrollTrigger + gsap defaults, called once
  styles/
    global.css                     — imports variables.css from DESIGN.md
public/
  assets/
    earth/                          — earth-day.webp, earth-night.webp, earth-normal.webp, earth-specular.webp (see §6)
    background/                     — Higgsfield nebula-detail.webp (see §6a)
    destinations/<waypointId>/     — future; empty until Higgsfield destination assets exist; see §9
```

**Where things live, explicitly (per the brief's checklist):**
- Story-step UI → `scenes/story/StoryStepScene.tsx`, driven entirely by `data/story.ts` (`story.length`, via `getProgress()`, is always the source of truth for the total, never hardcoded).
- Narrative/phase state → `state/ExperienceContext.tsx`.
- GSAP timelines → colocated in each scene via `useGSAP({ scope: ref })`. The Earth master timeline is the one exception: it lives directly in `EarthJourneyScene.tsx` (a single `ScrollTrigger.create`, not wrapped in a separate hook — `hooks/useScrollProgress.ts` was planned but turned out not to earn its own file for one call site).
- The persistent *lightweight* background → `visual/AmbientBackground.tsx`, mounted once by `App.tsx`, never owned by an individual scene (§6a). The persistent *WebGL* layer → `three/`, mounted once by `PersistentVisualLayer` (§6), also from `App.tsx`.
- Scroll progress → computed once, in one `ScrollTrigger` owned by `EarthJourneyScene`, written into `three/progressStore.ts` — a plain mutable object, not React Context — which `CameraRig`/`WaypointMarker` (one per marker) all read inside their own `useFrame` callbacks regardless of which scene is currently mounted.
- Destination geography/content → `data/journey.ts`; scroll timing derived separately in `data/timeline.ts` (§8). Currently three test waypoints (Beijing/Tokyo/Cairo) — not the real trip.
- Generated Higgsfield destination assets (future) → `public/assets/destinations/<waypointId>/` (§9). The Earth *surface* textures are NOT Higgsfield-generated — see §6.

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
// data/journey.ts — as actually implemented for the test journey
interface CameraPose {
  distance: number;                                    // Earth-radius units, radius = 1
  positionOffset?: { x: number; y: number };            // orbital-position nudge, roughly -0.5..0.5
  lookAtOffset?: { x: number; y: number; z?: number };  // RADIANS — camera rotation after lookAt(0,0,0), see §K2
  fov?: number;                                          // degrees, defaults to ~40
}

interface Waypoint {
  id: string;
  label: string;              // Russian display label, e.g. 'МОСКВА'
  lat: number;
  lng: number;
  camera: CameraPose;
  durationWeight?: number;     // relative scroll "screen time" vs. other waypoints, default 1 — a semantic pacing hint, NOT a normalized progress value. See §8.
}

export const journey: Waypoint[] = [ /* Beijing, Tokyo, Cairo — TEST DATA, not the real trip */ ];
export const EARTH_REVEAL_CAMERA: CameraPose; // far/distant pose used at progress 0
```

**Not yet implemented / deferred from the original plan:** `country`/`city`/`clue` display fields, `WaypointAsset` (still/video/photo), `isFalseLead`, `isFinal`. These belong to the real-destination pass (journey content + `AssetSlot`, §9) and weren't needed to validate the scroll → rotation → camera mechanic with test data. **Route lines (`routeFrom`, an earlier `RouteLine.tsx`) were built, then explicitly removed** — each destination is now an isolated marker with no connecting geometry, per direct instruction. Do not reintroduce this without being asked.

**`CameraPose.lookAtOffset` changed meaning from the original plan.** It is not a world-space point for `camera.lookAt()` — `lookAt(target)` always centers whatever `target` is by definition, so a near-origin point can never produce off-center framing (this was a real bug found during browser QA — see §K2 below). It is instead a pair of small angular nudges, in radians, applied to the camera's local rotation *after* a base `lookAt(0,0,0)` — Earth stays at the world origin while the view itself tilts, which is what actually pushes Earth toward one side of the frame.

Answers are stored as `Record<stepId, value>` in state (§5), not inside `story.ts` — content and captured state are kept separate. `value` is whichever string that step resolved to: a choice's answer id, a `TextStep`'s trimmed free text, a `TaskStep`'s fixed confirmation marker, or a `CodeStep`'s normalized (correct) value. A single `Record<string, string>` is sufficient for all four — no per-type state shape was needed.

## 5. State Model

Single `useReducer` in `ExperienceContext`, no external state library — the experience is small and linear enough that Context + reducer is sufficient and keeps the dependency list at zero for state management.

```ts
// state/ExperienceContext.tsx — as actually implemented
type StoryPhase =
  | 'intro'
  | 'story'             // was 'questions' — renamed once the step model stopped being choice-only
  | 'empty-beat'
  | 'space-transition'
  | 'earth';            // EarthJourneyScene + PersistentVisualLayer's Earth mount from here on

interface ExperienceState {
  storyPhase: StoryPhase;
  currentStepIndex: number;
  answers: Record<string, string>;   // stepId -> resolved value, see §4
  earthRevealed: boolean;             // flips once EarthCanvas's auto opacity-reveal finishes, see §6
}
```

Actions: `START`, `ANSWER_STEP`, `ADVANCE_STEP`, `STEPS_DONE`, `ENTER_SPACE_TRANSITION`, `ENTER_EARTH`, `EARTH_REVEALED`, `RESET`.

`'destination-reveal'`, `'gift-reveal'`, `'final'`, and their `REACH_FINAL_WAYPOINT` action are not yet implemented — they belong to the real-destination pass. `earthRevealed` is the one addition beyond the original plan: it's a single one-shot narrative flip (not 60fps scroll data, so it correctly lives in React state, not `progressStore`) that `EarthJourneyScene` waits on before showing its scroll hint.

**Background phase is derived, not stored.** `getBackgroundPhase(storyPhase, currentStep, stepIndex, totalSteps)` (`visual/backgroundPhases.ts`) computes `AmbientBackground`'s phase from existing narrative state on every render, rather than the reducer tracking a redundant `backgroundPhase` field — so the background can never disagree with story progress (§6a).

`RESET` (Replay) returns to `'intro'` and scrolls the window back to top; nothing is persisted to `localStorage` — a fresh reload is a fresh gift.

## 6a. AmbientBackground (implemented — distinct from PersistentVisualLayer)

`AmbientBackground` is the lightweight, non-WebGL layer that already runs for the entire Interactive-mode half. It is deliberately a separate, simpler system from the future `PersistentVisualLayer`/Three.js Earth (§6) — not a prototype of it:

- **Mount:** once, by `App.tsx`, as a fixed sibling behind `ExperienceRouter` (`z-index: 0` vs. the active scene's `z-index: 1`). Never remounted between story steps or phases.
- **Composition:** two CSS radial-gradient "nebula" divs (violet + atmospheric blue, opacities driven by phase config and cross-faded via a plain CSS `transition`), one `<canvas>` drawing a deterministic star field (`requestAnimationFrame`, ~220 points), and one small tiled grain texture generated once into a data URL. No downloaded imagery, no WebGL.
- **Determinism:** star and grain positions come from a seeded PRNG (`visual/seededRandom.ts`, mulberry32) computed once at module load — never `Math.random()` per render — so the sky never reshuffles across story steps or re-renders.
- **Phase-driven, not scene-driven:** `getBackgroundPhase()` (§5) maps current narrative state to one of six `BackgroundPhase` values (`intro`, `early`, `middle`, `physical-task`, `late`, `space-transition`), each with its own `{ starOpacity, nebulaViolet, nebulaBlue, motionSpeed }` in `PHASE_CONFIG`. Changing phase only changes target opacities/speed — the CSS transition (nebula) and the `requestAnimationFrame` loop reading a ref (stars) both interpolate smoothly, so there is never a hard cut between phases.
- **`prefers-reduced-motion`:** the star twinkle animation is skipped (stars render at a fixed opacity) and the nebula drift keyframes are neutralized by the existing global reduced-motion reset (§ Base styles) — no separate reduced-motion branch was needed in the component itself.
- **Depth layers (stars):** `STARS` (`visual/seededRandom.ts`) is generated as two seeded groups, `far` (160 points, smaller/dimmer, minimal parallax) and `near` (60 points, larger/brighter, more parallax) — same deterministic PRNG, same single array shape, just a `layer` tag and a `parallax` multiplier per star. This is what makes the star field read as depth rather than one flat plane, per DESIGN.md's "Ambient Star Field."
- **Pointer parallax:** desktop-only (`(hover: hover) and (pointer: fine)`, and never under reduced motion), a `pointermove` listener writes a normalized `-1..1` target into a ref; the same `requestAnimationFrame` loop that draws stars eases toward that target (`lerp` factor `0.06`) and applies it two ways — as a small `translate()` on a dedicated parallax wrapper `<div>` around each nebula, and as a per-star pixel offset (`star.parallax`, 1.4–4px) added directly to each star's canvas draw position. The nebula wrapper is a *separate* element from the one carrying the CSS keyframe drift (`ambient-drift-a`/`-b`), because a running CSS `animation` on `transform` always wins the cascade over an inline style setting the same property — two nested elements is what lets drift and pointer-offset compose instead of one silently overriding the other.
- **Higgsfield detail layer:** `AmbientBackground` also renders `.ambient-background__detail`, a single low-opacity (`≤0.16`, `mix-blend-mode: screen`) organic texture (`public/assets/background/nebula-detail.webp`, ~9KB) layered over the procedural radial-gradient nebulas. Radial gradients alone only ever read as soft circular blobs; this adds the wispy, filament-like structure real nebula dust has, which CSS gradients can't produce on their own. Its opacity is derived from the same `nebulaViolet`/`nebulaBlue` phase values (no separate phase table), and it drifts on its own slow 90s keyframe. Generated via the connected Higgsfield MCP (`cinematic_studio_2_5`, 16:9, 2K) — two candidates were generated and compared against the pure-procedural background; one was kept as this additive detail layer. **The background is fully functional with this asset absent** — it's a progressive enhancement, not a dependency, consistent with the `public/assets/` pattern in §9.

**Relationship to the WebGL layer (implemented):** `PersistentVisualLayer` (§6) is not a replacement built from scratch. `AmbientBackground` takes an optional `visible` prop (default `true`); `App.tsx`'s `AppShell` sets it `false` for `storyPhase === 'space-transition' | 'earth'`, which GSAP-fades the whole `.ambient-background` container to opacity 0 over ~2.8s. `PersistentVisualLayer` mounts its own container (already showing `StarField`) at the same moment and fades it in over the same ~2.8s window — the two crossfade against each other rather than either one cutting. `AmbientBackground` is never unmounted (state is cheap to keep, and Replay would need it again), just faded to invisible.

## 6. Earth / Three.js Architecture (implemented)

- **One persistent `<Canvas>`, owned by `PersistentVisualLayer`, not by any scene.** `space-transition` is still part of Interactive Mode (§1), but it is the trigger that mounts `PersistentVisualLayer` — the WebGL layer and the narrative-scene switch are deliberately independent concerns. `EarthCanvas` is lazy-loaded (`React.lazy`) so the Intro/Questions bundle never pays for three/R3F. Lifecycle, keyed off `storyPhase`:
  - `intro` / `story` / `empty-beat` — `PersistentVisualLayer` renders `null`; no WebGL cost during the question flow.
  - `space-transition` — `PersistentVisualLayer` mounts (first and only mount for the session) and crossfades in against `AmbientBackground` crossfading out (§6a/§D). `StarField` is visible immediately. `Earth`/`AtmosphereGlow` are already in the scene graph but at `uOpacity: 0` (a shader uniform, not a mount/unmount) — this is what makes the next step a pure fade rather than a pop-in.
  - `earth` — same `Canvas`, untouched. `EarthCanvas` starts a GSAP tween on `earthMaterialRef.current.uniforms.uOpacity` and `atmosphereMaterialRef.current.uniforms.uOpacity` (0→1, ~2.6s), independent of scroll — the camera sits at the fixed `EARTH_REVEAL_CAMERA` pose throughout. On completion it dispatches `EARTH_REVEALED`; `EarthJourneyScene` then shows the "Листай дальше" hint and scroll starts driving `progressStore.progress`.
  - `destination-reveal` / `gift-reveal` — **not yet implemented.** The invariant ("no WebGL context creation/teardown between Space Transition and Final Destination") still holds for everything that exists today: exactly one mount, no unmount for the rest of the session.
- **Earth geometry:** a single `SphereGeometry(1, 96, 96)` (within the 64–128 segment budget, §S) — no adaptive LOD, the camera range is narrow enough that it isn't needed.
- **Earth material is a custom `ShaderMaterial`, not `MeshStandardMaterial`.** `three/earthShader.ts`: blends `earth-day.webp`/`earth-night.webp` by the dot product of the (cheaply normal-perturbed) surface normal against a fixed world-space `sunDirection` over a *wide* (~0.6-unit) smoothstep terminator band — real twilight is broad and soft, and a harder edge (the original ~0.28-wide band) was exactly what read as "synthetic Three.js demo" lighting during the visual-quality review. A soft highlight-safety compression (`color / (1 + max(0, color-0.92)*0.6)`) guards against clipping at close camera range. The bump/normal detail (`earth-normal.webp`) is applied via a screen-space-derivative "normal mapping without precomputed tangents" trick (cheap, no extra geometry attributes needed) rather than true tangent-space normal mapping — adequate at this camera range. See §Textures below for asset provenance.
  - **Ocean specular is true view-dependent Blinn-Phong, not a fixed brightness pattern.** The original version was `pow(sunDot, 44)` — purely a function of surface-normal-vs-sun angle, meaning the "glint" never moved as the camera orbited, just brightened/dimmed with lighting. Replaced with a real half-vector highlight (`H = normalize(viewDir + sunDirection)`, `viewDir = normalize(cameraPosition - vWorldPos)`, `pow(dot(N,H), 90)`) — this is what makes the glint actually appear/disappear/slide across the ocean as the camera moves, an occasional cinematic highlight rather than a static pattern. `cameraPosition` is a three.js-auto-provided uniform for every `ShaderMaterial`; **redeclaring it in the fragment shader is a compile error** ("redefinition") — a real bug only caught by running this in a browser (the shader fails silently-ish: console shows `Shader Error 0 - VALIDATE_STATUS false`, Earth still renders via whatever GL does with a failed program, so this is easy to ship unnoticed without an actual browser QA pass).
  - **Night lights shimmer subtly** — a per-pixel spatial hash (`hash(floor(vUv * 300.0))`) gives each city cluster its own phase, then a slow (`uTime * 0.12`), tiny-amplitude (±5%) sine modulates night brightness. Different clusters drift in and out of phase with each other rather than the whole night side pulsing in unison, which is what keeps this from reading as "Christmas lights" — `uTime` is written once per frame from `useFrame`'s `clock.elapsedTime` in `Earth.tsx`, frozen under reduced motion rather than ticking forever.
- **Renderer tone mapping is explicit, not left to R3F's default.** `EarthCanvas`'s `<Canvas gl={{ toneMapping: NoToneMapping, outputColorSpace: SRGBColorSpace }}>` — an automatic tonemapping curve applied on top of a hand-tuned custom shader's output was contributing to the "harsh contrast / synthetic lighting" complaint; disabling it gives the shader's own color math direct, predictable control over the final pixels.
- **Two cloud decks, not one (`CloudLayer.tsx` + `cloudShader.ts`) — separate spheres, not baked into the day map.** `CLOUD_DECKS.low` (radius `1.006×`, denser, slower drift) and `.high` (radius `1.014×`, wispier via a lower `layerAlphaScale`, faster/reversed drift, offset starting rotation) both share the one legitimate density texture (`earth-clouds.webp`) rather than inventing second cloud geography — the radius/speed/opacity/phase differences alone are what make it read as two depth layers instead of one texture duplicated. Density comes from the red channel of a plain *opaque* grayscale texture rather than a texture alpha channel — encoding the same detail as real alpha compressed to 2-5× the size for zero visual difference, since the shader reads luminance-as-density directly (`discard` below a threshold). Lit by the same `sunDirection` as Earth so clouds dim into the night side too, instead of staying a flat lit-white sticker regardless of terminator. Each deck's own slow independent local `rotation.y` drift is layered on top of — not instead of — the parent group's geographic-targeting rotation, which is what gives Part 18's "Earth idle life" without ever fighting `CameraRig`. **Render order is explicit** (`renderOrder`: Earth `0`, low clouds `1`, high clouds `2`, atmosphere `3`) rather than left to three.js's default transparency sort — three concentric/near-concentric transparent spheres sharing a center is exactly the case where distance-to-camera sorting is ambiguous, and an unstable draw order would make clouds inconsistently occlude (or fail to occlude) the night-light layer beneath them frame to frame.
- **Atmosphere (`AtmosphereGlow.tsx` + `atmosphereShader.ts`) — redone from a thick halo to a thin scattering edge.** Radius cut from `1.12×` to `1.035×` Earth's radius (the single biggest contributor to the "thick cyan ring" complaint — a BackSide shell that far out reads as a halo regardless of shader math), and the Fresnel falloff sharpened from `pow(x, 3.2)` to `pow(x, 5.5)` so the bright band concentrates right at the grazing edge. Color is desaturated 45% toward white (a physically plausible scattering edge is pale, not saturated cyan) and overall intensity roughly halved. Still weighted toward the lit limb via the same `sunDirection` dot product as before.
- **Camera + Earth rotation are driven by one `CameraRig.tsx`, but are two deliberately separate systems (§K2):**
  - *Geographic targeting:* `three/latLng.ts`'s `quaternionForLatLng(lat, lng)` computes the one-shot rotation that brings that point to face the camera's original axis exactly. `CameraRig` builds one ordered keyframe list — `[reveal@progress 0, beijing@segment.end, tokyo@segment.end, cairo@segment.end]` — and every frame `slerp`s the Earth group's quaternion between whichever two keyframes `progressStore.progress` currently falls between (via `data/timeline.ts`'s `getActiveSegment`-equivalent lookup, smoothstep-eased). Rotation and camera arrival complete together at each waypoint boundary — one continuous orbital shot, not three slides.
  - *Cinematic framing:* the interpolated `CameraPose` (§4) for the same keyframe pair. `distance` and `fov` are plain lerps. `positionOffset` perturbs the camera's fixed-distance orbital position. `lookAtOffset` (radians) is applied as `camera.lookAt(0,0,0)` followed by `camera.rotateY(yaw)` / `camera.rotateX(pitch)` — **not** as a `lookAt()` target, since `lookAt` always centers its target by construction (a real bug caught during browser QA, see §K2). Mobile gets separately scaled offsets (yaw cut much harder than pitch — a narrow portrait viewport is the constrained axis horizontally) rather than reusing desktop values, plus extra FOV and slightly increased distance for label headroom.
  - Camera position/rotation/fov are set imperatively inside `useFrame`, reading `progressStore` directly — never through React state/Context, so there is no 60fps re-render pressure and no possibility of camera drifting out of sync with scroll.
- **Markers & labels are DOM, not WebGL text — minimal, monochrome, and only one is ever visible.** `WaypointMarkers.tsx` is a thin wrapper mapping `journey.ts` to one `WaypointMarker.tsx` each; every marker is a child of the *same* rotating Earth group as the sphere, so drei's own per-frame `matrixWorld` projection keeps it pinned to its geographic point with zero extra projection code. `occlude` (against the Earth mesh) hides a marker when its point is on the far side. The glyph is a small inline SVG — a thin pin outline with a filled center dot, `--color-text-primary` with a restrained glow, deliberately not the filled red Google Maps teardrop and not tinted with any accent color ("no colored UI").
  - **Choreography is event-triggered GSAP, not a continuous scroll-scrubbed opacity value.** `arrivalEnvelope()` (fade-in/hold/fade-out around the waypoint's timeline-segment `end`) is polled at ~12Hz purely to decide *when* to cross an enter (`0.14`) or exit (`0.07`) threshold — the hysteresis gap between the two prevents flicker if the user scrolls back and forth right at the boundary. Crossing upward fires a one-shot entrance timeline: pin `opacity 0 / scale 0.75` → `back.out(1.8)` to `scale 1` (the ease overshoots past 1 and settles on its own — no second tween needed), then the label fades in. Crossing downward fires the reverse: label fades out first, pin fades out roughly 0.05s after — never together. `prefers-reduced-motion` keeps the same sequencing but drops the overshoot ease and shortens durations. Inactive waypoints are fully invisible (`opacity 0`), not dimmed — only the currently-arriving destination is ever readable (Part 6; an earlier per-frame-dimmed approach left multiple city names floating over Earth simultaneously, flagged in visual review as clutter). Coordinates were removed entirely — Earth is the hero, not a data readout.
- **No route lines.** An earlier pass built `RouteLine.tsx` (a great-circle arc between consecutive waypoints); it was explicitly removed on later instruction — every destination is an isolated marker, no connecting geometry between them.
- **StarField (`three/StarField.tsx`):** drei's `<Stars>` (3200 points, `speed` near-zero under reduced motion) — restrained, no hyperspace movement toward the camera, matching `AmbientBackground`'s star field in overall character for the crossfade.
- **Progress bridging:** `EarthJourneyScene`'s single `ScrollTrigger.onUpdate` writes into `three/progressStore.ts` (a plain mutable object), which `CameraRig` and every `WaypointMarker` read inside their own `useFrame` — exactly the pattern originally planned, no `useSyncExternalStore` needed since nothing here re-renders React on scroll.

### Earth Textures (upgraded — v2)

The original three.js-examples texture set (2048×1024 day map) visibly pixelated once the camera composition (§K2) put Earth at 60–75% of a 1440px+ frame — flagged directly in visual review ("looks like a Three.js tutorial globe"). Replaced with **Solar System Scope's free planet texture set** (`solarsystemscope.com/textures`, CC BY 4.0 — attribution required, noted here), itself NASA Visible Earth/Blue Marble-derived, downloaded from their 8K source files and re-encoded locally:

| File | Desktop | Mobile | Source resolution | Notes |
|---|---|---|---|---|
| `earth-day.webp` | ~~4096×2048, 576KB~~ **superseded, see §K5/§K6** | ~~141KB~~ **see §K6** | ~~8K day map~~ **NASA Blue Marble, 21600×10800 native** | this row is historical only — the day map has since been re-sourced twice (§K5: shipped this same Solar System Scope source undownsampled at 8192×4096; §K6: replaced the source entirely with NASA's own Blue Marble at 16000×8000) |
| `earth-night.webp` | 2048×1024, 69KB | `earth-night-mobile.webp` 1024×512, 15KB | 8K night map | same as v1, still current |
| `earth-clouds.webp` | 3072×1536, **1.12MB** | `earth-clouds-mobile.webp` 1536×768, 244KB | 8K cloud map | new — plain opaque grayscale, density read in-shader (see §6); genuinely the heaviest single asset, kept deliberately because "quality over saving another 500KB" was explicit in the brief and this is lazy-loaded behind the Interactive-mode bundle regardless |
| `earth-normal.webp` | 1536×768, 5KB | shared | 2K normal map | compresses to almost nothing — normal maps are inherently low-frequency over most of a sphere |
| `earth-specular.webp` | 1536×768, 57KB | shared | 2K specular map | |

Desktop total ≈1.83MB, mobile total ≈400KB (normal/specular shared across tiers) — `Earth.tsx`/`CloudLayer.tsx` pick the tier via `three/responsive.ts`'s `isMobileViewport()` at mount, the same breakpoint (`640px`) `CameraRig` uses for its framing scale-down, so texture tier and camera framing never disagree about what "mobile" means.

Not Higgsfield-generated, per the brief's explicit instruction that the globe map must stay geographically real — Higgsfield is not used anywhere in the Earth texture pipeline. Not hotlinked — downloaded once and committed as local, optimized assets (webp, re-encoded via `sharp`, a temporary dev-only dependency removed again after processing — see `package.json`, which carries no image-processing library at runtime).

## Constellation System (v2 — group/state model, no connecting lines)

**Rewritten from the original line-based version after direct instruction to remove it** ("I do NOT want obvious lines connecting stars"). Still layered into `AmbientBackground`'s existing Canvas2D star loop, not a separate component/canvas — needs to share the star field's coordinate space and draw loop. Still explicitly not a zodiac. The difference from v1: no `Connection`/line geometry exists anywhere in `visual/constellations.ts` now; only stars, grouped, with per-story-step target attributes that every star continuously eases toward.

- **Data model (`visual/constellations.ts`):** a fixed, seeded (mulberry32, same technique as `seededRandom.ts`) set of 13 `ConstellationStar`s grouped into four loose, spatially-separated clusters (`north`/`east`/`south`/`west`, 3–4 stars each, `x`/`y` in 0..1 viewport fractions). `CONSTELLATION_STATES` is an array of six `Record<GroupId, GroupState>` — one entry per `story.ts` step index (0..5) — where a `GroupState` is `{ brightness, sizeScale, drift: {x, y} }`. Nothing is a line; a "group" is purely a shared target these stars ease toward together, so it reads as a loose cluster rather than a diagram.
- **Continuous per-star easing, not per-step snapping:** `AmbientBackground` keeps a `Map` of each star's *current* `{ brightness, sizeScale, x, y }` in a ref, and every animation frame moves each value a fraction (`STAR_EASE_RATE = 0.045`, ≈1.2–1.8s settle) toward its group's target for the current step. Because the step index changes discretely (the user answers a question) but the rendered values are eased continuously regardless of how the target changed, "no sudden changes / no teleporting" holds structurally, not just by tuning a duration.
- **Story mapping (`App.tsx`'s `storyProgress` prop → `stateIndex = round(storyProgress × 5)`):** step 0 (disappear) — `north` dominant; step 1 (anywhere) — `east` emerges, `north` still present; step 2 (matters-more) — `north` fades, `south` brightens; step 3 (physical-clue, the task) — motion generally slows (the existing `physical-task` background-phase `motionSpeed` reduction already covers this), `west` quietly lights while the rest holds; step 4 (clue-code) — code success, `west` brightens further; step 5 (trust, final question) — all four groups converge toward a similar, shared brightness ("several groups slowly align").
- **Dissolve into deep space:** a `dissolveStartRef` timestamp is set the first time `phase === 'space-transition'`; every group's *target* is blended toward `DISSOLVED_STATE` (a shared, unremarkable brightness/size) over `DISSOLVE_MS` (3.2s) — groups stop reading as distinct clusters and their members become statistically part of the general star field, which is what lets the handoff into `PersistentVisualLayer`'s WebGL `StarField` feel continuous (Part 19's "the earlier constellation stars became part of this larger real space"), achieved without any explicit 2D→WebGL star hand-off logic.
- **Not implemented:** literal named `constellationStateA/B/C/D/Final` exports (the six per-step-index entries in `CONSTELLATION_STATES` serve the same purpose without the extra indirection of a separate labeled-state layer) — a cosmetic naming difference, not a functional gap.

## Space Transition Sequence (refined, not a full multi-beat rebuild)

The crossfade between `AmbientBackground` and `PersistentVisualLayer` (§6a/§D) was a flat, immediate 2.8s tween — visually thin for how much narrative weight this moment carries. Changed in `AmbientBackground.tsx`/`PersistentVisualLayer.tsx`: the crossfade now has a `1.3s` delay (`prefersReducedMotion` skips it) before a slower `4.2s` tween, so `TransitionScene`'s two lines ("Хорошо." / "Тогда есть ещё кое-что.") get a beat to play against the still-mostly-intact background before the WebGL handoff visibly begins, rather than both starting instantly and racing each other. Combined with the constellation dissolve above (which starts immediately at phase entry, overlapping the delayed crossfade), the sequence now reads as: lines begin → constellation connections start dissolving → background crossfade begins → stars deepen into the WebGL field → (separately, in the `earth` phase) Earth fades in. The most elaborate version from the brief (an explicit forward camera-dolly-into-the-field beat) was not built — a reasonable next iteration, not attempted this pass given the size of everything else in it.

## K2. Cinematic Camera Composition (implemented)

The camera language target was a written composition brief (a "close orbital flyby," Earth weighted lower-right/right, large empty negative space opposite it, curved diagonal horizon, camera looking past the limb rather than staring at dead-center) rather than a literal reference image in this pass — no image was actually attached to the request that specified it, so implementation followed the text description and was tuned by iterative in-browser screenshot comparison against that language.

Two bugs surfaced only through that browser QA loop, not from reading the code:
1. **`camera.lookAt(offCenterPoint)` still centers the frame.** Feeding `lookAt()` a point a small distance from the origin does not produce off-center framing — `lookAt` always orients the camera so its target lands at the exact center of the viewport, by definition. The fix (§6) is a base `lookAt(0,0,0)` followed by an incremental local `rotateY`/`rotateX`, which leaves Earth at the world origin while tilting the *view* — that's what actually pushes Earth toward one side of frame.
2. **`overflow-x: hidden` on `body`/`#root` silently killed page scroll.** A CSS quirk: pairing `overflow-x: hidden` with an unset (`visible`) `overflow-y` makes the UA auto-promote `overflow-y` to `auto`, turning `#root` into its own 1-viewport-tall scroll container instead of the page growing for `EarthJourneyScene`'s pinned `ScrollTrigger`. Invisible until a scene taller than one viewport existed. Fixed by using `overflow-x: clip` instead, which is exempt from that promotion rule. See `styles/global.css`.

Camera offset magnitudes were tuned empirically in the browser (per the brief's own instruction to do so) — see `data/journey.ts` for the current per-waypoint values and `three/CameraRig.tsx` for the mobile-specific scaling.

## K3. Earth Emerging From Cosmos + Regional Detail LOD (this pass)

Two problems were diagnosed directly by the user rather than found in review: (1) the Earth reveal did zero camera movement — Earth sat at a fixed `distance: 7.5` and only `uOpacity` animated 0→1, explicitly built as "no dramatic zoom" in an earlier pass; (2) the space→Earth handoff was a flat crossfade between two visually distinct starfields (Canvas2D `AmbientBackground` vs. WebGL `<Stars>`), reading as "graphic stars → emptiness → Earth" rather than one continuous shot. Per explicit instruction, shader/cloud/specular polish was deliberately *not* touched this pass — priority was the transition sequence and a real texture-detail architecture instead.

- **Reveal is now a real camera dolly-in, not just an opacity fade.** `three/revealCameraStore.ts` — a plain mutable object (`{ distance }`, same pattern as `progressStore.ts`) starting at `EARTH_REVEAL_CAMERA.distance × 1.9` — is read every frame by `CameraRig` (only while `progress` is still within the reveal→first-waypoint span; becomes a no-op once scroll moves progress forward, since the store has already settled to the real constant by then) and tweened by a GSAP timeline in `EarthCanvas.tsx`. The reveal timeline is now *sequenced*, not simultaneous: atmosphere haze blooms first (in otherwise-empty space, before there's a planet to attach it to) → camera distance dolly-in runs in parallel, slightly delayed → Earth's own opacity resolves in two stages (a quick dim silhouette, then a slower brighten into full surface detail) → both cloud decks catch up last, once the surface is already legible. `prefers-reduced-motion` collapses this to a single short fade with no dolly.
- **Regional detail LOD (`data/regionalTextures.ts` + `three/RegionalDetail.tsx` + `earthShader.ts`)** — the user's own proposed architecture: not full tiled/streaming terrain (explicitly called unnecessary for this project), but "while the camera is far, normal Earth; once it's close, a second higher-density crop of the same source imagery blends in over just that UV window." Three native (not upscaled) crops crops of the same 8K day-map source — Beijing/Tokyo/Cairo, each an 18°-half-width window — are blended into `dayColor` in the fragment shader via a branchless `smoothstep`-based edge mask (`regionalMask`, `regionalBlend`, `hasRegional` uniforms) driven by a proximity envelope in `RegionalDetail.tsx` (wider than the marker's own arrival envelope, so the detail insert is already present before the marker itself becomes visible). This directly answers "global Earth → regional detail → local detail → city" for its first two stages; a LEVEL-2 city-scale satellite tile (mentioned by the user as a concept, not requested outright) was not built this pass.
- **Two real, verified bugs were found and fixed while QA'ing the above** — neither is a matter of taste or polish; both were silently placing content at the wrong location on the globe:
  1. **`regionalTextures.ts`'s latitude formula was inverted.** It used `v = (lat + 90) / 180`; the shader's actual `vUv` (inherited directly from `SphereGeometry`'s own UV generation, which `three/latLng.ts`'s `latLngToVector3` is structurally identical to) is `v = (90 - lat) / 180`. Caught by cropping the *live* `public/assets/earth/earth-day.webp` asset at both formulas and comparing against known geography: the old formula placed Beijing's crop over Australia, Cairo's over southern Africa — always in the mirror hemisphere, which is why no seam was ever visible during approach (the destinations are all Northern Hemisphere; the inserts were rendering somewhere the camera never visits). Fixed by correcting the six `vMin`/`vMax` values; the crop image files themselves were already correct (the offline crop script used a different, correct formula) — only the shader's placement metadata was wrong.
  2. **The waypoint marker's pin was visually anchored ~100px away from its true geographic target.** `.waypoint-marker` was a flex column containing the pin *and* its label together, and `<Html center>` centers that whole element's box on the projected 3D point — so the label's height silently dragged the pin glyph away from the actual coordinate. The rotation/targeting math itself (`quaternionForLatLng`, `latLngToVector3`) was always exactly correct — proven by an isolated Node script reproducing the same three.js calls, which projects every waypoint to exact screen center — but the visible pin was floating well off that point, making destinations look geographically wrong even though the underlying targeting never was. Fixed in `global.css`: `.waypoint-marker` is now a zero-height anchor sized to the pin glyph alone; the label is `position: absolute` below it, no longer part of the centering calculation. Verified by measuring the live DOM: the pin's own tip now lands at the exact mathematically-predicted pixel for all three cities, not approximately.
  - **That fix immediately exposed a third, previously-masked bug: Cairo's label rendered entirely below the viewport.** Cairo's `CameraPose` (`lookAtOffset.y: 0.17`, the largest of the three, at the closest zoom distance of the three) pushes its anchor point close to the bottom edge by design — under the *old* buggy CSS, the pin visually floated ~100px above its true anchor, which accidentally kept the label on-screen. Once the anchor was corrected, the true anchor point (measured at `y≈863` of a 900px viewport) plus the label's own height (which scales up at closer camera distances via `Html`'s `distanceFactor`, ~150px tall for Cairo vs. ~100px for Beijing/Tokyo) pushed the label completely past `y=900` — 0% visible, not just clipped. Fixed by reducing Cairo's `positionOffset.y` (0.13→0.08) and `lookAtOffset.y` (0.17→0.1) in `data/journey.ts`; re-measured with the label now ending at `y≈850`, comparable margin to Beijing/Tokyo. This is a per-viewport-height empirical tuning, consistent with how the rest of `CameraPose` was tuned — not a structural guarantee against every possible screen height.
  3. Both bugs were invisible from reading the code and only surfaced by cross-checking rendered output against independently-computed ground truth (raw pixel crops for the first, a standalone three.js projection script + DOM `getBoundingClientRect()` for the second) — consistent with this project's established QA discipline (§K2's two prior bugs), but a reminder that "the math looks right" and "it renders where it should" are different claims.
- **Starfield handoff — partial answer only, not the full merge requested.** The user asked for the two starfields (Canvas2D `AmbientBackground` vs. WebGL `StarField`) to read as one continuous shot, not a crossfade between two visually distinct systems. What was actually built: during the `dissolveT` window already used for constellation-group dissolution, regular field-star radius now shrinks (`fieldShrink = 1 - dissolveT × 0.5`) and constellation anchor glow-halos fade out entirely, so the Canvas2D field's remaining stars converge toward the WebGL field's plainer pinprick character before the crossfade completes. This is a real improvement but *not* the deeper architectural merge (e.g. a shared coordinate/seed space between the two systems, or a single field that migrates from 2D to 3D) that "one continuous shot" implies — flagged here explicitly rather than claimed as solved.

## K4. City Postcard — full-screen video takeover at closest approach (mechanism built, assets pending)

Requested after seeing the corrected Cairo framing: at each waypoint's closest zoom, replace the globe temporarily with a short establishing-shot video of the destination (a "postcard from the city"), then release back to the globe as scroll continues toward the next waypoint — the reference was real aerial-photography mood images (Tokyo skyline/river, Tokyo-with-Fuji), not literal assets to embed (no rights to redistribute stock photography; the intent was "generate something in this register" via Higgsfield, same as every other generated asset in this project).

- **Budget blocked real generation this pass.** Balance checked via `balance`: 2 credits. The cheapest video model (`veo3_1_lite`, 4s) costs ≈4 credits — not enough for even one clip, let alone three. User chose (via explicit prompt): top up credits and generate real video for all three cities, full-screen takeover style. Generation was **not** attempted — nothing here claims to be a finished asset; see `data/journey.ts`'s `postcard` field, currently unset on all three waypoints with a comment explaining why.
- **The takeover mechanism itself was built and verified end-to-end**, independent of the still-pending video assets, so dropping in real Higgsfield output later is a one-line change per waypoint rather than new plumbing:
  - `data/journey.ts`: `Waypoint.postcard?: { video: string; poster: string }` — optional; a waypoint without one behaves exactly as before, no takeover.
  - `scenes/earth/CityPostcard.tsx`: one full-screen `position: fixed` overlay per waypoint that has a `postcard`. Opacity is driven by a proximity envelope around the waypoint's arrival (`FADE_IN 0.05 / HOLD 0.05 / FADE_OUT 0.055`, deliberately wider than the marker's own `0.07/0.045/0.09` arrival envelope so the takeover completes *after* the marker has settled in and clears *before* the camera starts moving toward the next waypoint) — computed inside a plain `requestAnimationFrame` loop reading `progressStore` directly, since this component lives outside the R3F `<Canvas>` and can't use `useFrame` the way `WaypointMarker` does. `prefers-reduced-motion` swaps the autoplaying `<video>` for a static `poster` image, no motion.
  - No new scroll distance was budgeted for the "hold" — it deliberately rides the existing near-arrival window where `CameraRig`'s smoothstep easing is already close to static, rather than reworking `timeline.ts`'s per-waypoint pacing weights.
  - CSS (`global.css`, `.city-postcard*`): `z-index: 3`, above both the canvas (`z-index: 0`) and the waypoint markers (drei's `Html zIndexRange` caps them at `2`) — a genuine takeover, not a layered composite. A bottom-anchored scrim gradient + the destination label (`--text-destination`) sits over the video, matching the "postcard" framing from the reference images.
  - **Verified in-browser** with a temporary placeholder (`beijing.webp`, the already-shipped regional crop, wired in as both `video` and `poster` to exercise the fade/opacity math without a real clip) and removed again afterward: the crossfade in/out is smooth, the label renders correctly, and the globe/pin are fully hidden at peak opacity. The placeholder incidentally re-confirmed §K3's regional-texture fix — the crop it briefly displayed full-screen is unambiguously the Beijing area (Bohai Bay, Korean coastline, North China Plain).
- **Not built**: any actual video content, and no decision yet on whether `<video>` (true animated clips) or a cheaper Ken-Burns pan/zoom over a still `generate_image` (2 credits flat vs. ≈4+ for video) is the final choice — the user picked "real video for all three" contingent on topping up, so this stays `<video>`-shaped rather than switched to the cheaper still-image path. Once credits are available, generation follows the established discipline: `get_cost`/`balance` check first, one candidate reviewed before committing, exact model/duration/resolution/cost reported per asset, nothing claimed as "ready" until it's actually wired into `journey.ts` and visible in the running app.

## K5. Scroll snap, arrival→arrival transition arcs, shader detail, and native-resolution day map

Requested once the Higgsfield credit blocker was acknowledged: make the Earth read as more cinematic, fix the texture, give scroll "concrete states at the cities," and give city-to-city transitions a nicer animation. Clarified with the user first (two genuinely ambiguous, consequential decisions): scroll "steps" means snap-on-release, not a slideshow or a UI-only indicator; the texture complaint is specifically "flat/fake overall look" plus "not sharp enough up close," not a resolution complaint about any one spot.

- **Scroll snap-on-release (`scenes/earth/EarthJourneyScene.tsx`)** — `ScrollTrigger`'s own `snap` option, targeting `[0, ...each waypoint's segment.end]` (built from the same `buildTimeline` output everything else already uses, not a separate hardcoded list). Scroll stays a live, continuous scrub while the user is actively scrolling; once they stop, GSAP eases the progress the rest of the way to whichever state is nearest — "concrete states at the cities" without turning the journey into a slideshow. Disabled entirely under `prefers-reduced-motion` (an automatic post-release scroll is itself a motion effect, and every other reduced-motion path in this project drops the extra movement rather than a softened version of it).
  - **QA note for future work on this**: verifying snap with synthetic scroll input is genuinely fragile. A single instant `window.scrollTo` jump doesn't reliably register as "the user was scrolling" the way GSAP's snap expects. Rapid synthetic wheel events (Playwright `mouse.wheel` fired faster than roughly every 100ms) trigger Chromium's own momentum/fling scrolling, adding uncontrolled extra distance on top of the literal deltas sent. And critically, the snap's own `delay` (0.12s) is shorter than a single Playwright↔browser IPC round-trip, so a naive "small wheel step, wait, check position" loop can get preempted by snap firing mid-loop, compounding into large apparent overshoots that look like a broken feature but aren't. What actually worked: gentle fixed-size wheel steps (~100px) with ~200ms pauses between them (slow enough that each step is a distinct, real scroll event) for verifying snap itself, and — for verifying something else entirely mid-transition (the arc below) where snap firing early would contaminate the result — temporarily setting `delay` to something absurd (30s) for that one diagnostic run only, then reverting it. Confirmed correct: snap follows scroll direction/velocity rather than blindly picking the nearest value, which is the desired UX (a small forward scroll-and-release completes forward to the next city rather than snapping backward to a nearer-but-wrong-direction point).
- **City-to-city transition arc (`three/CameraRig.tsx`)** — camera distance during a waypoint→waypoint leg is no longer a plain `lerp`; a `TRANSITION_ARC_HEIGHT` (0.85 Earth-radii) term scaled by `sin(π·t)` is added on top, bulging the distance outward at the transition's midpoint and back down to the normal arrival distance at both ends. Reads as "lift off to see more of the globe, then swoop down on the next destination" instead of a flat zoom between two fixed distances. Gated to real waypoint→waypoint legs only — not the initial reveal→first-arrival approach, which already has its own dedicated dolly via `revealCameraStore` (§K3) — and skipped under reduced motion, consistent with every other added-camera-travel effect in this project. Verified visually: the globe is visibly smaller mid-transition than at either arrival on both sides of it.
- **Shader — fine-grain surface detail (`three/earthShader.ts`)** — `perturbNormal` now blends two frequencies: the existing coarse `normalMap` (continent-scale relief, unchanged) plus a new, purely procedural high-frequency bump (`valueNoise`, a cheap hash-based value noise sampled at ~900× UV tiling, no new texture asset). The coarse map alone only tilts lighting at a continental scale, which up close reads as a lit photograph glued to a sphere; the fine layer is what gives the surface actual visual grain.
- **Shader — cinematic grade (`three/earthShader.ts`)** — replaced the flat `dayColor * 0.9` darkening (which dims shadows and highlights equally, a large part of why it read as "flat/synthetic") with a gentle contrast S-curve around midtones, plus a faint cool haze blended in toward the grazing limb via a Fresnel term computed from the *unperturbed* geometric normal (deliberately not the fine-grain-perturbed one, so the haze doesn't sparkle with the per-pixel bump noise). Real orbital photography always shows a hint of atmospheric haze right at the edge of the disk; without it, terrain reads as a texture pasted on a sphere all the way to the limb.
- **Native-resolution day map (`public/assets/earth/earth-day.webp`)** — the desktop tier was shipping the same 8K source (Solar System Scope, §Earth Textures) *downsampled to 4096×2048*, exactly half its native resolution, which is the direct cause of "not sharp enough up close": at these waypoints' close camera distances (≈2 Earth-radii from center, i.e. roughly one Earth-radius of *altitude*, from which horizon geometry puts on the order of 120° of the globe in view), a large fraction of the visible frame was always base-map texture, not the small regional-detail insert — so the base map's own resolution was the real bottleneck, not just the area right around each pin. Re-encoded at the source's full native **8192×4096** (1.34MB, up from 589KB — the established "quality over file size" precedent from §Earth Textures v2 applies again). `earth-normal.webp`/`earth-specular.webp` also bumped to their own full native 2K (2048×1024; both stayed under 90KB, negligible cost). Night map, cloud map, and the mobile tier were left untouched — the reported complaint was specifically about daylit close-up sharpness on desktop, and widening scope to everything risked a much bigger file-size hit for no reported benefit.
  - **This makes §K3's regional-detail LOD blend (`RegionalDetail.tsx`/`regionalTextures.ts`) redundant, not just less useful.** Both `dayMap` and `regionalMap` now read from the exact same 8192×4096 source at the exact same resolution — the regional crops were never anything but a subset of that same file's pixels, so with the base map no longer downsampled, blending in a "denser" crop of identical pixels is a no-op. It's still wired up and still harmless (no visual regression, no error), but it no longer earns its complexity. Not removed this pass — flagged here for a decision: either delete the subsystem, or replace its three crop images with a genuinely higher-resolution *different* source (the free 8K set has no more detail than this to extract; real city-block sharpness would need a different provider entirely, a bigger undertaking than a follow-up texture tweak).

## K6. Day map re-sourced directly from NASA (supersedes part of §K5/§K3)

The user asked, reasonably, why the day map was sourced through a third-party redistribution (Solar System Scope) instead of going straight to NASA — and separately proposed several commercial/CC marketplace 3D-Earth packages (Sketchfab, TurboSquid) as alternatives. Investigated both before touching any code:

- **The marketplace links didn't hold up.** Two `WebFetch` attempts failed outright (Sketchfab's page is client-rendered and returned no content; TurboSquid returned HTTP 403 to automated requests) — so nothing about those two could be verified at all, not even secondhand. Two further Sketchfab links did fetch: both CC-BY (free, attribution required, commercial use fine), but neither page exposed actual texture resolution, and one was tagged "game-ready"/"low-poly" — tags that describe assets optimized *down* for real-time rendering, not maximal source resolution, i.e. a signal to expect lower detail, not higher. No marketplace asset was purchased or used.
- **Went to NASA directly instead**, per the user's explicit choice. NASA's Blue Marble: Next Generation (`science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/`) is public domain (U.S. government work), MODIS-derived, monthly cloud-free composites at up to 21,600×10,800 (2km/pixel) as a single downloadable file — no tile-stitching needed at that tier (a higher, fully-tiled 500m/pixel option exists but would require assembling 8 separate quadrant tiles, judged not worth it against the gain — see below). Used the July composite (verified the exact URL actually resolves before downloading, not just trusted a search result). At 21,600×10,800 this is **2.6× the linear resolution** of the previous 8192×4096 desktop tier — confirmed empirically, not just by pixel-count math: cropping the same real-world 16°×16° window (Beijing) from both sources gave 960×960 native pixels from the NASA source vs. 364×364 from the old one, a clearly, visibly sharper result.
- **Hit WebP's own hard format ceiling immediately.** libwebp caps any single dimension at 16383px; NASA's 21,600px source exceeds that regardless of any file-size preference, so it had to come down. Shipped at **16,000×8,000** — as close to the ceiling as a clean 2:1 number allows, still 2× the previous linear resolution (4× the pixel count). Practical implication worth remembering: further hunting for an even-higher-resolution *source* is pointless until/unless the day map moves off WebP entirely (e.g. AVIF, which allows larger dimensions, or a tiled-texture architecture) — more source pixels than this cannot currently be used.
  - **Quality/size tuning was measured, not guessed**: quality 82 encoded to 5.05MB; quality 75 to 3.51MB with the same crop compared side-by-side and no visible difference at the zoom levels this project actually uses; quality 68 saved almost nothing further (3.35MB) over 75, i.e. diminishing returns had already been reached. Shipped at **quality 75, 3.51MB** (up from 1.34MB for the previous 8192×4096/quality-82 file — a real, deliberate size increase, consistent with this project's "quality over file size" precedent, but tuned rather than left at the first number that worked).
  - Raw NASA composites read visibly flatter/greyer than the previous (hand-graded) Solar System Scope source — a modest `saturation×1.12` / gentle contrast lift is applied during encoding to compensate; the shader's own cinematic grade (§K5) still does the heavier lifting on top of this at render time.
  - Night map, cloud map, normal map, and specular map are **unchanged** — untouched by this pass, still Solar System Scope-sourced. Rebuilding a matched night-lights/cloud/specular set from NASA's separate programs (Black Marble for night lights, etc.) is a materially bigger undertaking with no reported complaint driving it; not attempted.
  - Mobile tier (`earth-day-mobile.webp`, 2048×1024) was regenerated by downsampling from this same NASA source rather than resizing the *old* file — proper downsampling from a sharper source is strictly better than re-resizing an already-downsampled one, essentially free to do while already processing the desktop tier.
- **Caught and fixed a real regression this re-sourcing would otherwise have introduced.** §K5 already flagged the regional-detail LOD blend (§K3) as *redundant* once the base map matched its source's own resolution. Switching the *base* map to a different, higher-resolution source without also updating the three regional crop images would have made the blend actively **worse**, not just redundant: the crops were still built from the old 8192×4096 source (~23px/degree) while the new base map is ~44px/degree — turning the regional insert into a visible soft patch layered on top of a now-sharper base, and additionally introducing a color-grade seam (the new base map got a saturation/contrast correction the old crop files never had). Caught by computing the actual pixel densities rather than assuming "redundant" still meant "harmless" after an unrelated change. Fixed by regenerating all three regional crops (`public/assets/earth/regions/*.webp`) from the same NASA source, at native crop resolution (2160×2160, ~60px/degree — genuinely denser than the 44px/degree base map again) and the same color grade as the new base map. `data/regionalTextures.ts`'s UV bounds were untouched (same geography, same window size — only the pixel source changed), so no code changes were needed there, only the image files.

## K7. Reverted the `earth-model.glb` detour (§K7–K9 as they existed) back to this NASA-textured custom shader, by explicit user decision

Between this section and its prior version, the project went through: an authored `GalaxyField` star-cluster background (§K7 old), switching Earth to the user's own Sketchfab `earth-model.glb` rendered directly rather than through this custom shader (§K8 old, an explicit user decision at the time — real geography intentionally dropped), then a follow-up pass making that model's own mesh/materials the actual render path (§K9 old), then a further session fixing two real bugs in that pipeline (an atmosphere-shell primitive that was never fully hidden, and Earth's material being left permanently flagged transparent after its reveal fade — both genuinely root-caused and fixed, not worked around) plus a lighting/terminator tuning pass. All of that is still recoverable from git history (`e71438a`..`874f7b9`) if ever wanted again.

After seeing the fixed `earth-model.glb` result next to this NASA-textured version side by side, the user's call was that the NASA version was better overall — and separately noted `GalaxyField` never actually read as intentional in its shipped placement (a "subtle corner accent" next to Earth, not the interactive Intro/Question/Answer background it was meant to become — see the old §K7's deferred-work note), so there was nothing worth preserving there either. Reverted by restoring every file touched across that whole arc (`ARCHITECTURE.md`, `Earth.tsx`, `EarthCanvas.tsx`, `cloudShader.ts`, `earthShader.ts`, `sunDirection.ts`, `regionalTextures.ts`, `RegionalDetail.tsx`, the `earth-day`/`earth-night`/`earth-clouds`/`earth-normal`/`earth-specular` textures and the three regional crops) to their content as of `e71438a`, and removing every file added after it (`GalaxyField.tsx`, `earth-model.glb`, `galaxy.glb`, plus two stray untracked source `.glb` downloads that had accidentally been committed alongside the mesh-fix work). Verified end-to-end post-revert: typecheck, production build, and actual rendered screenshots at both the auto-reveal state and a waypoint arrival — real NASA geography, proper day/night terminator, no regressions from the revert itself.

## 7. GSAP / ScrollTrigger Architecture (implemented for what exists)

- `gsap/registerGsap.ts` registers `ScrollTrigger` and `@gsap/react`'s `useGSAP` once, at app entry.
- **Interactive-mode scenes** (Intro, StoryStepScene, EmptyBeat, TransitionScene) use plain GSAP timelines, scoped per component with `useGSAP(() => {...}, { scope: ref })`, triggered imperatively by state/phase changes — not by scroll.
- **`EarthJourneyScene`** creates exactly one `ScrollTrigger`: `pin: true`, `anticipatePin: 1`, `scrub: prefersReducedMotion ? true : 1` (boolean/no-lag under reduced motion so nothing keeps drifting once the user stops scrolling, per Part T), sized to `Math.max(2, journey.length) * 1.3 * viewportHeight`. Its `onUpdate` is the single write point into `progressStore` (§6).
- **Post-pin scenes** (`DestinationRevealScene`, `GiftRevealScene`, `FinalScene`) — not yet implemented; still planned as lightweight `ScrollTrigger.create({ trigger, toggleActions: ... })` entrance/exit triggers per the original plan.
- All instances are cleaned up automatically through `useGSAP`'s context revert on unmount.

## 7. GSAP / ScrollTrigger Architecture

- `gsap/registerGsap.ts` registers `ScrollTrigger` and `@gsap/react`'s `useGSAP` once, at app entry.
- **Interactive-mode scenes** (Intro, StoryStepScene, EmptyBeat, TransitionScene) use plain GSAP timelines, scoped per component with `useGSAP(() => {...}, { scope: ref })`, triggered imperatively by state/phase changes — not by scroll, since this half of the experience isn't scrollable content.
- **`EarthJourneyScene`** creates exactly one `ScrollTrigger`: `pin: true`, `scrub: true`, sized to give enough scroll distance for every waypoint plus the final approach (e.g. `end: '+=' + journey.length * viewportHeight * factor`). Its `onUpdate` is the single write point into the progress store described in §6.
- **Post-pin scenes** (`DestinationRevealScene`, `GiftRevealScene`, `FinalScene`) each get a lightweight `ScrollTrigger.create({ trigger, toggleActions: 'play none none reverse' })` for simple entrance/exit — no scrubbing, matching the Motion section's "text entrances" pattern rather than continuous scroll-linkage, since by this point the story has landed and no longer needs camera-like control.
- All instances are cleaned up automatically through `useGSAP`'s context revert on unmount, which also covers Replay (full remount of the cinematic document).

## 8. Waypoint Timeline System (implemented)

`data/timeline.ts` exports `buildTimeline(journey, overrides?): TimelineSegment[]` and `getActiveSegment(timeline, progress)`, so no magic scroll numbers exist anywhere in component code.

```ts
interface TimelineSegment {
  id: string;                 // 'earth-reveal' | waypoint.id
  start: number;                // 0–1
  end: number;                   // 0–1
  waypoint?: Waypoint;         // absent only for the leading 'earth-reveal' segment
}
```

`journey.ts` describes **what** the journey contains — geography, narrative labels, camera framing. `timeline.ts` alone decides **when**, in scroll terms, each beat happens. Nothing in `journey.ts` is a normalized `0..1` number.

Rules `buildTimeline` applies (as implemented — simpler than the original plan, see below):
1. Reserves a fixed leading band for Earth Reveal, `0.00–0.16` (`REVEAL_END`, a constant, not derived from `journey.length`).
2. The remaining range (`0.16–1.00`) is divided across the waypoints in array order **proportionally to each waypoint's `durationWeight`** (default `1` when omitted): a waypoint's slice size is `weight / sum(all weights)` of the remaining range. The current test journey gives Beijing and Tokyo weight `1`, Cairo `1.4` (a longer final approach).
3. **No separate trailing "final settle" band exists.** The last waypoint's segment always ends at exactly `1.0` — the "hold/settle" feel at the very end of scroll (Part K2's `0.95–1.00`) comes from `CameraRig`'s smoothstep easing decelerating naturally near the end of that segment, not from a dedicated band. This was a deliberate simplification once the smoothstep easing turned out to already produce that deceleration; a real trailing band remains a straightforward addition if a future pass needs a longer explicit hold.
4. **Escape hatch:** `overrides?: Record<waypointId, { start?, end? }>` — implemented, passed as the second argument to `buildTimeline`, never stored on the waypoint itself.

Adjacent-segment cross-fade for marker/label opacity (point 3 in the original plan) is handled differently than planned: rather than the timeline segments themselves overlapping, each `WaypointMarker` computes its own enter/exit trigger as a function of proximity to its segment's `end` (padded), which achieves the same "sequential, not simultaneous" cross-fade without segments overlapping in `buildTimeline`'s output.

Because `CameraRig` and `WaypointMarker` both consume the *output* of `buildTimeline`, changing the journey from Beijing/Tokyo/Cairo to the real destinations — or inserting an intermediate stop — means editing only `data/journey.ts` (content) and, if pacing should change, a `durationWeight`. No animation code changes required. `isFalseLead`/redirect-routing (original plan) are not implemented — see §4's "not yet implemented" note. `routeFrom` never shipped at all; route lines were removed outright rather than kept unused.

## 9. Higgsfield Asset Integration Plan (still future — destination assets only)

This section covers *destination* imagery (Beijing/Tokyo/Cairo/etc. reveal stills/video), not the Earth globe's own surface texture — that's §6, sourced from three.js's NASA-derived texture set, explicitly not Higgsfield per the brief.

### Higgsfield video experiment (two passes, both inconclusive on credits/quality)

**Pass 1:** the connector exposes real video-generation models (`generate_video`/`generate_video_batch`; catalog includes `seedance_2_5`, `kling3_0`, `veo3_1`/`veo3_1_lite`, `minimax_h3`, and others). `seedance_2_5` in `mode: 't2v'` was the best fit for a pure-text cinematic space clip, but the account's actual balance (6 credits) covered nowhere near its cost (~39 credits for a 6s/720p clip, ~10 for a minimal 4s/480p one) — confirmed via `get_cost` preflight before generating anything, not assumed. Asked the user how to proceed rather than either silently skipping the video pass or silently spending their remaining balance; they chose to spend it on one minimal test. Generated one `veo3_1_lite` clip (4s, 16:9, no audio, ~4 credits) with a prompt matching the brief's "Candidate A" language. Inspected three extracted frames (0.2s/1.5s/3s): the opening ~0.5s was appropriately restrained, but by 1.5s the nebula had grown into a busy, saturated, Hubble-photo-style composition — exactly the "busy"/"stock space wallpaper" failure mode the brief said to reject. **Rejected; not integrated anywhere in the app.**

**Pass 2:** balance re-checked at the start (`balance` tool, not assumed) — 2 credits remained after Pass 1, below even the cheapest known video option (~4 credits). No generation was attempted; stated directly in the response rather than blocking on another `AskUserQuestion` round-trip for a balance that couldn't cover even one more minimal clip.

**Pass 3 (this pass — cinematic city reveal):** balance re-checked again (`balance` tool) — still 2 credits. This pass's brief asked for a "high-detail city asset" fade-in at each destination's closest approach (Beijing/Tokyo/Cairo), which structurally requires generated imagery to fade into — there's nothing meaningful to build without it. Checked still-image cost via `get_cost` preflight (not assumed): `cinematic_studio_2_5` costs 2 credits per image regardless of resolution (1k or 2k, both quoted identically). 2 credits covers **exactly one** of the three cities. Generating one city's cinematic asset while leaving the other two with nothing would be a worse, more inconsistent result than generating none — flagged directly in the response rather than spent. **No city-reveal fade mechanism was built this pass** — building the transition machinery with no real asset to fade into, and only a placeholder gradient standing in for "cinematic city," would itself be exactly the kind of half-finished feature this project's conventions say to avoid. This is a genuine next step once the account has enough balance to cover all three cities symmetrically (≈6 credits minimum at current per-image pricing, likely more for video). No Higgsfield video or image asset is integrated anywhere in the app as of this pass. The procedural CSS/Canvas2D background plus the one still Higgsfield image already in use (`AmbientBackground`'s nebula-detail layer, §6a) remain the only Higgsfield-sourced visual assets in the project.

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

- **Implemented:** DPR capped via `Math.min(devicePixelRatio, 2)` on `EarthCanvas`.
- **Implemented:** the `three/` tree is code-split (`React.lazy`, `EarthCanvas` specifically) behind the Interactive-mode bundle, so Intro/Questions load and become interactive without paying for Three.js/R3F at all (verified in the production build: `EarthCanvas` is its own ~247KB-gzipped chunk, separate from the ~112KB main bundle).
- **Implemented:** `CameraRig` applies separate, more conservative offset/FOV/distance scaling on mobile rather than reusing desktop cinematic values (§K2) — found necessary during browser QA when a waypoint label clipped at the edge of a 390px viewport.
- **Implemented:** `prefers-reduced-motion` removes ScrollTrigger's scrub smoothing lag (`scrub: true` instead of `scrub: 1`) so nothing keeps drifting once the user stops scrolling, and disables `StarField`'s twinkle/rotation speed. Camera/rotation interpolation itself stays continuous rather than switching to fully discrete per-waypoint steps — a smaller-than-originally-planned scope for reduced motion, since continuous-but-lag-free scrubbing already satisfies "no automatic orbital drift" without the added complexity of a separate discrete-stepping code path.
- **Not yet implemented:** further DPR reduction via a `navigator.hardwareConcurrency` low-end heuristic; per-effect mobile toggles for `AtmosphereGlow` beyond the camera framing changes above; a no-WebGL fallback path (if WebGL is unavailable, `EarthCanvas` will currently fail to mount rather than degrading to a static image + DOM-only waypoint flow). These remain reasonable follow-ups but weren't blocking for validating the core mechanic.
- Earth stays a single fixed-detail 96-segment sphere across breakpoints — no adaptive geometry needed given the constrained camera range.

## 11. Accessibility Considerations

- `AnswerChip` is a real `<button>` with a visible focus ring (accent color matches the active phase), Tab/Arrow-key navigable, Enter/Space to select; selection is signaled by border-weight + glow, never by color alone. `TextAnswerInput` is a real `<input>` + `<button>` pair — native Tab order, native Enter-to-submit, no custom keyboard handling beyond that.
- Focus moves to the first interactive element (whichever it is for that step type) automatically when a new step mounts.
- `ProgressIndicator` is `aria-hidden` (intentionally decorative/subtle per DESIGN.md); the real step count is exposed via a Russian `aria-label` on the step container (`Шаг 3 из 5`) for assistive tech, derived from `getProgress()` (§4) so it matches whatever `ProgressIndicator` displays. All rendered/announced strings are Russian now (`aria-label="Варианты ответа"` on the choice group, `aria-label="Путешествие по Земле"` on `EarthJourneyScene`) — see the Russian-copy decision in §1.
- `CodeStep` feedback ("Не совсем.") is rendered with `role="status"` so a wrong attempt is announced without needing focus to move to it — but the message itself stays a plain restrained line, never a colored/iconic error state. The hint is no longer auto-revealed after N attempts; it's now a real `<button>` ("Подсказка") that appears after the first incorrect attempt and must be explicitly activated, which is both more accessible (a real focusable/keyboard-operable control instead of text that silently appears) and closer to the brief's "very subtle hint action" language.
- Because markers and destination text are real DOM (§6), screen readers get the full narrative even though the visual is WebGL — no text exists only inside the canvas. The WebGL canvas itself and `PersistentVisualLayer`/`AmbientBackground`'s containers are `aria-hidden`/`pointer-events: none` — purely decorative background, never a tab stop.
- Every phase-driven accent shift (violet → atmosphere → reveal) is paired with a scale/position/timing change, never used as the sole signal of meaning.
- `prefers-reduced-motion` is honored automatically at the OS level (§10); no extra in-app toggle is required for v1, but nothing here precludes adding one later.

## 12. Recommended Implementation Order

1. ✅ Scaffold Vite + React + TS; wire `variables.css` in; stand up `ExperienceContext`/reducer and `ExperienceRouter` with placeholder scenes.
2. ✅ Build Intro → Story-step flow end to end, data-driven from `story.ts` (mixed choice/text/task/code union), with GSAP entrance/exit. Fully demoable with zero WebGL.
2a. ✅ Layer in `AmbientBackground` (§6a) behind the Interactive-mode half, evolving continuously from `intro` through `space-transition`, including depth-layered stars and pointer parallax.
3. ✅ Build `EmptyBeatScene` + `TransitionScene`; wire the one-way transition into `storyPhase: 'earth'` directly (the `'earth-placeholder'` stand-in and its scene were removed this pass, not renamed — `EarthJourneyScene` replaced it outright).
3a. ✅ Translate all user-facing copy to Russian; `<html lang="ru">`; verify Cyrillic renders coherently through the existing font fallback stack (§1).
4. ✅ Stand up `PersistentVisualLayer`/`EarthCanvas` with Earth (custom shader, real day/night/normal/specular textures) + `AtmosphereGlow` + `StarField`, and its `space-transition` mount + crossfade-in-against-`AmbientBackground` lifecycle (§6/§6a/§D). The auto opacity-reveal (§6, `earth` phase) validates the no-remount invariant before scroll is wired in.
5. ✅ Add the pinned `ScrollTrigger` in `EarthJourneyScene`, `progressStore`, and `CameraRig`, driven by `journey.ts`'s three test waypoints (Beijing/Tokyo/Cairo) with `durationWeight`. This was indeed the highest-risk part of the build — two real bugs (the `lookAt`-always-centers issue and the `overflow-x` scroll-killing CSS quirk, both §K2) were only caught by actually scrolling the page in a browser, not by reading the code.
6. ✅ Layer in `WaypointMarkers` (monochrome pins, no route lines — built then removed on instruction), driven by `buildTimeline`/`getActiveSegment`.
6a. ✅ Cinematic camera composition pass (§K2): expanded `CameraPose` with `positionOffset`/`lookAtOffset`/`fov`, tuned by iterative in-browser screenshot comparison against the target composition language until at least one scroll position (Beijing's arrival) convincingly matched it.
7. Build `DestinationRevealScene` (with `AssetSlot` placeholders), `GiftRevealScene`, `FinalScene` + Replay — **not started**, explicitly out of scope for this pass.
8. Responsive pass: ✅ typography `clamp()` (pre-existing) + Russian line-break/wrapping check, mobile `scene-padding` (pre-existing), DPR cap (implemented), mobile-specific camera framing (implemented). **Not done:** a `hardwareConcurrency`-based low-end heuristic, a no-WebGL fallback path (§10).
9. Accessibility pass: ✅ focus states (pre-existing), Russian `aria-label`s, reduced-motion verification for the Earth journey specifically (Earth still appears, scroll still progresses, no auto-drift).
10. Fill in the real `journey.ts` content (replacing Beijing/Tokyo/Cairo) and drop in generated Higgsfield destination assets — **not started**, intentionally deferred until this test journey is reviewed.
