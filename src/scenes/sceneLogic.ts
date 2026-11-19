/**
 * Pure simulation logic shared by scenes and the telemetry registry.
 * Kept out of component files so React Fast Refresh works.
 */
import * as THREE from 'three';
import type { LinkMode, Vec3 } from '../types';
import type { LinkStatus } from '../components/three/NetworkLink';
import { latLon } from '../three/paths';

// ---------- Hybrid cloud ----------
export function effectiveLink(linkMode: LinkMode, failure: boolean): LinkMode {
  if (!failure) return linkMode;
  return linkMode === 'dx' ? 'vpn' : 'dx';
}

export function linkStatus(type: LinkMode, linkMode: LinkMode, failure: boolean): LinkStatus {
  if (failure && type === linkMode) return 'down';
  return type === effectiveLink(linkMode, failure) ? 'active' : 'backup';
}

// ---------- VPN vs Direct Connect ----------
export type PathId = 't1' | 't2' | 'dx';

export function connectivityState(
  linkMode: LinkMode,
  failure: boolean,
): { dx: LinkStatus; t1: LinkStatus; t2: LinkStatus; paths: PathId[] } {
  if (linkMode === 'vpn') {
    return { dx: 'idle', t1: failure ? 'down' : 'active', t2: 'active', paths: failure ? ['t2'] : ['t1', 't2'] };
  }
  return {
    dx: failure ? 'down' : 'active',
    t1: failure ? 'active' : 'backup',
    t2: failure ? 'active' : 'backup',
    paths: failure ? ['t1', 't2'] : ['dx'],
  };
}

// ---------- Anycast ----------
export const GLOBE_CENTER: Vec3 = [0, 5.6, 0];
export const GLOBE_RADIUS = 5;

export const POPS = [
  { name: 'Ashburn', lat: 39, lon: -77.5 },
  { name: 'Frankfurt', lat: 50.1, lon: 8.7 },
  { name: 'Singapore', lat: 1.35, lon: 103.8 },
  { name: 'São Paulo', lat: -23.5, lon: -46.6 },
  { name: 'Tokyo', lat: 35.7, lon: 139.7 },
  { name: 'Sydney', lat: -33.9, lon: 151.2 },
];
export const FAILED_POP = 1; // Frankfurt

export const ANYCAST_CLIENTS = [
  { name: 'New York', lat: 40.7, lon: -74 },
  { name: 'London', lat: 51.5, lon: -0.1 },
  { name: 'Lagos', lat: 6.5, lon: 3.4 },
  { name: 'Mumbai', lat: 19.1, lon: 72.9 },
  { name: 'Buenos Aires', lat: -34.6, lon: -58.4 },
  { name: 'Seoul', lat: 37.6, lon: 127 },
  { name: 'Melbourne', lat: -37.8, lon: 145 },
];

function unit(lat: number, lon: number) {
  return new THREE.Vector3(...latLon(lat, lon, 1, [0, 0, 0]));
}

/** Nearest PoP by great-circle angle — a stand-in for BGP’s best path. */
export function nearestPop(clientIndex: number, excluded: number | null): number {
  const c = ANYCAST_CLIENTS[clientIndex];
  const cv = unit(c.lat, c.lon);
  let best = 0;
  let bestAngle = Infinity;
  POPS.forEach((p, i) => {
    if (i === excluded) return;
    const ang = cv.angleTo(unit(p.lat, p.lon));
    if (ang < bestAngle) {
      bestAngle = ang;
      best = i;
    }
  });
  return best;
}

export function greatCircleKm(clientIndex: number, popIndex: number) {
  const c = ANYCAST_CLIENTS[clientIndex];
  const p = POPS[popIndex];
  return unit(c.lat, c.lon).angleTo(unit(p.lat, p.lon)) * 6371;
}

// ---------- API gateway ----------
export const THROTTLE_AT = 70;

// ---------- Module 3: compute & scaling ----------
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const VERTICAL_SIZES = [
  { name: 'm5.large', vcpu: 2, ram: '8 GiB' },
  { name: 'm5.4xlarge', vcpu: 16, ram: '64 GiB' },
  { name: 'm5.24xlarge', vcpu: 96, ram: '384 GiB' },
];
export const verticalTier = (rate: number) => (rate < 35 ? 0 : rate < 70 ? 1 : 2);
export const horizontalCount = (rate: number) => clamp(Math.ceil(rate / 20), 1, 5);
export const asgDesired = (rate: number) => clamp(Math.ceil(rate / 18), 2, 6);
export const asgCpu = (rate: number) => Math.round((55 * rate) / (asgDesired(rate) * 18));
export const k8sReplicas = (rate: number) => clamp(Math.ceil(rate / 12), 2, 9);
export const lambdaConcurrency = (rate: number) => clamp(Math.ceil(rate / 12), 1, 8);
export const RESERVED_CONCURRENCY = 4;

// ---------- Module 4: consistent hashing ring ----------
export const RING_RADIUS = 8;
export const RING_NODES = [
  { name: 'A', angle: 20, color: '#38bdf8' },
  { name: 'B', angle: 95, color: '#a78bfa' },
  { name: 'C', angle: 160, color: '#f472b6' },
  { name: 'D', angle: 230, color: '#34d399' },
  { name: 'E', angle: 300, color: '#fb923c' },
];
export const REMOVED_NODE = 2; // shard C
const KEY_ANGLES = [5, 40, 70, 110, 140, 175, 200, 250, 270, 285, 320, 345];
const KEY_HASHES = [17, 42, 8, 33, 91, 64, 27, 55, 73, 12, 86, 39];
export const RING_KEYS = KEY_ANGLES.map((angle, i) => ({ id: `k${i}`, angle, hash: KEY_HASHES[i] }));

export function ringOwner(variant: string, key: { angle: number; hash: number }, removed: number | null): number {
  const live = RING_NODES.map((_, i) => i).filter((i) => i !== removed);
  if (variant === 'modulo') return live[key.hash % live.length];
  const sorted = [...live].sort((a, b) => RING_NODES[a].angle - RING_NODES[b].angle);
  return sorted.find((i) => RING_NODES[i].angle >= key.angle) ?? sorted[0];
}

export function ringMovedKeys(variant: string): number {
  return RING_KEYS.filter((k) => ringOwner(variant, k, REMOVED_NODE) !== ringOwner(variant, k, null)).length;
}

// ---------- Module 7: token bucket ----------
export const BUCKET_CAPACITY = 10;
export const BUCKET_REFILL = 4; // tokens per second
export const bucketArrivalRate = (rate: number, burst: boolean) => (rate / 100) * 12 * (burst ? 3 : 1);
