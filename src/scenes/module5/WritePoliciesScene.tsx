import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const APP: Vec3 = [-10, Y, 0];
const CACHE: Vec3 = [-1, Y, -3];
const BUFFER: Vec3 = [4, Y, 4];
const DB: Vec3 = [9, Y, -3];

export function WritePoliciesScene() {
  const variant = useSystemStore((s) => s.variant);
  const crash = useSystemStore((s) => s.failure);

  const through = variant === 'through';
  const behind = variant === 'behind';
  const around = variant === 'around';

  return (
    <group>
      <ServerNode id="wp-app" kind="server" position={APP} scale={1.2} label="App" sublabel="UPDATE cart:42" color={C.server} description="The writer. Which component acknowledges the write — and when — is the difference between the three policies." />
      <ServerNode
        id="wp-cache"
        kind="cache"
        position={CACHE}
        scale={1.2}
        label="Cache"
        sublabel={around ? 'key invalidated' : through ? 'write → then DB' : 'write → ack now'}
        status={crash ? 'failed' : 'healthy'}
        color={C.cache}
        description="Write-through: the cache writes to the DB synchronously before acknowledging. Write-behind: the cache acknowledges immediately and flushes to the DB later. Write-around: writes bypass the cache and go straight to the DB."
      />
      <ServerNode id="wp-buffer" kind="storage" position={BUFFER} scale={0.9} label="Write-behind buffer" sublabel={behind ? (crash ? 'unflushed writes LOST' : 'batched every 1 s') : 'unused'} status={behind ? (crash ? 'failed' : 'healthy') : 'idle'} color={C.miss} description="Write-behind (write-back) coalesces many writes into batches, smoothing DB load — but anything still in the buffer when the cache node dies is lost unless the buffer is durable (e.g. a replicated log)." />
      <ServerNode id="wp-db" kind="database" position={DB} scale={1.2} label="Database" sublabel="durable source of truth" color={C.db} description="Durability lives here. Policies differ in how quickly and how reliably a write reaches it." />

      <NetworkLink from={APP} to={CACHE} color={C.cache} status={crash ? 'down' : around ? 'backup' : 'active'} label={around ? 'DEL key' : 'SET'} />
      <NetworkLink from={CACHE} to={DB} color={C.db} status={through && !crash ? 'active' : 'idle'} label={through ? 'sync write' : undefined} />
      <NetworkLink from={CACHE} to={BUFFER} color={C.miss} dashed status={behind ? (crash ? 'down' : 'active') : 'idle'} />
      <NetworkLink from={BUFFER} to={DB} color={C.miss} dashed status={behind && !crash ? 'active' : 'idle'} label={behind ? 'async batch' : undefined} />
      <NetworkLink from={APP} to={DB} arc={1.6} color={C.db} status={around || (through && crash) ? 'active' : 'idle'} label={around ? 'direct write' : through && crash ? 'fallback: DB only' : undefined} />

      {through && !crash && <PacketFlow key="wt" waypoints={[APP, CACHE, DB, CACHE, APP]} color={C.write} returnColor={C.response} max={6} speed={0.8} />}
      {through && crash && <PacketFlow key="wt-f" waypoints={[APP, DB, APP]} arc={1.6} color={C.write} returnColor={C.response} max={6} />}
      {behind && !crash && (
        <>
          <PacketFlow key="wb" waypoints={[APP, CACHE, APP]} color={C.write} returnColor={C.response} max={7} speed={1.4} />
          <PacketFlow key="wb2" waypoints={[CACHE, BUFFER, DB]} color={C.miss} max={3} size={0.16} speed={0.5} />
        </>
      )}
      {behind && crash && <PacketFlow key="wb-lost" waypoints={[APP, CACHE, APP]} color={C.write} returnColor={C.error} max={6} />}
      {around && (
        <>
          <PacketFlow key="wa" waypoints={[APP, DB, APP]} arc={1.6} color={C.write} returnColor={C.response} max={6} />
          {!crash && <PacketFlow key="wa-del" waypoints={[APP, CACHE]} color={C.cache} max={2} size={0.1} speed={0.7} />}
        </>
      )}
    </group>
  );
}
