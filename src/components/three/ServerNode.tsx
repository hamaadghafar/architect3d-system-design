import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Vec3 } from '../../types';
import { useSystemStore, type SelectedNode } from '../../store/useSystemStore';
import { sceneBounds, useSpread } from '../../three/layout';

export type NodeKind =
  | 'server'
  | 'database'
  | 'loadbalancer'
  | 'router'
  | 'cache'
  | 'client'
  | 'dns'
  | 'cdn'
  | 'gateway'
  | 'firewall'
  | 'vpn'
  | 'storage'
  | 'internet'
  | 'hub'
  | 'pop';

export type NodeStatus = 'healthy' | 'failed' | 'standby' | 'degraded' | 'idle';

const STATUS_COLOR: Record<NodeStatus, string | null> = {
  healthy: null,
  idle: null,
  failed: '#ef4444',
  degraded: '#f59e0b',
  standby: '#64748b',
};

const STATUS_BADGE: Partial<Record<NodeStatus, { text: string; bg: string; fg: string }>> = {
  failed: { text: 'down', bg: '#7f1d1d', fg: '#fecaca' },
  degraded: { text: 'degraded', bg: '#78350f', fg: '#fde68a' },
  standby: { text: 'standby', bg: '#1e293b', fg: '#cbd5e1' },
};

export interface ServerNodeProps {
  id: string;
  kind: NodeKind;
  position: Vec3;
  label: string;
  sublabel?: string;
  description: string;
  color?: string;
  status?: NodeStatus;
  scale?: number;
  showLabel?: boolean;
  /** drei <Html> distanceFactor — smaller = smaller label. */
  labelSize?: number;
  /** Hide the label when the node faces away from the camera (nodes on a globe). */
  faceCenter?: Vec3;
}

/** Global size boost so components read clearly at overview distance. */
const NODE_SCALE = 1.25;

function hashPhase(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 628) / 100;
}

