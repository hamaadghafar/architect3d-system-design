import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const CLIENTS: Vec3[] = [-4, 0, 4].map((z) => [-15, Y, z] as Vec3);
const LB: Vec3 = [-9, Y, 0];
const API: Vec3[] = [
  [-4, Y, -2.5],
  [-4, Y, 2.5],
];
const CACHE: Vec3 = [2, Y, -4.5];
const DB: Vec3 = [8, Y, 0];
const KGS: Vec3 = [2, Y, 5];
const STREAM: Vec3 = [2, Y, 0];
const ANALYTICS: Vec3 = [8, Y, 6];

export function UrlShortenerScene() {
  const variant = useSystemStore((s) => s.variant);
  const hit = useSystemStore((s) => s.cacheHit);
  const cacheDown = useSystemStore((s) => s.failure);
  const redirect = variant === 'redirect';

  return (
    <group>
      <CloudZoneBox position={[-4, 1.5, 0]} size={[3.6, 3, 9]} color={C.server} label="Stateless API" />
      {CLIENTS.map((p, i) => (
        <ServerNode key={i} id={`us-c-${i}`} kind="client" position={p} label={redirect ? `GET /x7Kp2Q` : 'POST /shorten'} color={C.client} description="Read-heavy workload: redirects outnumber creations by ~100:1." />
      ))}
      <ServerNode id="us-lb" kind="loadbalancer" position={LB} label="LB / edge" sublabel="301 cacheable at CDN" color={C.edge} description="Load balancer (often behind a CDN). Permanent 301 redirects can be cached by browsers/CDN; 302 keeps every click visible for analytics." />
      {API.map((p, i) => (
        <ServerNode key={i} id={`us-api-${i}`} kind="server" position={p} label={`api-${i + 1}`} color={C.server} description="Stateless service: create short codes, resolve them, emit click events." />
      ))}
      <ServerNode id="us-cache" kind="cache" position={CACHE} label="Redis" sublabel={cacheDown ? 'down' : hit ? 'code → URL HIT' : 'MISS → load'} status={cacheDown ? 'failed' : 'healthy'} color={C.cache} description="Hot short codes (a small fraction get most clicks) stay in memory; LRU eviction keeps the working set." />
      <ServerNode id="us-db" kind="database" position={DB} scale={1.2} label="URL store" sublabel="KV: code → long URL" status={cacheDown && redirect ? 'degraded' : 'healthy'} color={C.db} description="Key-value store (DynamoDB/Cassandra) keyed by short code — billions of rows, single-key lookups, easy to shard." />
      <ServerNode id="us-kgs" kind="hub" position={KGS} label="ID generator" sublabel="counter ranges → base62" status={redirect ? 'idle' : 'healthy'} color={C.miss} description="Unique codes without collisions: each API node leases a range of IDs (e.g. from a counter in ZooKeeper/DB) and base62-encodes them — 7 chars ≈ 3.5 trillion codes." />
      <ServerNode id="us-stream" kind="storage" position={STREAM} scale={0.8} label="Click stream" sublabel="Kafka" status={redirect ? 'healthy' : 'idle'} color={C.replicate} description="Click events are written asynchronously so analytics never slows the redirect." />
      <ServerNode id="us-an" kind="database" position={ANALYTICS} scale={0.9} label="Analytics" sublabel="clicks per code" color={C.replicate} description="Aggregations (clicks, geography, referrers) computed off the critical path." />

      {CLIENTS.map((p, i) => (
        <NetworkLink key={i} from={p} to={LB} color={C.edge} />
      ))}
      {API.map((p, i) => (
        <NetworkLink key={i} from={LB} to={p} color={C.server} />
      ))}
      {API.map((p, i) => (
        <NetworkLink key={`c${i}`} from={p} to={CACHE} color={C.cache} status={cacheDown ? 'down' : 'active'} />
      ))}
      {API.map((p, i) => (
        <NetworkLink key={`d${i}`} from={p} to={DB} color={C.db} width={1} status={redirect && hit && !cacheDown ? 'backup' : 'active'} />
      ))}
      <NetworkLink from={API[1]} to={KGS} color={C.miss} dashed status={redirect ? 'idle' : 'active'} />
      <NetworkLink from={API[0]} to={STREAM} color={C.replicate} dashed status={redirect ? 'active' : 'idle'} />
      <NetworkLink from={STREAM} to={ANALYTICS} color={C.replicate} dashed status={redirect ? 'active' : 'idle'} />

      {CLIENTS.map((p, i) => {
        const api = API[i % 2];
        if (!redirect) return <PacketFlow key={`w${i}`} waypoints={[p, LB, api, KGS, api, DB, api, LB, p]} turnAt={5} color={C.write} returnColor={C.response} max={3} seed={i} />;
        if (cacheDown || !hit) return <PacketFlow key={`m${i}-${cacheDown}`} waypoints={[p, LB, api, DB, api, LB, p]} color={C.miss} returnColor={C.response} max={6} speed={cacheDown ? 0.6 : 0.9} seed={i} />;
        return <PacketFlow key={`h${i}`} waypoints={[p, LB, api, CACHE, api, LB, p]} color={C.request} returnColor={C.response} max={6} speed={1.3} seed={i} />;
      })}
      {redirect && <PacketFlow waypoints={[API[0], STREAM, ANALYTICS]} color={C.replicate} max={3} size={0.1} speed={0.6} />}
      {!redirect && !cacheDown && <PacketFlow key="warm" waypoints={[API[1], CACHE]} color={C.write} max={2} size={0.1} speed={0.6} />}
    </group>
  );
}
