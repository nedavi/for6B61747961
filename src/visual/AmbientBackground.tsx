import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { STARS, mulberry32, GRAIN_SEED } from './seededRandom';
import { PHASE_CONFIG, type BackgroundPhase } from './backgroundPhases';
import { CONSTELLATION_STARS, CONSTELLATION_STATES, DISSOLVED_STATE, type GroupId, type GroupState } from './constellations';

const GRAIN_SIZE = 128;
// How long every group eases toward the dissolved/shared-field state once
// space-transition begins — groups stop reading as distinct clusters and
// quietly become part of the ordinary star field (visual/constellations.ts).
const DISSOLVE_MS = 3200;
// Per-frame lerp rate for star brightness/size/drift easing toward their
// current group target — tuned for a ~1.2-1.8s settle, matching the "1-2
// second interpolation window, no sudden changes" requirement.
const STAR_EASE_RATE = 0.045;

interface AmbientBackgroundProps {
  phase: BackgroundPhase;
  /** Defaults true. Set false once PersistentVisualLayer's real WebGL star
   *  field has taken over (Part D) — fades the whole layer out via GSAP rather
   *  than unmounting, so there is never a hard cut, only a crossfade. */
  visible?: boolean;
  /** Normalized 0..1 progress through the question sequence specifically —
   *  drives the constellation reveal (visual/constellations.ts). Stays at 1
   *  once the sequence is done; connections then dissolve based on `phase`
   *  reaching 'space-transition', not on this value changing further. */
  storyProgress?: number;
}

/**
 * Persistent, non-WebGL background layer — CSS nebula glows + a Canvas2D star
 * field + a tiny grain tile. Mounted once behind ExperienceRouter (see App.tsx)
 * and never remounted between story steps, so it can evolve continuously
 * instead of cutting between phases. Superseded, not replaced, once Milestone 2
 * introduces PersistentVisualLayer for the real Earth journey — see ARCHITECTURE.md §6.
 */
// Pointer-parallax ceilings from DESIGN.md/§11 — small enough to read as depth,
// never large enough for the background to feel like it's chasing the cursor.
const NEBULA_PARALLAX_PX = { violet: 9, blue: 6 };

