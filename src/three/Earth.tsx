import { useEffect, useMemo, type RefObject } from 'react';
import { useGLTF } from '@react-three/drei';
import type { Material, Mesh } from 'three';

const EARTH_MODEL_URL = '/assets/space/earth-model.glb';

// The source file's Earth sphere (node "pSphere1") bakes its own radius into
// the node's scale (~96.72 local units) rather than the geometry itself
// being unit-radius. Normalizing the whole loaded scene down by that same
// factor makes it read as "radius 1" — every camera distance in
// data/journey.ts already assumes that, and this way none of them needed
// to change when the Earth mesh itself did.
const MODEL_SCALE = 1 / 96.724;

const EARTH_MESH_NAME = 'pSphere1_phong1_0';
// The model's own atmosphere shell (pSphere5_lambert7_0) uses
// KHR_materials_transmission (glass-like refraction) with no texture, which
// needs a transmission render target this project's plain R3F Canvas setup
// doesn't provide — confirmed as the cause of a close-range flat-blue-
// sphere bug (the untextured transmission material rendered as an opaque
// blue surface obscuring Earth+clouds underneath it). Hidden; this
// project's own AtmosphereGlow (three/AtmosphereGlow.tsx) provides the
// rim-light effect instead.
const HIDE_MESHES = new Set(['pSphere5_lambert7_0']);
const CLOUDS_MESH_NAME = 'pSphere4_lambert6_0';
// The source file places Earth's surface and its clouds shell at the exact
// same radius (measured directly from both meshes' vertex positions) — not
// the actual cause of the banding artifact investigated in ARCHITECTURE.md
// §K9 (that turned out to be EarthCanvas's reveal fade leaving Earth's own
// material permanently flagged transparent), but real clouds do float above
// the surface, and rendering them exactly coincident with it has no upside.
const CLOUDS_RADIAL_SCALE = 1.006;

// The source file's exporter splits every sphere (Earth/clouds/atmosphere)
// into two glTF primitives once it crosses the 16-bit index limit (~65536
// vertices) — three's GLTFLoader turns that into two sibling Mesh objects,
// the first keeping the mesh's plain name and the second suffixed "_1".
// Every name-based check below (hiding the atmosphere shell, finding "the"
// Earth mesh) needs to match BOTH halves, or it silently only ever touches
// one of the two roughly-40%-of-the-sphere pieces — which is exactly what
// let the atmosphere shell's second chunk keep rendering, undetected,
// through every previous attempt at this artifact (ARCHITECTURE.md §K9).
function matchesMeshName(objName: string, baseName: string): boolean {
  return objName === baseName || objName === `${baseName}_1`;
}

interface EarthProps {
  meshRef: RefObject<Mesh | null>;
  /** The Earth surface's own material — this is what EarthCanvas's reveal
   *  timeline actually animates toward opacity 1; see materialsRef below for
   *  the rest of the model (clouds, atmosphere shell) which fades in step
   *  with it. */
  materialRef: RefObject<Material | null>;
  /** Every material found anywhere in the loaded model (Earth + clouds +
   *  atmosphere) — the whole thing fades in as one object, matching how the
   *  source file was authored, rather than staging Earth/clouds separately
   *  the way the previous from-scratch shader pipeline did. */
  materialsRef: RefObject<Material[]>;
}

// Renders the user's chosen Sketchfab model (public/assets/space/earth-model.glb)
// directly — its own mesh, its own PBR materials (day/night via baseColor +
// emissiveTexture, clouds and an atmosphere shell both included in the same
// file) — rather than extracting textures into this project's own custom
// shader. Day/night switching falls out of ordinary additive PBR shading
// with no custom terminator math needed: emissive is added on top of
// lit-surface color, so on the sunlit side it's visually swamped by the
// (much brighter) lit color, while on the shadowed side the same emissive
// value is the only signal left — city lights that read as "on at night"
// for free.
export function Earth({ meshRef, materialRef, materialsRef }: EarthProps) {
  const { scene } = useGLTF(EARTH_MODEL_URL);

  const cleanedScene = useMemo(() => {
    // Defensive dedup in case a future export of this model contains true
    // exact-name-duplicate nodes under the same parent (which would render
    // as two overlapping spheres fighting over the same depth-buffer
    // pixels) — not currently the case for earth-model.glb (its apparent
    // "duplicates" are actually the two glTF primitives one mesh gets split
    // into, see matchesMeshName above), but cheap to keep as a guard.
    const seenAtParent = new Map<string, Set<string>>();
    // Collected during traversal and removed afterward — mutating the
    // scene graph (removing a node) WHILE scene.traverse() is actively
    // walking it is unsafe (traverse iterates each node's live `children`
    // array, so removing a child mid-walk can skip siblings).
    const toRemove: Mesh[] = [];
    scene.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh || !obj.parent) return;
      const key = obj.parent.uuid;
      const seen = seenAtParent.get(key) ?? new Set<string>();
      seenAtParent.set(key, seen);
      if (matchesMeshName(obj.name, CLOUDS_MESH_NAME)) {
        obj.scale.setScalar(CLOUDS_RADIAL_SCALE);
      }
      if ([...HIDE_MESHES].some((name) => matchesMeshName(obj.name, name))) {
        // A plain .visible = false was the first attempt here, but
        // MeshPhysicalMaterial's transmission (KHR_materials_transmission)
        // renders via an extra background pass that may not respect normal
        // visibility culling the same way opaque materials do — removing
        // the node from the scene graph entirely is the more forceful,
        // unambiguous version of "this doesn't render," tested specifically
        // because a persistent lighting-dependent artifact (ARCHITECTURE.md
        // §K9) survived every fix targeting the Earth mesh itself.
        toRemove.push(mesh);
      } else if (seen.has(obj.name)) {
        obj.visible = false;
      } else {
        seen.add(obj.name);
      }
    });
    for (const mesh of toRemove) mesh.removeFromParent();
    return scene;
  }, [scene]);

  useEffect(() => {
    const materials: Material[] = [];
    cleanedScene.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh || !mesh.visible) return;
      if (matchesMeshName(mesh.name, EARTH_MESH_NAME)) {
        meshRef.current = mesh;
      }
      const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of meshMaterials) {
        mat.transparent = true;
        mat.opacity = 0;
        materials.push(mat);
        if (matchesMeshName(mesh.name, EARTH_MESH_NAME)) {
          materialRef.current = mat;
        }
      }
    });
    materialsRef.current = materials;
  }, [cleanedScene, meshRef, materialRef, materialsRef]);

  return (
    <group scale={MODEL_SCALE}>
      <primitive object={cleanedScene} />
    </group>
  );
}

useGLTF.preload(EARTH_MODEL_URL);
