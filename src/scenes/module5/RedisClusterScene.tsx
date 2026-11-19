import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const CLIENTS: Vec3[] = [-4, 0, 4].map((z) => [-13, Y, z] as Vec3);
const SHARD_Z = [-5.5, 0, 5.5];
const SLOTS = ['0 – 5460', '5461 – 10922', '10923 – 16383'];
const MASTERS: Vec3[] = SHARD_Z.map((z) => [1, Y, z] as Vec3);
const REPLICAS: Vec3[] = SHARD_Z.map((z) => [7, Y, z] as Vec3);

export function RedisClusterScene() {
  const failure = useSystemStore((s) => s.failure);
  const owner = (i: number) => (failure && i === 0 ? REPLICAS[0] : MASTERS[i]);

  return (
    <group>
      {SHARD_Z.map((z, i) => (
        <CloudZoneBox key={z} position={[4, 1.3, z]} size={[9, 2.6, 4]} color={C.cache} label={`shard ${i + 1} · slots ${SLOTS[i]}`} opacity={0.035} />
      ))}
      {CLIENTS.map((p, i) => (
        <ServerNode key={i} id={`rc-c-${i}`} kind="server" position={p} label={`App ${i + 1}`} sublabel="cluster-aware client" color={C.server} description="The client computes CRC16(key) mod 16384 to find the slot, keeps a slot → node map, and talks directly to the owning master. A MOVED reply updates its map." />
      ))}
      {MASTERS.map((p, i) => (
        <ServerNode
          key={i}
          id={`rc-m-${i}`}
          kind="cache"
          position={p}
          scale={1.1}
          label={`master ${i + 1}`}
          sublabel={failure && i === 0 ? 'FAIL (gossip consensus)' : `${SLOTS[i]}`}
          status={failure && i === 0 ? 'failed' : 'healthy'}
          color={C.cache}
          description="A master owns a range of the 16,384 hash slots and serves reads/writes for keys in those slots. Masters gossip over the cluster bus to detect failures."
        />
      ))}
      {REPLICAS.map((p, i) => (
        <ServerNode
          key={i}
          id={`rc-r-${i}`}
          kind="cache"
          position={p}
          scale={0.9}
          label={failure && i === 0 ? 'promoted → master' : `replica ${i + 1}`}
          sublabel={failure && i === 0 ? 'took over slots' : 'async replication'}
          status={failure && i === 0 ? 'healthy' : 'standby'}
          color={C.replicate}
          description="Each master has replicas. When a majority of masters agree a master is down, one of its replicas is promoted and takes over its slots (seconds). Async replication means the last few writes can be lost."
        />
      ))}

      {CLIENTS.map((p, i) => (
        <NetworkLink key={i} from={p} to={owner(i)} color={C.cache} />
      ))}
      {MASTERS.map((p, i) => (
        <NetworkLink key={i} from={p} to={REPLICAS[i]} color={C.replicate} dashed status={failure && i === 0 ? 'down' : 'active'} />
      ))}
      <NetworkLink from={MASTERS[0]} to={MASTERS[1]} arc={0.6} color={C.neutral} dashed label="cluster bus (gossip)" status={failure ? 'degraded' : 'active'} />
      <NetworkLink from={MASTERS[1]} to={MASTERS[2]} arc={0.6} color={C.neutral} dashed />

      {CLIENTS.map((p, i) => (
        <PacketFlow key={`${i}-${failure}`} waypoints={[p, owner(i), p]} color={C.request} returnColor={C.response} max={6} speed={1.3} seed={i} />
      ))}
      {MASTERS.map((p, i) => (failure && i === 0 ? null : <PacketFlow key={`r${i}`} waypoints={[p, REPLICAS[i]]} color={C.replicate} max={2} size={0.09} speed={0.7} seed={i} />))}
    </group>
  );
}
