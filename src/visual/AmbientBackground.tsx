import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { STARS, mulberry32, GRAIN_SEED } from './seededRandom';
import { PHASE_CONFIG, type BackgroundPhase } from './backgroundPhases';

const GRAIN_SIZE = 128;

interface AmbientBackgroundProps {
  phase: BackgroundPhase;
}

/**
 * Persistent, non-WebGL background layer — CSS nebula glows + a Canvas2D star
 * field + a tiny grain tile. Mounted once behind ExperienceRouter (see App.tsx)
 * and never remounted between story steps, so it can evolve continuously
 * instead of cutting between phases. Superseded, not replaced, once Milestone 2
 * introduces PersistentVisualLayer for the real Earth journey — see ARCHITECTURE.md §6.
 */
export function AmbientBackground({ phase }: AmbientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(PHASE_CONFIG[phase]);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [grainUrl, setGrainUrl] = useState<string | null>(null);

  useEffect(() => {
    configRef.current = PHASE_CONFIG[phase];
  }, [phase]);

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
      ctx.clearRect(0, 0, width, height);
      const cfg = configRef.current;
      const t = (time / 1000) * cfg.motionSpeed;
      for (const star of STARS) {
        const twinkle = prefersReducedMotion
          ? 1
          : 0.55 + 0.45 * Math.sin(t * star.twinkleSpeed * 4 + star.twinkleOffset);
        const alpha = star.baseOpacity * cfg.starOpacity * twinkle;
        if (alpha <= 0.01) continue;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#f3ede4';
        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
        ctx.fill();
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
    <div className="ambient-background" aria-hidden="true">
      <div
        className="ambient-background__nebula ambient-background__nebula--violet"
        style={{ opacity: config.nebulaViolet }}
      />
      <div
        className="ambient-background__nebula ambient-background__nebula--blue"
        style={{ opacity: config.nebulaBlue }}
      />
      <canvas ref={canvasRef} className="ambient-background__canvas" />
      <div
        className="ambient-background__grain"
        style={grainUrl ? { backgroundImage: `url(${grainUrl})` } : undefined}
      />
    </div>
  );
}
