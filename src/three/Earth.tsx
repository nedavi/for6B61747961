import { useEffect, useMemo, type RefObject } from 'react';
import { useGLTF } from '@react-three/drei';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { Material, Mesh } from 'three';

// Hand-rolled vertex weld, standing in for three/examples' mergeVertices —
// that utility throws on this specific file's geometry (`setters[k]` ends
// up NaN, meaning some attribute's own itemSize metadata is malformed,
// likely from the gltf-transform dedup/prune pass this asset went through
// upstream). Reflecting over itemSize/getters/setters generically is
// exactly what trips on that; reading position/uv directly with fixed,
// known shapes sidesteps it entirely. Normals are dropped and recomputed
// from the welded topology rather than carried over, since the whole point
// is to get faces that actually share vertices.
function weldAndSmooth(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const index = geometry.index;
  const vertexCount = position.count;

  const posMap = new Map<string, number>();
  const newPositions: number[] = [];
  const newUVs: number[] = [];
  const remap = new Int32Array(vertexCount);

  for (let i = 0; i < vertexCount; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const key = `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
    let welded = posMap.get(key);
    if (welded === undefined) {
      welded = newPositions.length / 3;
      newPositions.push(x, y, z);
      if (uv) newUVs.push(uv.getX(i), uv.getY(i));
      posMap.set(key, welded);
    }
    remap[i] = welded;
  }

  const newIndex: number[] = [];
  if (index) {
    for (let i = 0; i < index.count; i++) newIndex.push(remap[index.getX(i)]);
  } else {
    for (let i = 0; i < vertexCount; i++) newIndex.push(remap[i]);
  }

  const welded = new BufferGeometry();
  welded.setAttribute('position', new Float32BufferAttribute(newPositions, 3));
  if (newUVs.length) welded.setAttribute('uv', new Float32BufferAttribute(newUVs, 2));
  welded.setIndex(newIndex);
  welded.computeVertexNormals();
  return welded;
}

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
    // Every sphere in this file (Earth/clouds/atmosphere) has its mesh node
    // duplicated exactly — same name, same transform, same material — under
    // its parent, almost certainly an FBX->glTF export artifact rather than
    // intentional LOD (there's no LOD extension in the file, and glTF has
    // no built-in mesh-swap-by-distance mechanism regardless). Rendering
    // both copies verbatim means two perfectly overlapping spheres fighting
    // over the same depth-buffer pixels (z-fighting). Keep only the first
    // occurrence of each duplicate pair, per parent.
    const seenAtParent = new Map<string, Set<string>>();
    scene.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh || !obj.parent) return;
      const key = obj.parent.uuid;
      const seen = seenAtParent.get(key) ?? new Set<string>();
      seenAtParent.set(key, seen);
      if (seen.has(obj.name) || HIDE_MESHES.has(obj.name)) {
        obj.visible = false;
      } else {
        seen.add(obj.name);
      }
    });
    return scene;
  }, [scene]);

  useEffect(() => {
    const materials: Material[] = [];
    cleanedScene.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh || !mesh.visible) return;
      if (mesh.name === EARTH_MESH_NAME) {
        meshRef.current = mesh;
        // Welds near-coincident vertices and recomputes smooth normals — a
        // real, if minor, correctness improvement (roughly 1% of vertices
        // were genuinely duplicated, consistent with normal UV-seam
        // splitting rather than a systemically broken export). This is
        // NOT a fix for the faceted-lighting artifact visible near the
        // terminator (see ARCHITECTURE.md §K9) — that turned out to be
        // unaffected by welding, normals, metalness, roughness,
        // flatShading, and polygonOffset alike, despite being confirmed
        // both lighting-dependent (vanishes with all scene lights off) and
        // specific to this mesh (vanishes if the mesh itself is hidden).
        // Left unresolved and documented rather than papered over.
        try {
          mesh.geometry = weldAndSmooth(mesh.geometry);
        } catch (err) {
          console.warn('Earth geometry weld failed, using original geometry', err);
        }
      }
      const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of meshMaterials) {
        mat.transparent = true;
        mat.opacity = 0;
        materials.push(mat);
        if (mesh.name === EARTH_MESH_NAME) {
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
