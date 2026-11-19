import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const APPS: Vec3[] = [-4.5, 0, 4.5].map((z) => [-13, Y, z] as Vec3);
const PRIMARY: Vec3 = [-1, Y, -6];
const READER: Vec3 = [-5.5, Y, 2];
const REPLICAS: Vec3[] = [
  [5, Y, -2],
  [5, Y, 2.5],
  [5, Y, 7],
];

export function ReadReplicasScene() {
  const failure = useSystemStore((s) => s.failure);
  const lagging = useSystemStore((s) => s.trafficRate >= 75);
  const writer = failure ? REPLICAS[0] : PRIMARY;
  const readers = failure ? [1, 2] : [0, 1, 2];

  return (
    <group>
      <CloudZoneBox position={[5, 1.6, 2.5]} size={[4, 3.2, 13.5]} color={C.replicate} label="Read replicas" sublabel="async · eventually consistent" />
      {APPS.map((p, i) => (
        <ServerNode key={i} id={`rr-app-${i}`} kind="server" position={p} label={`App ${i + 1}`} sublabel="writes → primary · reads → reader" color={C.server} description="The application splits traffic: writes (and reads that must be fresh) go to the primary endpoint; other reads go to the reader endpoint." />
      ))}
      <ServerNode id="rr-primary" kind="database" position={PRIMARY} scale={1.3} label={failure ? 'Primary (failed)' : 'Primary'} sublabel="all writes" status={failure ? 'failed' : 'healthy'} color={C.db} description="The single writer. It streams its write-ahead log / binlog to every replica." />
      <ServerNode id="rr-reader" kind="loadbalancer" position={READER} label="Reader endpoint" sublabel="balances across replicas" color={C.edge} description="A DNS name or proxy (RDS reader endpoint, ProxySQL, PgBouncer + HAProxy) that spreads read connections across healthy replicas." />
      {REPLICAS.map((p, i) => (
        <ServerNode
          key={i}
          id={`rr-rep-${i}`}
          kind="database"
          position={p}
          label={failure && i === 0 ? 'Promoted → primary' : `Replica ${i + 1}`}
          sublabel={failure && i === 0 ? 'now takes writes' : lagging ? 'lag ~2–5 s' : 'lag ~20 ms'}
          status={lagging && !(failure && i === 0) ? 'degraded' : 'healthy'}
          color={C.replicate}
          description="Applies the primary’s change stream asynchronously. It serves reads, so a read right after a write may not see that write yet (replication lag)."
        />
      ))}

      {APPS.map((p, i) => (
        <NetworkLink key={`w${i}`} from={p} to={writer} color={C.write} />
      ))}
      {APPS.map((p, i) => (
        <NetworkLink key={`r${i}`} from={p} to={READER} color={C.edge} />
      ))}
      {REPLICAS.map((p, i) => (
        <NetworkLink key={`rd${i}`} from={READER} to={p} color={C.edge} status={readers.includes(i) ? 'active' : 'idle'} />
      ))}
      {REPLICAS.map((p, i) =>
        failure && i === 0 ? null : (
          <NetworkLink key={`rep${i}`} from={writer} to={p} arc={0.8} color={C.replicate} dashed label={i === 2 ? (lagging ? 'replication lag ↑' : 'WAL stream') : undefined} status={lagging ? 'degraded' : 'active'} />
        ),
      )}

      {APPS.map((p, i) => (
        <PacketFlow key={`wf${i}-${failure}`} waypoints={[p, writer, p]} color={C.write} returnColor={C.response} max={3} seed={i} />
      ))}
      {APPS.map((p, i) => {
        const r = readers[i % readers.length];
        return <PacketFlow key={`rf${i}-${r}`} waypoints={[p, READER, REPLICAS[r], READER, p]} color={C.request} returnColor={C.response} max={6} seed={i + 3} />;
      })}
      {REPLICAS.map((p, i) =>
        failure && i === 0 ? null : <PacketFlow key={`rp${i}-${failure}`} waypoints={[writer, p]} arc={0.8} color={C.replicate} max={3} size={0.09} speed={lagging ? 0.35 : 0.8} seed={i} />,
      )}
    </group>
  );
}
