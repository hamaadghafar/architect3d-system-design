import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';
import { RING_KEYS, RING_NODES, RING_RADIUS, REMOVED_NODE, ringOwner } from '../sceneLogic';

const Y = 0.65;
const CENTER: Vec3 = [0, Y, 0];

const at = (deg: number, r = RING_RADIUS): Vec3 => {
  const a = THREE.MathUtils.degToRad(deg);
  return [Math.cos(a) * r, Y, Math.sin(a) * r];
};

/** Clockwise (increasing angle) arc along the ring, sampled every ~8°. */
function arcPoints(from: number, to: number): Vec3[] {
  let end = to;
  if (end < from) end += 360;
  const pts: Vec3[] = [];
  for (let d = from; d < end; d += 8) pts.push(at(d));
  pts.push(at(end));
  return pts;
}

function Ring() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const m = ref.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m) m.opacity = 0.55 + Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
  });
  return (
    <group position={[0, Y, 0]}>
      <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
        <torusGeometry args={[RING_RADIUS, 0.09, 12, 160]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} raycast={() => null}>
        <ringGeometry args={[RING_RADIUS - 0.6, RING_RADIUS + 0.6, 128]} />
        <meshBasicMaterial color="#0e7490" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      {/* hash-space tick marks */}
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i * Math.PI * 2) / 36;
        return (
          <mesh key={i} position={[Math.cos(a) * RING_RADIUS, 0, Math.sin(a) * RING_RADIUS]} rotation={[0, -a, 0]} raycast={() => null}>
            <boxGeometry args={[0.35, 0.03, 0.03]} />
            <meshBasicMaterial color="#67e8f9" toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

export function HashRingScene() {
  const variant = useSystemStore((s) => s.variant);
  const failure = useSystemStore((s) => s.failure);
  const removed = failure ? REMOVED_NODE : null;

  return (
    <group>
      <Ring />
      <ServerNode id="ring-router" kind="hub" position={CENTER} scale={1.2} label={variant === 'ring' ? 'hash(key) → position on ring' : 'hash(key) mod N'} sublabel={variant === 'ring' ? 'walk clockwise to next node' : `N = ${removed === null ? 5 : 4}`} color={C.edge} description="The client/router hashes each key into a fixed space (here 0–360°). With consistent hashing the key is owned by the first node clockwise from its position; with modulo hashing the owner is hash mod N." />
      {RING_NODES.map((n, i) => (
        <ServerNode
          key={n.name}
          id={`ring-node-${i}`}
          kind="database"
          position={at(n.angle)}
          label={`Shard ${n.name}`}
          sublabel={`token ${n.angle}°`}
          status={removed === i ? 'failed' : 'healthy'}
          color={n.color}
          description="A storage node placed on the ring at its token position. Real systems give each node many virtual nodes (vnodes) so load is even and a departing node’s keys spread over many neighbours."
        />
      ))}
      {RING_KEYS.map((k) => {
        const owner = ringOwner(variant, k, removed);
        const baseline = ringOwner(variant, k, null);
        const moved = owner !== baseline;
        const color = moved ? C.miss : RING_NODES[owner].color;
        const keyPos = at(k.angle, RING_RADIUS);
        const waypoints: Vec3[] = variant === 'ring' ? [CENTER, keyPos, ...arcPoints(k.angle, RING_NODES[owner].angle).slice(1)] : [CENTER, at(RING_NODES[owner].angle)];
        return (
          <group key={k.id}>
            <mesh position={keyPos} raycast={() => null}>
              <octahedronGeometry args={[0.22]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            {variant === 'ring' && <NetworkLink from={CENTER} to={keyPos} color={color} width={0.8} dashed flow={false} />}
            {variant === 'modulo' && <NetworkLink from={CENTER} to={at(RING_NODES[owner].angle)} color={color} width={0.8} dashed flow={false} />}
            <PacketFlow key={`${variant}-${owner}`} waypoints={waypoints} color={color} max={2} size={0.12} speed={0.9} seed={k.angle} />
          </group>
        );
      })}
    </group>
  );
}
