import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const EDGE_Z = [-6, 0, 6];
const EDGES: Vec3[] = EDGE_Z.map((z) => [-3, Y, z] as Vec3);
const EDGE_NAMES = ['Tokyo', 'London', 'São Paulo'];
const USERS: Vec3[] = EDGE_Z.flatMap((z) => [[-11, Y, z - 1.5] as Vec3, [-11, Y, z + 1.5] as Vec3]);
const SHIELD: Vec3 = [4.5, Y, 0];
const ORIGIN: Vec3 = [11, Y, 0];

export function CdnScene() {
  const cacheHit = useSystemStore((s) => s.cacheHit);
  const failure = useSystemStore((s) => s.failure);

  return (
    <group>
      <CloudZoneBox position={[-3, 1.6, 0]} size={[3.6, 3.2, 16]} color={C.edge} label="Edge PoPs" sublabel="hundreds of cities" />
      <CloudZoneBox position={[11, 1.6, 0]} size={[4, 3.2, 4.5]} color={failure ? C.error : C.public} label="Origin · us-east-1" sublabel={failure ? '5xx / unreachable' : 'S3 + app servers'} dashed={failure} />

      {USERS.map((p, i) => (
        <ServerNode key={i} id={`cdn-user-${i}`} kind="client" position={p} scale={0.8} label={`User · ${EDGE_NAMES[Math.floor(i / 2)]}`} color={C.client} description="DNS (or anycast) steers each user to a nearby edge PoP, typically < 20–30 ms away." />
      ))}
      {EDGES.map((p, i) => (
        <ServerNode
          key={i}
          id={`cdn-edge-${i}`}
          kind="cdn"
          position={p}
          label={`Edge · ${EDGE_NAMES[i]}`}
          sublabel={cacheHit ? 'HIT · age 42s / max-age 300' : failure ? 'MISS → serving stale' : 'MISS → fetch from shield'}
          color={cacheHit ? C.response : failure ? C.stale : C.miss}
          description="Edge caches terminate TLS close to users and serve cached objects keyed on URL (+ selected headers). Cache-Control, s-maxage and surrogate keys decide what is stored and for how long."
        />
      ))}
      <ServerNode id="cdn-shield" kind="cache" position={SHIELD} label="Origin shield" sublabel="regional tier · collapses misses" color={C.cache} description="A mid-tier cache in front of the origin. All edges miss into the shield, so the origin sees one request per object instead of one per PoP (request collapsing)." />
      <ServerNode id="cdn-origin" kind="server" position={ORIGIN} label="Origin" sublabel="source of truth" status={failure ? 'failed' : 'healthy'} color={C.server} description="Your application/storage. With a 95%+ hit ratio it only handles a small fraction of traffic. If it fails, `stale-if-error` lets the CDN keep serving expired content." />

      {USERS.map((u, i) => (
        <NetworkLink key={i} from={u} to={EDGES[Math.floor(i / 2)]} color={C.edge} />
      ))}
      {EDGES.map((e, i) => (
        <NetworkLink key={i} from={e} to={SHIELD} color={C.miss} status={cacheHit ? 'backup' : 'active'} dashed label={i === 1 && !cacheHit ? 'cache fill' : undefined} />
      ))}
      <NetworkLink from={SHIELD} to={ORIGIN} color={C.server} width={2.4} status={failure ? 'down' : cacheHit ? 'backup' : 'active'} label={failure ? 'origin down' : 'origin fetch'} />

      {USERS.map((u, i) => {
        const e = EDGES[Math.floor(i / 2)];
        if (cacheHit) {
          return <PacketFlow key={`hit-${i}`} waypoints={[u, e, u]} color={C.request} returnColor={C.response} max={6} speed={1.3} seed={i} />;
        }
        if (failure) {
          return <PacketFlow key={`stale-${i}`} waypoints={[u, e, SHIELD, e, u]} color={C.miss} returnColor={C.stale} max={5} seed={i} />;
        }
        return <PacketFlow key={`miss-${i}`} waypoints={[u, e, SHIELD, ORIGIN, SHIELD, e, u]} turnAt={3} color={C.miss} returnColor={C.response} max={5} speed={0.9} seed={i} />;
      })}
      {/* even at high hit ratios a trickle of long-tail misses reaches the origin */}
      {cacheHit && <PacketFlow key={`tail-${failure}`} waypoints={[SHIELD, ORIGIN, SHIELD]} color={failure ? C.error : C.miss} returnColor={C.response} max={2} size={0.1} speed={0.6} active={!failure} />}
    </group>
  );
}
