import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const CLIENTS: Vec3[] = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].map((z) => [-12, Y, z] as Vec3);
const CACHE: Vec3 = [-2, Y, 0];
const DB: Vec3 = [8, Y, 0];
const LOCK: Vec3 = [-2, Y, -6];

export function StampedeScene() {
  const fresh = useSystemStore((s) => s.cacheHit);
  const variant = useSystemStore((s) => s.variant);
  const protectedMode = variant === 'coalesced';
  const herd = !fresh && !protectedMode;

  return (
    <group>
      {CLIENTS.map((p, i) => (
        <ServerNode key={i} id={`st-c-${i}`} kind="client" position={p} scale={0.8} label={`req ${i + 1}`} color={C.client} description="Thousands of concurrent requests for the same hot key (home page, trending item)." />
      ))}
      <ServerNode
        id="st-cache"
        kind="cache"
        position={CACHE}
        scale={1.3}
        label="Cache · hot key"
        sublabel={fresh ? 'fresh' : protectedMode ? 'expired → 1 rebuild, others served stale' : 'expired → everyone misses'}
        status={herd ? 'degraded' : 'healthy'}
        color={C.cache}
        description="When a hot key expires, every concurrent request misses at the same instant. Without protection they all hit the database — a cache stampede (thundering herd / dog-piling)."
      />
      <ServerNode id="st-lock" kind="vpn" position={LOCK} label="Mutex / single-flight" sublabel={protectedMode ? 'SET lock NX PX 5000' : 'disabled'} status={protectedMode ? 'healthy' : 'idle'} color={C.miss} description="Request coalescing: the first miss takes a short lock and recomputes; others wait or get the stale value. Related tricks: probabilistic early refresh and TTL jitter." />
      <ServerNode id="st-db" kind="database" position={DB} scale={1.3} label="Database" sublabel={herd ? 'CPU 100% · timeouts' : 'one rebuild query'} status={herd ? 'failed' : 'healthy'} color={C.db} description="The expensive query behind the hot key. N identical concurrent queries can tip it over, which then makes the cache rebuild fail too." />

      {CLIENTS.map((p, i) => (
        <NetworkLink key={i} from={p} to={CACHE} color={C.cache} width={1.1} />
      ))}
      <NetworkLink from={CACHE} to={DB} color={C.db} width={herd ? 4 : 1.6} status={fresh ? 'backup' : herd ? 'degraded' : 'active'} label={herd ? `${CLIENTS.length}× identical queries` : !fresh ? '1 rebuild query' : undefined} />
      <NetworkLink from={CACHE} to={LOCK} color={C.miss} dashed status={protectedMode && !fresh ? 'active' : 'idle'} />

      {CLIENTS.map((p, i) => {
        if (fresh) return <PacketFlow key={`f${i}`} waypoints={[p, CACHE, p]} color={C.request} returnColor={C.response} max={5} speed={1.3} seed={i} />;
        if (herd) return <PacketFlow key={`h${i}`} waypoints={[p, CACHE, DB, CACHE, p]} color={C.miss} returnColor={C.error} max={5} speed={0.45} seed={i} />;
        return <PacketFlow key={`c${i}`} waypoints={[p, CACHE, p]} color={C.request} returnColor={C.stale} max={5} speed={1.1} seed={i} />;
      })}
      {!fresh && protectedMode && (
        <>
          <PacketFlow key="lock" waypoints={[CACHE, LOCK, CACHE]} color={C.miss} max={2} size={0.1} speed={0.8} />
          <PacketFlow key="rebuild" waypoints={[CACHE, DB, CACHE]} color={C.miss} returnColor={C.response} max={2} size={0.15} speed={0.6} />
        </>
      )}
    </group>
  );
}