/** Procedural geometry for each infrastructure kind. Visual centre at origin, height ≈ 1. */
function NodeModel({
  kind,
  body,
  accent,
  spinRef,
}: {
  kind: NodeKind;
  body: THREE.Material;
  accent: THREE.Material;
  spinRef: React.RefObject<THREE.Group | null>;
}) {
  switch (kind) {
    case 'server':
      return (
        <group>
          {[-0.32, 0, 0.32].map((y) => (
            <group key={y} position={[0, y, 0]}>
              <mesh material={body}>
                <boxGeometry args={[0.9, 0.28, 0.7]} />
              </mesh>
              <mesh material={accent} position={[-0.12, 0, 0.352]}>
                <boxGeometry args={[0.5, 0.05, 0.01]} />
              </mesh>
              <mesh material={accent} position={[0.32, 0, 0.352]}>
                <boxGeometry args={[0.06, 0.06, 0.01]} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 'database':
      return (
        <group>
          {[-0.32, 0, 0.32].map((y) => (
            <group key={y} position={[0, y, 0]}>
              <mesh material={body}>
                <cylinderGeometry args={[0.45, 0.45, 0.26, 32]} />
              </mesh>
              <mesh material={accent} position={[0, 0.14, 0]}>
                <cylinderGeometry args={[0.46, 0.46, 0.025, 32]} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 'loadbalancer':
      return (
        <group>
          <mesh material={body} position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 0.4, 6]} />
          </mesh>
          <mesh material={accent} position={[0, 0.005, 0]}>
            <cylinderGeometry args={[0.61, 0.61, 0.03, 6]} />
          </mesh>
          <group ref={spinRef} position={[0, 0.3, 0]}>
            <mesh material={accent}>
              <octahedronGeometry args={[0.24]} />
            </mesh>
          </group>
        </group>
      );
    case 'router':
      return (
        <group>
          <mesh material={body} position={[0, -0.15, 0]}>
            <cylinderGeometry args={[0.55, 0.6, 0.35, 28]} />
          </mesh>
          <group ref={spinRef} position={[0, 0.06, 0]}>
            <mesh material={accent} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.42, 0.035, 8, 40]} />
            </mesh>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} material={accent} rotation={[0, (i * Math.PI) / 2, 0]} position={[Math.sin((i * Math.PI) / 2) * 0.25, 0, Math.cos((i * Math.PI) / 2) * 0.25]}>
                <coneGeometry args={[0.07, 0.18, 8]} />
              </mesh>
            ))}
          </group>
          <mesh material={accent} position={[0.35, 0.3, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.45]} />
          </mesh>
        </group>
      );
    case 'cache':
      return (
        <group ref={spinRef}>
          <mesh material={body}>
            <icosahedronGeometry args={[0.42, 0]} />
          </mesh>
          <mesh material={accent} scale={1.12}>
            <icosahedronGeometry args={[0.42, 0]} />
            <meshBasicMaterial wireframe color="#fda4af" toneMapped={false} />
          </mesh>
          <mesh material={accent}>
            <sphereGeometry args={[0.16, 16, 16]} />
          </mesh>
        </group>
      );
    case 'client':
      return (
        <group position={[0, -0.25, 0]}>
          <mesh material={body}>
            <boxGeometry args={[0.85, 0.05, 0.55]} />
          </mesh>
          <group position={[0, 0.27, -0.27]} rotation={[-0.2, 0, 0]}>
            <mesh material={body}>
              <boxGeometry args={[0.85, 0.55, 0.03]} />
            </mesh>
            <mesh material={accent} position={[0, 0, 0.02]}>
              <planeGeometry args={[0.76, 0.46]} />
            </mesh>
          </group>
        </group>
      );
    case 'dns':
      return (
        <group>
          <mesh material={body} position={[0, -0.35, 0]}>
            <cylinderGeometry args={[0.45, 0.5, 0.18, 24]} />
          </mesh>
          <group ref={spinRef} position={[0, 0.1, 0]}>
            <mesh material={accent}>
              <sphereGeometry args={[0.36, 12, 8]} />
              <meshBasicMaterial wireframe color="#67e8f9" toneMapped={false} />
            </mesh>
            <mesh material={body}>
              <sphereGeometry args={[0.32, 20, 16]} />
            </mesh>
          </group>
        </group>
      );
    case 'cdn':
      return (
        <group>
          <mesh material={body} position={[0, -0.4, 0]}>
            <sphereGeometry args={[0.6, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <group ref={spinRef} position={[0, -0.1, 0]}>
            <mesh material={accent} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.55, 0.03, 8, 48]} />
            </mesh>
          </group>
          <mesh material={accent} position={[0, 0.28, 0]}>
            <sphereGeometry args={[0.1, 12, 12]} />
          </mesh>
        </group>
      );
    case 'gateway':
      return (
        <group>
          <mesh material={body} position={[-0.38, 0, 0]}>
            <boxGeometry args={[0.18, 0.95, 0.4]} />
          </mesh>
          <mesh material={body} position={[0.38, 0, 0]}>
            <boxGeometry args={[0.18, 0.95, 0.4]} />
          </mesh>
          <mesh material={body} position={[0, 0.42, 0]}>
            <boxGeometry args={[0.95, 0.16, 0.45]} />
          </mesh>
          <mesh material={accent} position={[0, -0.06, 0]}>
            <planeGeometry args={[0.58, 0.78]} />
          </mesh>
          <mesh material={accent} position={[0, -0.06, 0]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.58, 0.78]} />
          </mesh>
        </group>
      );
    case 'firewall':
      return (
        <group>
          <mesh material={body}>
            <boxGeometry args={[1.0, 0.75, 0.25]} />
          </mesh>
          {[-0.18, 0.06, 0.3].map((y) => (
            <mesh key={y} material={accent} position={[0, y - 0.06, 0.13]}>
              <boxGeometry args={[0.98, 0.025, 0.01]} />
            </mesh>
          ))}
          {[-0.25, 0.25].map((x) => (
            <mesh key={x} material={accent} position={[x, 0, 0.13]}>
              <boxGeometry args={[0.025, 0.73, 0.01]} />
            </mesh>
          ))}
        </group>
      );
    case 'vpn':
      return (
        <group>
          <mesh material={body} position={[0, -0.15, 0]}>
            <boxGeometry args={[0.62, 0.5, 0.32]} />
          </mesh>
          <mesh material={accent} position={[0, 0.12, 0]}>
            <torusGeometry args={[0.2, 0.05, 10, 24, Math.PI]} />
          </mesh>
          <mesh material={accent} position={[0, -0.12, 0.165]}>
            <circleGeometry args={[0.07, 16]} />
          </mesh>
        </group>
      );
    case 'storage':
      return (
        <group>
          <mesh material={body}>
            <boxGeometry args={[1.1, 0.6, 0.6]} />
          </mesh>
          {Array.from({ length: 12 }, (_, i) => (
            <mesh key={i} material={accent} position={[-0.39 + (i % 4) * 0.26, 0.15 - Math.floor(i / 4) * 0.15, 0.305]}>
              <boxGeometry args={[0.18, 0.07, 0.01]} />
            </mesh>
          ))}
        </group>
      );
    case 'internet':
      return (
        <group ref={spinRef}>
          {(
            [
              [0, 0, 0, 0.42],
              [0.38, -0.08, 0, 0.3],
              [-0.38, -0.08, 0, 0.3],
              [0.12, 0.22, 0.1, 0.28],
            ] as const
          ).map(([x, y, z, r], i) => (
            <mesh key={i} material={body} position={[x, y, z]}>
              <sphereGeometry args={[r, 18, 14]} />
            </mesh>
          ))}
          <mesh material={accent} scale={1.15}>
            <sphereGeometry args={[0.46, 10, 8]} />
            <meshBasicMaterial wireframe color="#7dd3fc" transparent opacity={0.4} toneMapped={false} />
          </mesh>
        </group>
      );
    case 'hub':
      return (
        <group>
          <mesh material={body}>
            <sphereGeometry args={[0.32, 24, 18]} />
          </mesh>
          <group ref={spinRef}>
            <mesh material={accent} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.6, 0.05, 10, 48]} />
            </mesh>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <mesh key={i} material={accent} rotation={[0, (i * Math.PI) / 3, Math.PI / 2]}>
                <cylinderGeometry args={[0.02, 0.02, 1.2]} />
              </mesh>
            ))}
          </group>
        </group>
      );
    case 'pop':
      return (
        <group>
          <mesh material={accent}>
            <sphereGeometry args={[0.28, 18, 14]} />
          </mesh>
          <group ref={spinRef}>
            <mesh material={accent} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.45, 0.025, 8, 40]} />
            </mesh>
          </group>
        </group>
      );
  }
}

