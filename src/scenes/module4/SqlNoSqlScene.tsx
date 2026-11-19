import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const APPS: Vec3[] = [
  [-12, Y, -3],
  [-12, Y, 3],
];

function SqlView({ failure }: { failure: boolean }) {
  const DB: Vec3 = [-2, Y, 0];
  const STANDBY: Vec3 = [-2, Y, 6];
  const TABLES: { name: string; pos: Vec3 }[] = [
    { name: 'users', pos: [5, Y, -4.5] },
    { name: 'orders', pos: [7, Y, 0] },
    { name: 'payments', pos: [5, Y, 4.5] },
  ];
  const writer = failure ? STANDBY : DB;
  return (
    <group>
      <CloudZoneBox position={[2.5, 1.7, 0]} size={[14, 3.4, 15]} color={C.db} label="Relational database (PostgreSQL / MySQL)" sublabel="one schema · ACID transactions · JOINs" />
      <ServerNode id="sql-db" kind="database" position={DB} scale={1.4} label="Primary" sublabel="single writer" status={failure ? 'failed' : 'healthy'} color={C.db} description="All writes go to one primary that enforces constraints and transactions. Scaling writes beyond one machine requires sharding, which the database does not do for you." />
      <ServerNode id="sql-standby" kind="database" position={STANDBY} label={failure ? 'Primary (promoted)' : 'Standby'} sublabel="sync replica" status={failure ? 'healthy' : 'standby'} color={C.db} description="A synchronous standby for failover. Promotion takes tens of seconds to a couple of minutes; clients must reconnect." />
      {TABLES.map((t) => (
        <ServerNode key={t.name} id={`sql-t-${t.name}`} kind="storage" position={t.pos} scale={0.75} label={`table: ${t.name}`} sublabel="normalised rows" color={C.replicate} description="Normalised tables linked by foreign keys. A query can JOIN them and a transaction can update several atomically." />
      ))}
      {APPS.map((a, i) => (
        <ServerNode key={i} id={`sql-app-${i}`} kind="server" position={a} label={`App ${i + 1}`} sublabel="SQL over TCP" color={C.server} description="Applications send SQL; the database plans the query (indexes, joins) and returns rows." />
      ))}
      {APPS.map((a, i) => (
        <NetworkLink key={i} from={a} to={writer} color={C.db} />
      ))}
      {TABLES.map((t) => (
        <NetworkLink key={t.name} from={writer} to={t.pos} color={C.replicate} width={1.1} />
      ))}
      <NetworkLink from={TABLES[0].pos} to={TABLES[1].pos} arc={0.5} color={C.miss} dashed label="FK user_id" />
      <NetworkLink from={TABLES[1].pos} to={TABLES[2].pos} arc={0.5} color={C.miss} dashed label="FK order_id" />
      <NetworkLink from={DB} to={STANDBY} color={C.replicate} dashed status={failure ? 'down' : 'active'} label={failure ? 'failover' : 'sync replication'} />
      {APPS.map((a, i) => (
        <PacketFlow key={`${i}-${failure}`} waypoints={[a, writer, TABLES[i].pos, TABLES[1].pos, writer, a]} turnAt={3} color={C.request} returnColor={C.response} max={6} seed={i} />
      ))}
    </group>
  );
}

function NoSqlView({ failure }: { failure: boolean }) {
  const ROUTER: Vec3 = [-4, Y, 0];
  const PZ = [-6, -2, 2, 6];
  return (
    <group>
      {PZ.map((z, p) => (
        <CloudZoneBox key={z} position={[6, 1.3, z]} size={[8, 2.4, 3]} color={C.dx} label={`partition ${p} · keys ${['A–F', 'G–M', 'N–S', 'T–Z'][p]}`} opacity={0.035} />
      ))}
      <ServerNode id="nosql-router" kind="loadbalancer" position={ROUTER} label="Request router" sublabel="hash(partition key)" color={C.dx} description="The partition key is hashed to find which partition (and which storage nodes) own the item. No cross-partition JOINs: access patterns are designed up front." />
      {APPS.map((a, i) => (
        <ServerNode key={i} id={`nosql-app-${i}`} kind="server" position={a} label={`App ${i + 1}`} sublabel="GetItem / PutItem" color={C.server} description="Applications read and write items by key through an HTTP API (DynamoDB) or driver (Cassandra, MongoDB)." />
      ))}
      {PZ.map((z, p) =>
        [3, 6, 9].map((x, r) => {
          const down = failure && p === 1 && r === 0;
          return (
            <ServerNode
              key={`${p}-${r}`}
              id={`nosql-${p}-${r}`}
              kind="database"
              position={[x, Y, z]}
              scale={0.7}
              labelSize={18}
              label={r === 0 ? (down ? 'leader (down)' : 'leader') : failure && p === 1 && r === 1 ? 'new leader' : `replica ${r}`}
              status={down ? 'failed' : 'healthy'}
              color={C.dx}
              description="Each partition is replicated (typically 3×, across AZs). A leader takes writes; if it fails, a replica is elected and the partition keeps serving."
            />
          );
        }),
      )}
      {APPS.map((a, i) => (
        <NetworkLink key={i} from={a} to={ROUTER} color={C.dx} />
      ))}
      {PZ.map((z, p) => (
        <NetworkLink key={z} from={ROUTER} to={[failure && p === 1 ? 6 : 3, Y, z]} color={C.dx} />
      ))}
      {PZ.map((z, p) => (
        <NetworkLink key={`r${z}`} from={[3, Y, z]} to={[9, Y, z]} arc={0.6} color={C.replicate} dashed status={failure && p === 1 ? 'degraded' : 'active'} />
      ))}
      {PZ.map((z, p) => {
        const leader: Vec3 = [failure && p === 1 ? 6 : 3, Y, z];
        return <PacketFlow key={`${p}-${failure}`} waypoints={[APPS[p % 2], ROUTER, leader, ROUTER, APPS[p % 2]]} color={C.request} returnColor={C.response} max={5} speed={1.2} seed={p} />;
      })}
    </group>
  );
}

export function SqlNoSqlScene() {
  const variant = useSystemStore((s) => s.variant);
  const failure = useSystemStore((s) => s.failure);
  return variant === 'sql' ? <SqlView failure={failure} /> : <NoSqlView failure={failure} />;
}
