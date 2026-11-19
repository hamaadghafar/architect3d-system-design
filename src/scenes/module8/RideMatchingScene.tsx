import { useMemo } from 'react';
import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const HEX = 1.35;
const GRID_CENTER: [number, number] = [-6, 0];

/** Axial hex coordinates → world position (pointy-top layout). */
const hexPos = (q: number, r: number, y = Y): Vec3 => [GRID_CENTER[0] + HEX * Math.sqrt(3) * (q + r / 2), y, GRID_CENTER[1] + HEX * 1.5 * r];
const hexDist = (q: number, r: number) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;

const DRIVERS: [number, number][] = [
  [1, 0],
  [-1, 1],
  [2, -1],
  [-2, 0],
  [0, -2],
  [3, -3],
  [-3, 2],
  [1, 2],
];
const RIDER: [number, number] = [0, 0];

const LOC: Vec3[] = [
  [6, Y, -4],
  [6, Y, 0],
];
const GEO: Vec3 = [11, Y, -2];
const MATCH: Vec3 = [8, Y, 6];

export function RideMatchingScene() {
  const failure = useSystemStore((s) => s.failure);
  const loc = failure ? LOC[1] : LOC[0];
  const tiles = useMemo(() => {
    const out: { q: number; r: number; ring: number }[] = [];
    for (let q = -3; q <= 3; q++) for (let r = -3; r <= 3; r++) if (hexDist(q, r) <= 3) out.push({ q, r, ring: hexDist(q, r) });
    return out;
  }, []);
  const nearest = DRIVERS.reduce((best, d) => (hexDist(d[0], d[1]) < hexDist(best[0], best[1]) ? d : best));

  return (
    <group>
      {tiles.map((t) => (
        <mesh key={`${t.q},${t.r}`} position={hexPos(t.q, t.r, 0.05)} raycast={() => null}>
          <cylinderGeometry args={[HEX * 0.96, HEX * 0.96, 0.08, 6]} />
          <meshStandardMaterial
            color={t.ring === 0 ? '#f472b6' : t.ring === 1 ? '#7c3aed' : '#0f2a44'}
            emissive={t.ring === 0 ? '#be185d' : t.ring === 1 ? '#5b21b6' : '#071a2c'}
            emissiveIntensity={t.ring <= 1 ? 0.9 : 0.4}
            transparent
            opacity={t.ring <= 1 ? 0.85 : 0.6}
          />
        </mesh>
      ))}
      <ServerNode id="rm-rider" kind="client" position={hexPos(...RIDER)} scale={0.9} label="Rider" sublabel="cell 8928308280fffff" color={C.write} description="The rider’s location is converted to an H3 hexagon. Searching the cell plus its k-ring of neighbours (purple) finds nearby drivers without scanning the city." />
      {DRIVERS.map((d, i) => (
        <ServerNode
          key={i}
          id={`rm-d-${i}`}
          kind="pop"
          position={hexPos(d[0], d[1])}
          scale={0.55}
          labelSize={14}
          label={d === nearest ? 'matched driver' : `driver ${i + 1}`}
          status={d === nearest ? 'healthy' : 'idle'}
          color={d === nearest ? C.response : C.edge}
          description="Each driver app sends a GPS ping every ~4 s. Only the latest position matters, so updates overwrite in memory instead of being stored as history on the hot path."
        />
      ))}
      {LOC.map((p, i) => (
        <ServerNode key={i} id={`rm-loc-${i}`} kind="server" position={p} label={`location-svc ${i + 1}`} sublabel={failure && i === 0 ? 'down' : 'ingest pings'} status={failure && i === 0 ? 'failed' : 'healthy'} color={C.server} description="Stateless ingest tier for millions of location updates per minute; it updates the geo index and publishes to a stream for ETAs and analytics." />
      ))}
      <ServerNode id="rm-geo" kind="cache" position={GEO} scale={1.2} label="Geo index" sublabel="cell → drivers (in-memory)" color={C.cache} description="An in-memory index sharded by geography (H3 cell / geohash): cell → set of available drivers. Redis GEO or a custom service; sharding by city/region keeps hot spots manageable." />
      <ServerNode id="rm-match" kind="hub" position={MATCH} scale={1.2} label="Matching service" sublabel="k-ring query → rank by ETA" color={C.gateway} description="Finds candidate drivers in the rider’s k-ring, ranks them by road-network ETA (not straight-line distance), and offers the trip — with a lock so two riders cannot get the same driver." />

      {DRIVERS.map((d, i) => (
        <NetworkLink key={i} from={hexPos(d[0], d[1])} to={loc} arc={1.2} color={C.edge} width={0.7} dashed />
      ))}
      <NetworkLink from={loc} to={GEO} color={C.cache} label="UPDATE cell" />
      <NetworkLink from={hexPos(...RIDER)} to={MATCH} arc={1.5} color={C.write} label="request ride" />
      <NetworkLink from={MATCH} to={GEO} color={C.gateway} label="k-ring lookup" />
      <NetworkLink from={MATCH} to={hexPos(nearest[0], nearest[1])} arc={2} color={C.response} dashed label="dispatch offer" />

      {DRIVERS.map((d, i) => (
        <PacketFlow key={`${i}-${failure}`} waypoints={[hexPos(d[0], d[1]), loc]} arc={1.2} color={C.edge} max={2} size={0.09} speed={0.8} seed={i} />
      ))}
      <PacketFlow key={`g-${failure}`} waypoints={[loc, GEO]} color={C.cache} max={5} size={0.1} />
      <PacketFlow waypoints={[hexPos(...RIDER), MATCH, GEO, MATCH, hexPos(nearest[0], nearest[1])]} arc={1} turnAt={3} color={C.write} returnColor={C.response} max={4} speed={0.8} />
    </group>
  );
}