export function ServerNode({
  id,
  kind,
  position,
  label,
  sublabel,
  description,
  color = '#38bdf8',
  status = 'healthy',
  scale = 1,
  showLabel = true,
  labelSize = 24,
  faceCenter,
}: ServerNodeProps) {
  const camera = useThree((s) => s.camera);
  const labelRef = useRef<HTMLDivElement>(null);
  const labelVisible = useRef(true);
  const vecs = useMemo(() => ({ normal: new THREE.Vector3(), toCam: new THREE.Vector3(), pos: new THREE.Vector3() }), []);
  const group = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const selected = useSystemStore((s) => s.selectedNode?.id === id);
  const selectNode = useSystemStore((s) => s.selectNode);
  const setHoveredNode = useSystemStore((s) => s.setHoveredNode);
  const spread = useSpread();
  const pos = spread(position);
  const posKey = pos.join(',');
  const phase = useMemo(() => hashPhase(id), [id]);

  const accentColor = STATUS_COLOR[status] ?? color;

  const accent = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 1,
        toneMapped: false,
        metalness: 0.1,
        roughness: 0.4,
      }),
    // material instance is created once; colour is synced below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const body = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#33465f', metalness: 0.45, roughness: 0.38, emissive: '#0b1220' }),
    [],
  );

  useEffect(() => {
    accent.color.set(accentColor);
    accent.emissive.set(accentColor);
    body.color.set(status === 'failed' ? '#4a1d22' : '#33465f');
  }, [accent, body, accentColor, status]);

  useEffect(
    () => () => {
      accent.dispose();
      body.dispose();
    },
    [accent, body],
  );

  // Register centre + label top so the camera rig can frame the whole topology.
  useEffect(() => {
    const top = Math.max(1.5, scale * NODE_SCALE + 0.6) + 0.4;
    sceneBounds.set(id, [pos, [pos[0], pos[1] + top, pos[2]]]);
    return () => {
      sceneBounds.delete(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, posKey, scale]);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  // Continuous animation: mutate refs/materials only — never setState here.
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    let intensity: number;
    switch (status) {
      case 'failed':
        intensity = Math.sin(t * 14 + phase) > 0.2 ? 1.8 : 0.25;
        break;
      case 'standby':
      case 'idle':
        intensity = 0.35 + Math.sin(t * 1.3 + phase) * 0.1;
        break;
      case 'degraded':
        intensity = 0.9 + Math.sin(t * 7 + phase) * 0.55;
        break;
      default:
        intensity = 1.05 + Math.sin(t * 2.4 + phase) * 0.35;
    }
    accent.emissiveIntensity = intensity * (hovered || selected ? 1.6 : 1);
    body.emissive.setScalar(hovered || selected ? 0.14 : 0.05);

    if (spinRef.current && status !== 'failed') spinRef.current.rotation.y += delta * (status === 'healthy' ? 0.8 : 0.2);
    if (ringRef.current) ringRef.current.rotation.z += delta * 1.4;
    if (faceCenter && labelRef.current) {
      vecs.pos.set(...pos);
      vecs.normal.set(...faceCenter).negate().add(vecs.pos).normalize();
      vecs.toCam.copy(camera.position).sub(vecs.pos).normalize();
      const visible = vecs.normal.dot(vecs.toCam) > -0.05;
      if (visible !== labelVisible.current) {
        labelVisible.current = visible;
        labelRef.current.style.opacity = visible ? '1' : '0';
      }
    }
    if (group.current) {
      const goal = (hovered || selected ? 1.12 : 1) * scale * NODE_SCALE;
      group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, goal, 10, delta));
    }
  });

  const info = (): SelectedNode => ({
    id,
    label,
    kind,
    status,
    description,
    specs: [sublabel, STATUS_BADGE[status]?.text.toUpperCase()].filter((x): x is string => Boolean(x)),
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectNode(info(), pos);
  };

  // One short name per node; specs (sublabel, status) go to the inspector pill.
  const labelY = Math.max(1.5, scale * NODE_SCALE + 0.6);

  return (
    <group position={pos}>
      <group
        ref={group}
        scale={scale * NODE_SCALE}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          setHoveredNode(info());
        }}
        onPointerOut={() => {
          setHovered(false);
          setHoveredNode(null, id);
        }}
      >
        <NodeModel kind={kind} body={body} accent={accent} spinRef={spinRef} />
        {/* glowing pad */}
        <mesh position={[0, -0.56, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.72, 40]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.16} depthWrite={false} toneMapped={false} />
        </mesh>
        {(selected || hovered) && (
          <mesh ref={ringRef} position={[0, -0.54, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.82, 0.92, 48, 1, 0, Math.PI * 1.6]} />
            <meshBasicMaterial color={accentColor} transparent opacity={0.9} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
      {showLabel && (
        <Html position={[0, labelY, 0]} center distanceFactor={labelSize} zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
          <div ref={labelRef} className={`node-label ${selected || hovered ? 'is-active' : ''} ${status === 'failed' ? 'is-failed' : ''}`}>
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}
