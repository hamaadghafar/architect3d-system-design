import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const CLIENTS: Vec3[] = [-4, 0, 4].map((z) => [-13, Y, z] as Vec3);
const APP: Vec3 = [-5, Y, 0];
const CACHE: Vec3 = [3, Y, -4.5];
const DB: Vec3 = [5, Y, 4.5];

export function CacheAsideScene() {
  const hit = useSystemStore((s) => s.cacheHit);
  const cacheDown = useSystemStore((s) => s.failure);
  const dbHot = useSystemStore((s) => s.trafficRate >= 60);
  const toDb = cacheDown || !hit;

  return (
    <group>
      {CLIENTS.map((p, i) => (
        <ServerNode key={i} id={`ca-c-${i}`} kind="client" position={p} label={`Client ${i + 1}`} sublabel="GET /product/42" color={C.client} description="Read-heavy traffic: the same products are requested again and again." />
      ))}
      <ServerNode id="ca-app" kind="server" position={APP} scale={1.2} label="App server" sublabel="owns the caching logic" color={C.server} description="Cache-aside (lazy loading): the application checks the cache first; on a miss it reads the database and populates the cache with a TTL. On writes it updates the DB and deletes (invalidates) the cache key." />
      <ServerNode id="ca-cache" kind="cache" position={CACHE} scale={1.2} label="Redis cache" sublabel={cacheDown ? 'unreachable' : hit ? 'GET product:42 → HIT' : 'GET → MISS → SET ttl=300'} status={cacheDown ? 'failed' : 'healthy'} color={C.cache} description="In-memory key-value store with sub-millisecond reads. Holds only what has been requested recently." />
      <ServerNode id="ca-db" kind="database" position={DB} scale={1.2} label="PostgreSQL" sublabel={toDb && dbHot ? 'overloaded' : 'source of truth'} status={toDb && dbHot ? 'degraded' : 'healthy'} color={C.db} description="The database only sees cache misses. If the cache disappears, every read lands here — the DB must be able to survive (or the app must shed load)." />

      {CLIENTS.map((p, i) => (
        <NetworkLink key={i} from={p} to={APP} color={C.edge} />
      ))}
      <NetworkLink from={APP} to={CACHE} color={C.cache} status={cacheDown ? 'down' : 'active'} label={cacheDown ? 'cache down' : '1. GET'} />
      <NetworkLink from={APP} to={DB} color={C.db} status={toDb ? 'active' : 'backup'} label={toDb ? '2. SELECT on miss' : undefined} />

      {CLIENTS.map((p, i) => {
        if (cacheDown) return <PacketFlow key={`d${i}`} waypoints={[p, APP, DB, APP, p]} color={C.request} returnColor={dbHot ? C.miss : C.response} speed={dbHot ? 0.5 : 0.9} max={6} seed={i} />;
        if (hit) return <PacketFlow key={`h${i}`} waypoints={[p, APP, CACHE, APP, p]} color={C.request} returnColor={C.response} speed={1.3} max={6} seed={i} />;
        return <PacketFlow key={`m${i}`} waypoints={[p, APP, CACHE, APP, DB, APP, p]} turnAt={4} color={C.miss} returnColor={C.response} max={6} seed={i} />;
      })}
      {!hit && !cacheDown && <PacketFlow key="set" waypoints={[APP, CACHE]} color={C.write} max={3} size={0.11} speed={0.8} />}
    </group>
  );
}
