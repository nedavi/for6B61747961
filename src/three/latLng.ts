import { Quaternion, Vector3 } from 'three';

/**
 * Standard lat/lng → sphere position conversion matching the UV unwrap of
 * three.js's default SphereGeometry with an equirectangular Earth texture
 * (longitude 0 sits at the texture's center seam convention used by the
 * classic three.js Earth demos this project's textures come from).
 */
export function latLngToVector3(lat: number, lng: number, radius = 1): Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

// The Earth group's "front" — the direction a rotated waypoint should end up
// facing so it reads as pointed at the camera/viewer, which sits along +Z.
const FRONT = new Vector3(0, 0, 1);

/**
 * The quaternion that rotates the Earth group (starting from identity
 * orientation) so that the given lat/lng point faces the camera. Geographic
 * targeting only — this never touches cinematic camera framing (CameraPose),
 * which is layered on top separately in CameraRig.
 */
export function quaternionForLatLng(lat: number, lng: number): Quaternion {
  const point = latLngToVector3(lat, lng, 1).normalize();
  return new Quaternion().setFromUnitVectors(point, FRONT);
}

/** Great-circle interpolation between two unit vectors — used by RouteLine to
 *  draw an arc that follows the sphere's surface rather than cutting through it. */
export function slerpOnSphere(a: Vector3, b: Vector3, t: number): Vector3 {
  const start = a.clone().normalize();
  const end = b.clone().normalize();
  const dot = Math.min(1, Math.max(-1, start.dot(end)));
  const theta = Math.acos(dot) * t;
  const relative = end.sub(start.clone().multiplyScalar(dot));
  if (relative.lengthSq() < 1e-10) return start;
  relative.normalize();
  return start.clone().multiplyScalar(Math.cos(theta)).add(relative.multiplyScalar(Math.sin(theta)));
}
