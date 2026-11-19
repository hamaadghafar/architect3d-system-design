import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSystemStore } from '../../store/useSystemStore';

/** One geometry shared by every packet in the app. */
const SPHERE = new THREE.SphereGeometry(1, 14, 12);
const TRAIL_SCALES = [0.7, 0.5, 0.32];

export interface DataPacketProps {
  path: THREE.CurvePath<THREE.Vector3>;
  /** World-space path length (cached by the parent). */
  length: number;
  index: number;
  /** Pool size; how many are visible scales with the traffic slider. */
  max: number;
  offset: number;
  color: string;
  /** Colour after `switchAt` (e.g. response leg of a round trip). */
  returnColor?: string;
  switchAt?: number;
  speed?: number;
  size?: number;
  active?: boolean;
  /** 0..1 speed wobble — used to visualise Internet jitter. */
  jitter?: number;
}

/**
 * A glowing packet riding a 3D path. All motion happens by mutating refs inside
 * useFrame; simulation values are read transiently with getState() so the
 * slider never re-renders the packet tree.
 */
export function DataPacket({
  path,
  length,
  index,
  max,
  offset,
  color,
  returnColor,
  switchAt,
  speed = 1,
  size = 0.13,
  active = true,
  jitter = 0,
}: DataPacketProps) {
  const group = useRef<THREE.Group>(null);
  const head = useRef<THREE.Mesh>(null);
  const trails = useRef<(THREE.Mesh | null)[]>([]);
  const t = useRef(offset);
  const phase = useRef(-1);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  const colors = useMemo(() => [new THREE.Color(color), new THREE.Color(returnColor ?? color)], [color, returnColor]);
  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const glowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => {
    phase.current = -1; // force a recolour on next frame
  }, [colors]);

  useEffect(
    () => () => {
      coreMat.dispose();
      glowMat.dispose();
    },
    [coreMat, glowMat],
  );

  useFrame((state, delta) => {
    const g = group.current;
    const h = head.current;
    if (!g || !h) return;

    const { trafficRate, paused } = useSystemStore.getState();
    const visibleCount = Math.max(1, Math.round((max * trafficRate) / 100));
    const visible = active && index < visibleCount;
    g.visible = visible;
    if (!visible) return;

    if (!paused) {
      const load = 0.55 + trafficRate / 110;
      const wobble = jitter > 0 ? 1 + jitter * Math.sin(state.clock.elapsedTime * 3.1 + index * 2.3) : 1;
      t.current = (t.current + (delta * speed * 3.4 * load * wobble) / Math.max(length, 0.001)) % 1;
    }

    const u = t.current;
    path.getPointAt(u, tmp);
    h.position.copy(tmp);

    for (let k = 0; k < TRAIL_SCALES.length; k++) {
      const m = trails.current[k];
      if (!m) continue;
      const tu = u - ((k + 1) * 0.22) / Math.max(length, 0.001);
      if (tu <= 0) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      path.getPointAt(tu, tmp);
      m.position.copy(tmp);
    }

    const p = switchAt !== undefined && u > switchAt ? 1 : 0;
    if (p !== phase.current) {
      phase.current = p;
      coreMat.color.copy(colors[p]);
      glowMat.color.copy(colors[p]);
    }
  });

  return (
    <group ref={group}>
      <mesh ref={head} geometry={SPHERE} material={coreMat} scale={size}>
        <mesh geometry={SPHERE} material={glowMat} scale={2.3} />
      </mesh>
      {TRAIL_SCALES.map((s, k) => (
        <mesh
          key={k}
          ref={(m) => {
            trails.current[k] = m;
          }}
          geometry={SPHERE}
          material={glowMat}
          scale={size * s * 1.4}
        />
      ))}
    </group>
  );
}
