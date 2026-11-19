import { useMemo, useRef, type ComponentRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import type { Vec3 } from '../../types';
import { segmentCurve, type PathOptions } from '../../three/paths';
import { useSystemStore } from '../../store/useSystemStore';
import { useSpread } from '../../three/layout';

export type LinkStatus = 'active' | 'idle' | 'down' | 'backup' | 'degraded';

export interface NetworkLinkProps extends PathOptions {
  from: Vec3;
  to: Vec3;
  color?: string;
  status?: LinkStatus;
  dashed?: boolean;
  /** Animate dashes along the link (only for dashed, active links). */
  flow?: boolean;
  width?: number;
  /** Kept for scene readability; no longer rendered in 3D space. */
  label?: string;
}

export function NetworkLink({
  from,
  to,
  arc = 0,
  radial,
  center,
  color = '#38bdf8',
  status = 'active',
  dashed = false,
  flow = true,
  width = 1.6,
}: NetworkLinkProps) {
  const ref = useRef<ComponentRef<typeof Line>>(null);
  const spread = useSpread();
  const a = spread(from);
  const b = spread(to);
  const key = JSON.stringify([a, b, arc, radial, center]);
  const { points, mid } = useMemo(() => {
    const curve = segmentCurve(a, b, { arc, radial, center });
    return { points: curve.getPoints(40), mid: curve.getPoint(0.5) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const style = {
    active: { color, opacity: 0.8, dashed },
    idle: { color: '#334155', opacity: 0.45, dashed },
    down: { color: '#ef4444', opacity: 0.75, dashed: true },
    backup: { color, opacity: 0.35, dashed: true },
    degraded: { color: '#f59e0b', opacity: 0.8, dashed: true },
  }[status];

  useFrame((_, delta) => {
    if (!flow || !style.dashed || status === 'down' || status === 'idle') return;
    const line = ref.current;
    if (!line) return;
    const { trafficRate, paused } = useSystemStore.getState();
    if (paused) return;
    line.material.dashOffset -= delta * (0.6 + trafficRate / 60);
  });

  return (
    <group>
      <Line
        ref={ref}
        points={points}
        color={style.color}
        lineWidth={status === 'active' ? width : width * 0.8}
        transparent
        opacity={style.opacity}
        dashed={style.dashed}
        dashSize={0.35}
        gapSize={0.25}
        toneMapped={false}
        raycast={() => null}
      />
      {/* Link details live in the inspector/telemetry; only a compact failure marker floats in 3D. */}
      {status === 'down' && (
        <Html position={mid} center zIndexRange={[35, 0]} style={{ pointerEvents: 'none' }}>
          <div className="link-down">✕</div>
        </Html>
      )}
    </group>
  );
}
