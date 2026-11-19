import { useMemo } from 'react';
import type { Vec3 } from '../../types';
import { buildPath, type PathOptions } from '../../three/paths';
import { C } from '../../three/palette';
import { DataPacket } from './DataPacket';
import { useSpread } from '../../three/layout';

export interface PacketFlowProps extends PathOptions {
  waypoints: Vec3[];
  color?: string;
  returnColor?: string;
  /** Waypoint index where the packet becomes a response. Defaults to the middle waypoint. */
  turnAt?: number;
  max?: number;
  speed?: number;
  size?: number;
  active?: boolean;
  jitter?: number;
  seed?: number;
}

const GOLDEN = 0.6180339887;

/** A stream of packets travelling a multi-hop path. Density follows the traffic slider. */
export function PacketFlow({
  waypoints,
  arc = 0,
  radial,
  center,
  color = C.request,
  returnColor,
  turnAt,
  max = 7,
  speed = 1,
  size = 0.13,
  active = true,
  jitter = 0,
  seed = 0,
}: PacketFlowProps) {
  const spread = useSpread();
  const pts = waypoints.map(spread);
  const key = JSON.stringify([pts, arc, radial, center]);
  const turn = turnAt ?? (returnColor ? Math.floor((waypoints.length - 1) / 2) : undefined);

  const { path, length, switchAt } = useMemo(() => {
    const p = buildPath(pts, { arc, radial, center });
    const lengths = p.getCurveLengths();
    const total = p.getLength();
    const sw = turn !== undefined && turn > 0 ? lengths[turn - 1] / total : undefined;
    return { path: p, length: total, switchAt: sw };
    // waypoints are compared by value through `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, turn]);

  if (waypoints.length < 2) return null;

  return (
    <group>
      {Array.from({ length: max }, (_, i) => (
        <DataPacket
          key={i}
          path={path}
          length={length}
          index={i}
          max={max}
          offset={(seed * 0.37 + i * GOLDEN) % 1}
          color={color}
          returnColor={returnColor}
          switchAt={switchAt}
          speed={speed}
          size={size}
          active={active}
          jitter={jitter}
        />
      ))}
    </group>
  );
}
