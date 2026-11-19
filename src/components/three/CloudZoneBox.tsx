import { useContext, useEffect, useId, useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Vec3 } from '../../types';
import { SpreadContext, sceneBounds } from '../../three/layout';

export interface CloudZoneBoxProps {
  position: Vec3;
  size: Vec3;
  color: string;
  label: string;
  /** Kept for scene readability; no longer rendered in 3D space. */
  sublabel?: string;
  opacity?: number;
  dashed?: boolean;
}

const noRaycast = () => null;

/** Translucent boundary for a region / AZ / VPC / data centre. Never intercepts clicks. */
export function CloudZoneBox({ position, size, color, label, opacity = 0.045, dashed = false }: CloudZoneBoxProps) {
  // Zones grow with the scene spacing so they keep enclosing their (spread) nodes.
  const k = useContext(SpreadContext);
  const w = size[0] * k;
  const h = size[1];
  const d = size[2] * k;
  const px = position[0] * k;
  const py = position[1];
  const pz = position[2] * k;
  const id = useId();
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), [w, h, d]);
  const lineRef = (l: THREE.LineSegments | null) => {
    if (l && dashed) l.computeLineDistances();
  };

  useEffect(() => {
    const corners: Vec3[] = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) corners.push([px + (sx * w) / 2, py + h / 2, pz + (sz * d) / 2]);
    sceneBounds.set(id, corners);
    return () => {
      sceneBounds.delete(id);
    };
  }, [id, px, py, pz, w, h, d]);

  return (
    <group position={[px, py, pz]}>
      <mesh raycast={noRaycast}>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments ref={lineRef} geometry={edges} raycast={noRaycast}>
        {dashed ? (
          <lineDashedMaterial color={color} dashSize={0.4} gapSize={0.25} transparent opacity={0.7} toneMapped={false} />
        ) : (
          <lineBasicMaterial color={color} transparent opacity={0.55} toneMapped={false} />
        )}
      </lineSegments>
      <mesh position={[0, -h / 2 + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 1.8} depthWrite={false} />
      </mesh>
      <Html position={[-w / 2 + 0.1, h / 2 + 0.05, -d / 2]} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className="zone-label" style={{ color, transform: 'translateY(-100%)' }}>
          {label}
        </div>
      </Html>
    </group>
  );
}
