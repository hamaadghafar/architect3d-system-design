import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const A1: Vec3 = [-5, Y, -3];
const A2: Vec3 = [-5, Y, 3];
const B1: Vec3 = [6, Y, 0];
const CA: Vec3 = [-13, Y, 0];
const CB: Vec3 = [13, Y, 0];

export function CapScene() {
  const variant = useSystemStore((s) => s.variant);
  const partition = useSystemStore((s) => s.failure);
  const cp = variant === 'cp';
  const linkStatus = partition ? 'down' : 'active';

  return (
    <group>
      <CloudZoneBox position={[-6.5, 1.6, 0]} size={[7, 3.2, 11]} color={C.public} label="Region A · majority (2 of 3)" />
      <CloudZoneBox position={[8, 1.6, 0]} size={[7, 3.2, 8]} color={partition ? C.miss : C.public} label={`Region B · minority (1 of 3)${partition ? ' · isolated' : ''}`} dashed={partition} />

      <ServerNode id="cap-ca" kind="client" position={CA} label="Clients A" color={C.client} description="Clients near region A." />
      <ServerNode id="cap-cb" kind="client" position={CB} label="Clients B" color={C.client} description="Clients near region B — the side cut off by the partition." />
      <ServerNode id="cap-a1" kind="database" position={A1} label="Replica A1" sublabel={cp ? 'Raft leader' : 'accepts writes'} color={C.db} description="A replica in the majority partition. With a quorum (2 of 3) it can keep committing writes in either mode." />
      <ServerNode id="cap-a2" kind="database" position={A2} label="Replica A2" sublabel="follower" color={C.db} description="Second replica in region A — together with A1 it forms a majority quorum." />
      <ServerNode
        id="cap-b1"
        kind="database"
        position={B1}
        label="Replica B1"
        sublabel={partition ? (cp ? 'no quorum → rejects writes' : 'accepts writes → divergence') : 'follower'}
        status={partition ? (cp ? 'failed' : 'degraded') : 'healthy'}
        color={C.db}
        description="During a partition this replica must choose: refuse requests to stay consistent (CP) or keep serving and risk returning stale data / accepting conflicting writes (AP)."
      />

      <NetworkLink from={CA} to={A1} color={C.edge} />
      <NetworkLink from={CB} to={B1} color={C.edge} status={partition && cp ? 'degraded' : 'active'} label={partition && cp ? '503 / timeout' : undefined} />
      <NetworkLink from={A1} to={A2} color={C.replicate} dashed />
      <NetworkLink from={A1} to={B1} arc={0.6} color={C.replicate} dashed status={linkStatus} label={partition ? 'network partition' : 'replication'} />
      <NetworkLink from={A2} to={B1} arc={0.6} color={C.replicate} dashed status={linkStatus} />

      <PacketFlow key={`a-${partition}`} waypoints={[CA, A1, A2, A1, CA]} color={C.write} returnColor={C.response} max={6} />
      {!partition && <PacketFlow waypoints={[A1, B1]} arc={0.6} color={C.replicate} max={3} size={0.1} speed={0.8} />}
      {!partition && <PacketFlow key="b-ok" waypoints={[CB, B1, A1, B1, CB]} turnAt={2} arc={0.3} color={C.write} returnColor={C.response} max={5} seed={2} />}
      {partition && cp && <PacketFlow key="b-cp" waypoints={[CB, B1, CB]} color={C.write} returnColor={C.error} max={6} seed={2} />}
      {partition && !cp && <PacketFlow key="b-ap" waypoints={[CB, B1, CB]} color={C.write} returnColor={C.miss} max={6} seed={2} />}
    </group>
  );
}