export function AmbientBackground({ phase, visible = true, storyProgress = 0 }: AmbientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const violetRef = useRef<HTMLDivElement>(null);
  const blueRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const configRef = useRef(PHASE_CONFIG[phase]);
  const storyProgressRef = useRef(storyProgress);
  const dissolveStartRef = useRef<number | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [grainUrl, setGrainUrl] = useState<string | null>(null);

  // Per-star smoothed current values — each star eases toward its group's
  // current target state every frame (STAR_EASE_RATE) rather than snapping
  // when the story step changes. A ref, not state: read/written every
  // animation frame, never through React.
  const constellationCurrentRef = useRef<Map<string, { brightness: number; sizeScale: number; x: number; y: number }>>(
    (() => {
      const map = new Map<string, { brightness: number; sizeScale: number; x: number; y: number }>();
      for (const star of CONSTELLATION_STARS) {
        map.set(star.id, { brightness: 0, sizeScale: 1, x: star.x, y: star.y });
      }
      return map;
    })(),
  );

  useEffect(() => {
    storyProgressRef.current = storyProgress;
  }, [storyProgress]);

  useEffect(() => {
    if (!containerRef.current) return;
    // Delayed + slower than a plain crossfade (Part 11): the transition lines
    // get a moment to play against the still-mostly-intact background first,
    // so the WebGL handoff reads as one staged beat in a sequence rather than
    // an instant swap the moment the phase changes.
    gsap.to(containerRef.current, {
      opacity: visible ? 1 : 0,
      duration: prefersReducedMotion ? 0.4 : 4.2,
      delay: prefersReducedMotion || visible ? 0 : 1.3,
      ease: 'power2.inOut',
    });
  }, [visible, prefersReducedMotion]);

  // Eased pointer offset, normalized -1..1 per axis. A ref (not state) since it's
  // read every animation frame, not something that should trigger React re-renders.
  const pointerTarget = useRef({ x: 0, y: 0 });
  const pointerEased = useRef({ x: 0, y: 0 });

  useEffect(() => {
    configRef.current = PHASE_CONFIG[phase];
    if (phase === 'space-transition' && dissolveStartRef.current === null) {
      dissolveStartRef.current = performance.now();
    }
  }, [phase]);

  // Desktop-only pointer parallax: fine pointer + hover capability, not touch,
  // and never under prefers-reduced-motion (§11/§22).
  useEffect(() => {
    if (prefersReducedMotion) return;
    const supportsHoverParallax = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!supportsHoverParallax) return;

    function handlePointerMove(event: PointerEvent) {
      const nx = (event.clientX / window.innerWidth) * 2 - 1;
      const ny = (event.clientY / window.innerHeight) * 2 - 1;
      pointerTarget.current = { x: nx, y: ny };
    }
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [prefersReducedMotion]);

  // Star field: drawn on a single canvas, positions never regenerated.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    function draw(time: number) {
      if (!ctx) return;

      // Ease pointer offset toward its target so the sky drifts gently rather
      // than snapping to the cursor.
      const ease = prefersReducedMotion ? 1 : 0.06;
      pointerEased.current.x += (pointerTarget.current.x - pointerEased.current.x) * ease;
      pointerEased.current.y += (pointerTarget.current.y - pointerEased.current.y) * ease;

      if (violetRef.current) {
        violetRef.current.style.transform = `translate(${pointerEased.current.x * NEBULA_PARALLAX_PX.violet}px, ${pointerEased.current.y * NEBULA_PARALLAX_PX.violet}px)`;
      }
      if (blueRef.current) {
        blueRef.current.style.transform = `translate(${pointerEased.current.x * -NEBULA_PARALLAX_PX.blue}px, ${pointerEased.current.y * -NEBULA_PARALLAX_PX.blue}px)`;
      }

      ctx.clearRect(0, 0, width, height);
      const cfg = configRef.current;
      const t = (time / 1000) * cfg.motionSpeed;

      // How far into the space-transition dissolve we are — computed once
      // per frame and reused below by both the field stars and the
      // constellation groups, so "losing graphic quality" reads as one
      // coordinated sky-wide change rather than two unrelated effects.
      const dissolveElapsed = dissolveStartRef.current === null ? 0 : time - dissolveStartRef.current;
      const dissolveT = Math.min(1, Math.max(0, dissolveElapsed / DISSOLVE_MS));
      // Field stars shrink toward small, plain pinpricks as the dissolve
      // progresses — visually converging toward how the WebGL star field
      // renders (three/StarField.tsx) rather than just fading out at their
      // original "graphic" size, which is what makes the handoff read as
      // "these vector stars become physical" instead of "one field fades,
      // a different field appears."
      const fieldShrink = 1 - dissolveT * 0.5;

      for (const star of STARS) {
        const twinkle = prefersReducedMotion
          ? 1
          : 0.55 + 0.45 * Math.sin(t * star.twinkleSpeed * 4 + star.twinkleOffset);
        const alpha = star.baseOpacity * cfg.starOpacity * twinkle;
        if (alpha <= 0.01) continue;
        const px = star.x * width + pointerEased.current.x * star.parallax;
        const py = star.y * height + pointerEased.current.y * star.parallax;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#f3ede4';
        ctx.beginPath();
        ctx.arc(px, py, star.radius * fieldShrink, 0, Math.PI * 2);
        ctx.fill();
      }

      // Constellation layer — authored star groups, no connecting lines
      // (visual/constellations.ts). Each star continuously eases toward its
      // group's current target { brightness, sizeScale, drift } rather than
      // snapping on step change — the sky quietly reorganizes itself.
      const storyProgressValue = storyProgressRef.current;
      const stateIndex = Math.min(
        CONSTELLATION_STATES.length - 1,
        Math.max(0, Math.round(storyProgressValue * (CONSTELLATION_STATES.length - 1))),
      );
      const easeRate = prefersReducedMotion ? 1 : STAR_EASE_RATE;

      for (const star of CONSTELLATION_STARS) {
        const stepTarget = CONSTELLATION_STATES[stateIndex][star.groupId as GroupId];
        const target: GroupState =
          dissolveT > 0
            ? {
                brightness: stepTarget.brightness + (DISSOLVED_STATE.brightness - stepTarget.brightness) * dissolveT,
                sizeScale: stepTarget.sizeScale + (DISSOLVED_STATE.sizeScale - stepTarget.sizeScale) * dissolveT,
                drift: stepTarget.drift,
              }
            : stepTarget;

        const current = constellationCurrentRef.current.get(star.id);
        if (!current) continue;
        const targetX = star.x + target.drift.x;
        const targetY = star.y + target.drift.y;
        current.brightness += (target.brightness - current.brightness) * easeRate;
        current.sizeScale += (target.sizeScale - current.sizeScale) * easeRate;
        current.x += (targetX - current.x) * easeRate;
        current.y += (targetY - current.y) * easeRate;

        const twinkle = prefersReducedMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 0.5 + star.x * 41 + star.y * 23);
        const alpha = Math.min(1, current.brightness * twinkle * cfg.starOpacity * 1.1);
        if (alpha <= 0.01) continue;
        const px = current.x * width + pointerEased.current.x * star.parallax;
        const py = current.y * height + pointerEased.current.y * star.parallax;
        const radius = star.baseRadius * current.sizeScale;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#f3ede4';
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
        // A faint glow on brighter stars only, so dim/background members of a
        // fading group don't all carry the same halo — and it fades out
        // entirely as the dissolve completes, since a soft glowing halo is
        // exactly the "graphic/vector" quality real stars don't have; without
        // this the anchors would still look illustrated after "becoming part
        // of" the physical WebGL star field.
        if (current.brightness > 0.4 && dissolveT < 1) {
          ctx.globalAlpha = alpha * 0.28 * (1 - dissolveT);
          ctx.beginPath();
          ctx.arc(px, py, radius * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [prefersReducedMotion]);

  // Grain: generated once into a tiny offscreen canvas, then tiled via CSS.
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = GRAIN_SIZE;
    canvas.height = GRAIN_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.createImageData(GRAIN_SIZE, GRAIN_SIZE);
    const random = mulberry32(GRAIN_SEED);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const v = Math.floor(random() * 255);
      imageData.data[i] = v;
      imageData.data[i + 1] = v;
      imageData.data[i + 2] = v;
      imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    setGrainUrl(canvas.toDataURL());
  }, []);

  const config = PHASE_CONFIG[phase];

  return (
    <div ref={containerRef} className="ambient-background" aria-hidden="true">
      {/* Parallax wrapper carries the JS-driven pointer transform; the inner div
          carries the CSS keyframe drift — separate elements because a CSS
          animation on `transform` always wins over an inline style on the same
          property, so pointer offset and drift can't share one node. */}
      <div ref={violetRef} className="ambient-background__nebula-parallax">
        <div
          className="ambient-background__nebula ambient-background__nebula--violet"
          style={{ opacity: config.nebulaViolet }}
        />
      </div>
      <div ref={blueRef} className="ambient-background__nebula-parallax">
        <div
          className="ambient-background__nebula ambient-background__nebula--blue"
          style={{ opacity: config.nebulaBlue }}
        />
      </div>
      {/* Higgsfield-generated detail layer — a single low-opacity organic texture
          on top of the procedural radial-gradient nebulas, which can only read as
          smooth blobs on their own. Purely additive: the background is fully
          functional with this element absent. Opacity tracks the same nebula
          intensity the phase config already drives, so it never needs its own
          phase table (ARCHITECTURE.md §6a). */}
      <div
        className="ambient-background__detail"
        style={{ opacity: Math.min(0.16, (config.nebulaViolet + config.nebulaBlue) * 0.28) }}
      />
      <canvas ref={canvasRef} className="ambient-background__canvas" />
      <div
        className="ambient-background__grain"
        style={grainUrl ? { backgroundImage: `url(${grainUrl})` } : undefined}
      />
    </div>
  );
}
