import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const USERS: Vec3[] = [
  [-14, Y, -5],
  [-14, Y, 5],
];
const DNS: Vec3 = [-9, Y, 0];
const RZ = [-5.5, 5.5];
const LB: Vec3[] = RZ.map((z) => [-2, Y, z] as Vec3);
const APP: Vec3[] = RZ.map((z) => [3, Y, z] as Vec3);
const DB: Vec3[] = RZ.map((z) => [8.5, Y, z] as Vec3);
const NAMES = ['us-east-1', 'eu-west-1'];

export function MultiRegionScene() {
  const variant = useSystemStore((s) => s.variant);
  const failure = useSystemStore((s) => s.failure);
  const aa = variant === 'aa';

  // Which region serves each user group.
  const target = (u: number) => {
    if (failure) return 1;
    return aa ? u : 0;
  };
  const regionStatus = (r: number) => {
    if (failure && r === 0) return 'failed' as const;
    if (!aa && r === 1 && !failure) return 'standby' as const;
    return 'healthy' as const;
  };

  return (
    <group>
      {RZ.map((z, r) => (
        <CloudZoneBox
          key={z}
          position={[3.5, 1.6, z]}
          size={[14, 3.2, 4.6]}
          color={failure && r === 0 ? C.error : !aa && r === 1 && !failure ? C.neutral : C.public}
          label={`${NAMES[r]} · ${failure && r === 0 ? 'REGION DOWN' : aa ? 'active' : r === 0 ? 'active (primary)' : failure ? 'promoted → active' : 'passive (standby)'}`}
          dashed={failure && r === 0}
        />
      ))}
      {USERS.map((p, i) => (
        <ServerNode key={i} id={`mr-u-${i}`} kind="client" position={p} label={i === 0 ? 'Users · Americas' : 'Users · Europe'} color={C.client} description="Users worldwide. In active-active they are served by the nearest region; in active-passive everyone goes to the primary." />
      ))}
      <ServerNode id="mr-dns" kind="dns" position={DNS} scale={1.2} label="Global routing" sublabel={aa ? 'latency-based + health checks' : 'failover record'} color={C.edge} description="Route 53 / Global Accelerator / anycast front door. Health checks remove a failed region from answers." />
      {RZ.map((_, r) => (
        <group key={r}>
          <ServerNode id={`mr-lb-${r}`} kind="loadbalancer" position={LB[r]} label="LB" status={regionStatus(r)} color={C.edge} description="Regional entry point." />
          <ServerNode id={`mr-app-${r}`} kind="server" position={APP[r]} label="App fleet" sublabel={!aa && r === 1 && !failure ? 'scaled down (warm standby)' : 'serving'} status={regionStatus(r)} color={C.server} description="Stateless application tier. In warm standby it runs at minimum size and scales out during failover." />
          <ServerNode
            id={`mr-db-${r}`}
            kind="database"
            position={DB[r]}
            label={aa ? 'DB (multi-writer)' : r === 0 ? 'DB primary' : failure ? 'DB promoted' : 'DB replica'}
            sublabel={aa ? 'DynamoDB global table / Spanner' : 'async cross-region replica'}
            status={regionStatus(r)}
            color={C.db}
            description="Data is the hard part. Active-active needs multi-region writes with conflict resolution (or partitioning users by home region). Active-passive replicates one way and promotes the replica on failover — losing any un-replicated writes (RPO > 0)."
          />
        </group>
      ))}

      {USERS.map((p, i) => (
        <NetworkLink key={i} from={p} to={DNS} color={C.edge} />
      ))}
      {RZ.map((_, r) => (
        <NetworkLink key={r} from={DNS} to={LB[r]} color={C.edge} status={failure && r === 0 ? 'down' : !aa && r === 1 && !failure ? 'backup' : 'active'} />
      ))}
      {RZ.map((_, r) => (
        <group key={`c${r}`}>
          <NetworkLink from={LB[r]} to={APP[r]} color={C.server} status={regionStatus(r) === 'failed' ? 'idle' : 'active'} />
          <NetworkLink from={APP[r]} to={DB[r]} color={C.db} status={regionStatus(r) === 'failed' ? 'idle' : 'active'} />
        </group>
      ))}
      <NetworkLink from={DB[0]} to={DB[1]} arc={1} color={C.replicate} dashed status={failure ? 'down' : 'active'} label={aa ? 'bi-directional replication' : 'one-way async replication'} />

      {USERS.map((p, u) => {
        const r = target(u);
        return <PacketFlow key={`${u}-${r}`} waypoints={[p, DNS, LB[r], APP[r], DB[r], APP[r], LB[r], DNS, p]} turnAt={4} color={C.request} returnColor={C.response} max={6} seed={u} />;
      })}
      {!failure && <PacketFlow key="rep1" waypoints={[DB[0], DB[1]]} arc={1} color={C.replicate} max={3} size={0.1} speed={0.6} />}
      {!failure && aa && <PacketFlow key="rep2" waypoints={[DB[1], DB[0]]} arc={1} color={C.replicate} max={3} size={0.1} speed={0.6} seed={3} />}
    </group>
  );
}
