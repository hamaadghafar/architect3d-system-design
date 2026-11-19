import * as THREE from 'three';
import type { Vec3 } from '../types';

export interface PathOptions {
  /** Height of the arc at the middle of each segment. */
  arc?: number;
  /** Arc outward from `center` (for globes) instead of straight up. */
  radial?: boolean;
  center?: Vec3;
}

/**
 * A single curved hop between two points. Links and packets both use this,
 * so packets always ride exactly on the drawn link.
 */
export function segmentCurve(a: Vec3, b: Vec3, opts: PathOptions = {}): THREE.QuadraticBezierCurve3 {
  const { arc = 0, radial = false, center = [0, 0, 0] } = opts;
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const chordMid = va.clone().lerp(vb, 0.5);
  const control = chordMid.clone();

  if (radial) {
    const c = new THREE.Vector3(...center);
    const r = (va.distanceTo(c) + vb.distanceTo(c)) / 2;
    const dir = chordMid.clone().sub(c);
    if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
    // Desired apex on the curve; control point is pushed so the Bezier midpoint lands on it.
    const apex = c.clone().add(dir.setLength(r + arc));
    control.copy(apex).multiplyScalar(2).sub(chordMid);
  } else {
    control.y += arc * 2;
  }
  return new THREE.QuadraticBezierCurve3(va, control, vb);
}

/** Multi-hop path through waypoints (e.g. client → LB → server → LB → client). */
export function buildPath(waypoints: Vec3[], opts: PathOptions = {}): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 0; i < waypoints.length - 1; i++) {
    path.add(segmentCurve(waypoints[i], waypoints[i + 1], opts));
  }
  return path;
}

/** Latitude/longitude (degrees) to a point on a sphere. */
export function latLon(lat: number, lon: number, radius: number, center: Vec3): Vec3 {
  const phi = THREE.MathUtils.degToRad(lat);
  const lambda = THREE.MathUtils.degToRad(lon);
  return [
    center[0] + radius * Math.cos(phi) * Math.sin(lambda),
    center[1] + radius * Math.sin(phi),
    center[2] + radius * Math.cos(phi) * Math.cos(lambda),
  ];
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function lift(p: Vec3, dy: number): Vec3 {
  return [p[0], p[1] + dy, p[2]];
}
