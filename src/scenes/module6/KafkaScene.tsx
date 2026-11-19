import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const PZ = [-4.5, 0, 4.5];
const PCOLORS = ['#38bdf8', '#a78bfa', '#34d399'];
const PRODUCERS: Vec3[] = [
  [-15, Y, -3],
  [-15, Y, 3],
];
const P_START: Vec3[] = PZ.map((z) => [-8, Y, z] as Vec3);
const P_END: Vec3[] = PZ.map((z) => [3, Y, z] as Vec3);
const GROUP_A: Vec3[] = PZ.map((z) => [10, Y, z] as Vec3);
const GROUP_B: Vec3 = [6, Y, 9];

export function KafkaScene() {
  const failure = useSystemStore((s) => s.failure);
  // Group A assignment after rebalance: partition 1 moves to consumer A1.
  const assign = (p: number) => (failure && p === 1 ? 0 : p);

  return (
    <group>
      <CloudZoneBox position={[-2.5, 1.5, 0]} size={[13, 3, 13]} color={C.replicate} label="Topic: orders (3 partitions, RF=3)" sublabel="append-only logs on brokers" />
      <CloudZoneBox position={[10, 1.5, 0]} size={[4, 3, 13]} color={C.gateway} label="Consumer group A" sublabel="order-service" />
      {PRODUCERS.map((p, i) => (
        <ServerNode key={i} id={`k-p-${i}`} kind="server" position={p} label={`Producer ${i + 1}`} sublabel="key = customer_id" color={C.server} description="Producers send records with a key. hash(key) % partitions picks the partition, so all events for one customer stay in order in one partition." />
      ))}
      {PZ.map((z, i) => (
        <group key={z}>
          <ServerNode id={`k-ps-${i}`} kind="storage" position={P_START[i]} scale={0.75} label={`P${i} leader`} sublabel="broker " color={PCOLORS[i]} description="Partition leader on one broker; followers on other brokers replicate it (ISR). acks=all waits for in-sync replicas." />
          <ServerNode id={`k-pe-${i}`} kind="storage" position={P_END[i]} scale={0.75} label={`P${i} offset ${1200 + i * 87}`} sublabel="log end" color={PCOLORS[i]} description="Consumers track their position (offset) per partition. Records are retained by time/size, not deleted on read — any group can replay." />
        </group>
      ))}
      {GROUP_A.map((p, i) => (
        <ServerNode
          key={i}
          id={`k-a-${i}`}
          kind="server"
          position={p}
          label={`consumer A${i}`}
          sublabel={failure && i === 1 ? 'left group' : failure && i === 0 ? 'P0 + P1 (rebalanced)' : `owns P${i}`}
          status={failure && i === 1 ? 'failed' : 'healthy'}
          color={C.gateway}
          description="Within a consumer group each partition is owned by exactly one consumer — parallelism is capped by partition count. When a consumer leaves, the group rebalances its partitions to the others."
        />
      ))}
      <ServerNode id="k-b" kind="server" position={GROUP_B} label="Group B: analytics" sublabel="reads ALL partitions independently" color={C.miss} description="A second consumer group gets its own copy of the stream with its own offsets — this is how Kafka does pub/sub fan-out." />

      {PRODUCERS.map((p, i) => PZ.map((_, k) => <NetworkLink key={`${i}-${k}`} from={p} to={P_START[k]} color={C.server} width={0.9} />))}
      {PZ.map((_, i) => (
        <NetworkLink key={`log${i}`} from={P_START[i]} to={P_END[i]} color={PCOLORS[i]} width={4} />
      ))}
      {PZ.map((_, i) => (
        <NetworkLink key={`a${i}`} from={P_END[i]} to={GROUP_A[assign(i)]} color={PCOLORS[i]} dashed={failure && i === 1} label={failure && i === 1 ? 'reassigned' : undefined} />
      ))}
      {PZ.map((_, i) => (
        <NetworkLink key={`b${i}`} from={P_END[i]} to={GROUP_B} arc={0.8} color={C.miss} width={0.9} dashed />
      ))}

      {PRODUCERS.map((p, i) => (
        <PacketFlow key={`pr${i}`} waypoints={[p, P_START[i === 0 ? 0 : 2]]} color={PCOLORS[i === 0 ? 0 : 2]} max={4} seed={i} />
      ))}
      <PacketFlow waypoints={[PRODUCERS[0], P_START[1]]} color={PCOLORS[1]} max={3} seed={5} />
      {PZ.map((_, i) => (
        <PacketFlow key={`l${i}`} waypoints={[P_START[i], P_END[i]]} color={PCOLORS[i]} max={8} size={0.15} speed={0.6} seed={i} />
      ))}
      {PZ.map((_, i) => (
        <PacketFlow key={`ca${i}-${assign(i)}`} waypoints={[P_END[i], GROUP_A[assign(i)]]} color={PCOLORS[i]} max={4} seed={i} />
      ))}
      {PZ.map((_, i) => (
        <PacketFlow key={`cb${i}`} waypoints={[P_END[i], GROUP_B]} arc={0.8} color={PCOLORS[i]} max={2} size={0.1} speed={0.7} seed={i + 3} />
      ))}
    </group>
  );
}
