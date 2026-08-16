import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { SRGBColorSpace, type ShaderMaterial } from 'three';
import { journey } from '../data/journey';
import { buildTimeline } from '../data/timeline';
import { REGIONAL_TEXTURES } from '../data/regionalTextures';
import { progressStore } from './progressStore';

// Wider than WaypointMarker's arrival envelope on purpose — the regional
// texture should visibly build in well before the marker/label appear ("when
// the camera enters a certain range," not only at the last instant), and the
// destination's ordinary global-resolution surface should already look
// correct up to that point, so there's no jarring pop when this crosses in.
const FADE_IN = 0.16;
const HOLD = 0.05;
const FADE_OUT = 0.14;

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function proximity(progress: number, arrivalAt: number): number {
  if (progress < arrivalAt - FADE_IN) return 0;
  if (progress < arrivalAt) return smoothstep((progress - (arrivalAt - FADE_IN)) / FADE_IN);
  if (progress < arrivalAt + HOLD) return 1;
  if (progress < arrivalAt + HOLD + FADE_OUT) return 1 - smoothstep((progress - (arrivalAt + HOLD)) / FADE_OUT);
  return 0;
}

interface RegionalDetailProps {
  earthMaterialRef: RefObject<ShaderMaterial | null>;
}

// Drives Earth's regionalMap/regionalUvMin/regionalUvMax/regionalBlend
// uniforms (earthShader.ts) from scroll proximity to whichever destination is
// currently being approached — a second, denser crop of the same source
// imagery fades in over the small UV window around that city, well before
// the marker itself appears. Only one region is ever active at a time
// (whichever has the highest proximity value); the other two contribute 0.
export function RegionalDetail({ earthMaterialRef }: RegionalDetailProps) {
  const timeline = useRef(buildTimeline(journey)).current;
  const frameCounter = useRef(0);

  const textures = useTexture(REGIONAL_TEXTURES.map((r) => r.path));
  textures.forEach((tex) => {
    tex.colorSpace = SRGBColorSpace;
  });

  useFrame(() => {
    frameCounter.current += 1;
    if (frameCounter.current % 4 !== 0) return; // ~15Hz — a slow-moving blend doesn't need 60fps precision

    const material = earthMaterialRef.current;
    if (!material) return;

    const progress = progressStore.progress;
    let bestIndex = -1;
    let bestBlend = 0;
    REGIONAL_TEXTURES.forEach((region, index) => {
      const segment = timeline.find((s) => s.waypoint?.id === region.id);
      if (!segment) return;
      const blend = proximity(progress, segment.end);
      if (blend > bestBlend) {
        bestBlend = blend;
        bestIndex = index;
      }
    });

    if (bestIndex === -1) {
      material.uniforms.regionalBlend.value = 0;
      return;
    }

    const region = REGIONAL_TEXTURES[bestIndex];
    material.uniforms.regionalMap.value = textures[bestIndex];
    material.uniforms.regionalUvMin.value.set(region.uMin, region.vMin);
    material.uniforms.regionalUvMax.value.set(region.uMax, region.vMax);
    material.uniforms.regionalBlend.value = bestBlend;
    material.uniforms.hasRegional.value = 1;
  });

  return null;
}
