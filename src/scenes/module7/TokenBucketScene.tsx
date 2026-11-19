import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { buildPath } from '../../three/paths';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { BUCKET_CAPACITY, BUCKET_REFILL, bucketArrivalRate } from '../sceneLogic';

const Y = 0.65;
const CLIENT: Vec3 = [-12, Y, 0];
const BUCKET: Vec3 = [0, 0, 0];
const GATE: Vec3 = [0, Y, 0];
const SERVER: Vec3 = [11, Y, 0];
const POOL = 48;
const SPHERE = new THREE.SphereGeometry(1, 12, 10);

type Phase = 0 | 1 | 2 | 3; // 0 idle, 1 inbound, 2 accepted, 3 rejected

/**
 * Real-time token bucket: tokens refill at a fixed rate up to capacity; each arriving
 * request takes a token or is rejected. All state lives in refs and is advanced in useFrame.
 */
function BucketSim() {
  const paths = useMemo(
    () => ({
      in: buildPath([CLIENT, GATE]),
      ok: buildPath([GATE, SERVER]),
      rej: buildPath([GATE, CLIENT], { arc: 1.6 }),
    }),
    [],
  );
  const lengths = useMemo(() => ({ in: paths.in.getLength(), ok: paths.ok.getLength(), rej: paths.rej.getLength() }), [paths]);
  const sim = useRef({ tokens: BUCKET_CAPACITY, spawn: 0, accepted: 0, rejected: 0, drop: 0, label: 0 });
  const packets = useRef(Array.from({ length: POOL }, () => ({ phase: 0 as Phase, t: 0 })));
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const tokenMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const dropRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const mats = useMemo(
    () => ({
      in: new THREE.MeshBasicMaterial({ color: C.request, toneMapped: false }),
      ok: new THREE.MeshBasicMaterial({ color: C.response, toneMapped: false }),
      rej: new THREE.MeshBasicMaterial({ color: C.error, toneMapped: false }),
    }),
    [],
  );

  useFrame((_, rawDelta) => {
    const { trafficRate, failure, paused } = useSystemStore.getState();
    const delta = Math.min(rawDelta, 0.25);
    const s = sim.current;
    if (!paused) {
      s.tokens = Math.min(BUCKET_CAPACITY, s.tokens + BUCKET_REFILL * delta);
      s.spawn += bucketArrivalRate(trafficRate, failure) * delta;
      s.drop = (s.drop + delta * BUCKET_REFILL) % 1;
      while (s.spawn >= 1) {
        s.spawn -= 1;
        const free = packets.current.find((p) => p.phase === 0);
        if (free) {
          free.phase = 1;
          free.t = 0;
        }
      }
      for (const p of packets.current) {
        if (p.phase === 0) continue;
        const len = p.phase === 1 ? lengths.in : p.phase === 2 ? lengths.ok : lengths.rej;
        p.t += (delta * 7) / len;
        if (p.t >= 1) {
          if (p.phase === 1) {
            if (s.tokens >= 1) {
              s.tokens -= 1;
              s.accepted += 1;
              p.phase = 2;
            } else {
              s.rejected += 1;
              p.phase = 3;
            }
            p.t = 0;
          } else {
            p.phase = 0;
          }
        }
      }
    }

    packets.current.forEach((p, i) => {
      const m = meshes.current[i];
      if (!m) return;
      m.visible = p.phase !== 0;
      if (!m.visible) return;
      const path = p.phase === 1 ? paths.in : p.phase === 2 ? paths.ok : paths.rej;
      path.getPointAt(Math.min(p.t, 1), tmp);
      m.position.copy(tmp);
      m.material = p.phase === 1 ? mats.in : p.phase === 2 ? mats.ok : mats.rej;
    });

    const whole = Math.floor(s.tokens);
    tokenMeshes.current.forEach((m, i) => {
      if (m) m.visible = i < whole;
    });
    if (dropRef.current) {
      dropRef.current.visible = s.tokens < BUCKET_CAPACITY;
      dropRef.current.position.y = 5.2 - s.drop * 3.6;
    }

    s.label += rawDelta;
    if (labelRef.current && s.label > 0.12) {
      s.label = 0;
      const total = s.accepted + s.rejected;
      labelRef.current.textContent = `bucket ${s.tokens.toFixed(1)} / ${BUCKET_CAPACITY} tokens · refill ${BUCKET_REFILL}/s · accepted ${s.accepted} · rejected ${s.rejected}${total ? ` (${Math.round((100 * s.rejected) / total)}%)` : ''}`;
    }
  });

  return (
    <group>
      {Array.from({ length: POOL }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          geometry={SPHERE}
          material={mats.in}
          scale={0.16}
          visible={false}
        />
      ))}
      {/* the bucket */}
      <group position={BUCKET}>
        <mesh position={[0, 1.6, 0]} raycast={() => null}>
          <cylinderGeometry args={[1.5, 1.2, 3, 40, 1, true]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.18} side={THREE.DoubleSide} emissive="#0e7490" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, 0.1, 0]} raycast={() => null}>
          <cylinderGeometry args={[1.2, 1.2, 0.1, 40]} />
          <meshStandardMaterial color="#0e7490" />
        </mesh>
        <mesh position={[0, 3.1, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
          <torusGeometry args={[1.5, 0.05, 8, 48]} />
          <meshBasicMaterial color="#67e8f9" toneMapped={false} />
        </mesh>
        {Array.from({ length: BUCKET_CAPACITY }, (_, i) => {
          const layer = Math.floor(i / 4);
          const a = (i % 4) * (Math.PI / 2) + layer * 0.6;
          return (
            <mesh
              key={i}
              ref={(m) => {
                tokenMeshes.current[i] = m;
              }}
              position={[Math.cos(a) * 0.6, 0.45 + layer * 0.5, Math.sin(a) * 0.6]}
              raycast={() => null}
            >
              <cylinderGeometry args={[0.32, 0.32, 0.12, 20]} />
              <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.2} toneMapped={false} />
            </mesh>
          );
        })}
        <mesh ref={dropRef} position={[0, 5, 0]} raycast={() => null}>
          <cylinderGeometry args={[0.28, 0.28, 0.1, 20]} />
          <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={1.5} toneMapped={false} />
        </mesh>
        <Html position={[0, 4.6, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
          <div ref={labelRef} className="link-label" style={{ color: '#fde68a', border: '1px solid #f59e0b66', fontSize: 11 }} />
        </Html>
      </group>
    </group>
  );
}

export function TokenBucketScene() {
  const burst = useSystemStore((s) => s.failure);
  return (
    <group>
      <ServerNode id="tb-client" kind="client" position={CLIENT} scale={1.2} label="API client" sublabel={burst ? 'BURST: 3× traffic' : 'steady traffic'} color={C.client} description="Sends requests at the rate set by the traffic slider. Toggle the burst to triple it." />
      <ServerNode id="tb-server" kind="server" position={SERVER} scale={1.2} label="Protected service" sublabel={`≤ ${BUCKET_REFILL} req/s sustained`} color={C.server} description="Behind the limiter, the service never sees more than the refill rate on average — plus at most one bucket’s worth of burst." />
      <NetworkLink from={CLIENT} to={GATE} color={C.request} />
      <NetworkLink from={GATE} to={SERVER} color={C.response} />
      <NetworkLink from={GATE} to={CLIENT} arc={1.6} color={C.error} dashed label="429 Too Many Requests" />
      <BucketSim />
      <ServerNode id="tb-gate" kind="gateway" position={[0, Y, -3.4]} scale={0.7} showLabel={false} label="Token bucket limiter" sublabel={`capacity ${BUCKET_CAPACITY} · refill ${BUCKET_REFILL}/s`} color={C.miss} description="Tokens drip into the bucket at a fixed rate up to its capacity. Each request removes one token; if the bucket is empty the request is rejected (or queued). Capacity = allowed burst size, refill rate = sustained rate." />
    </group>
  );
}
