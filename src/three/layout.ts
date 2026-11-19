import { createContext, useContext } from 'react';
import type { Vec3 } from '../types';

/**
 * Horizontal spacing multiplier applied by every 3D primitive (nodes, links, packet
 * paths, zone boxes). Scenes are authored compactly; the lab spreads them apart so
 * nodes sit ~4.5–6 units from each other. Height (y) is never scaled.
 */
export const SpreadContext = createContext(1);

export function useSpread() {
  const k = useContext(SpreadContext);
  return (p: Vec3): Vec3 => (k === 1 ? p : [p[0] * k, p[1], p[2] * k]);
}

/**
 * Points that make up the visible scene (node centres, label tops, zone corners).
 * The camera rig reads this to frame the topology automatically.
 */
export const sceneBounds = new Map<string, Vec3[]>();
