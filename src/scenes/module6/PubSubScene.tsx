import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const PUB: Vec3 = [-13, Y, 0];
const TOPIC: Vec3 = [-5, Y, 0];
const QZ = [-6, 0, 6];
const QUEUES: Vec3[] = QZ.map((z) => [2, Y, z] as Vec3);
const SUBS: Vec3[] = QZ.map((z) => [10, Y, z] as Vec3);
const NAMES = ['email-service', 'analytics', 'inventory'];

export function PubSubScene() {
  const failure = useSystemStore((s) => s.failure);

  return (
    <group>
      <ServerNode id="ps-pub" kind="server" position={PUB} scale={1.1} label="order-service" sublabel="publish OrderPlaced" color={C.server} description="The publisher emits one event and does not know (or care) who consumes it. New subscribers can be added without touching the publisher." />
      <ServerNode id="ps-topic" kind="hub" position={TOPIC} scale={1.3} label="Topic (SNS / Pub/Sub)" sublabel="fan-out to all subscriptions" color={C.replicate} description="The topic copies every message to every subscription — optionally filtered per subscription (e.g. only orders > $100)." />
      {QUEUES.map((p, i) => (
        <ServerNode
          key={i}
          id={`ps-q-${i}`}
          kind="storage"
          position={p}
          scale={0.85}
          label={`queue: ${NAMES[i]}`}
          sublabel={failure && i === 2 ? 'buffering · depth ↑' : 'durable subscription'}
          status={failure && i === 2 ? 'degraded' : 'healthy'}
          color={C.replicate}
          description="Fan-out to a queue per subscriber (SNS → SQS pattern) gives each consumer its own buffer, retries and pace. A slow or dead subscriber only affects its own queue."
        />
      ))}
      {SUBS.map((p, i) => (
        <ServerNode key={i} id={`ps-s-${i}`} kind="server" position={p} label={NAMES[i]} sublabel={failure && i === 2 ? 'DOWN' : 'consuming'} status={failure && i === 2 ? 'failed' : 'healthy'} color={C.gateway} description="Each subscriber reacts independently: send a confirmation email, update dashboards, reserve stock." />
      ))}

      <NetworkLink from={PUB} to={TOPIC} color={C.server} width={2.4} />
      {QUEUES.map((p, i) => (
        <NetworkLink key={i} from={TOPIC} to={p} color={C.replicate} />
      ))}
      {QUEUES.map((p, i) => (
        <NetworkLink key={`s${i}`} from={p} to={SUBS[i]} color={C.gateway} status={failure && i === 2 ? 'down' : 'active'} />
      ))}

      <PacketFlow waypoints={[PUB, TOPIC]} color={C.write} max={6} />
      {QUEUES.map((p, i) => (
        <PacketFlow key={`f${i}`} waypoints={[TOPIC, p]} color={C.write} max={5} seed={i} />
      ))}
      {QUEUES.map((p, i) => (
        <PacketFlow key={`c${i}-${failure}`} waypoints={[p, SUBS[i]]} color={C.write} max={4} active={!(failure && i === 2)} seed={i + 2} />
      ))}
    </group>
  );
}
