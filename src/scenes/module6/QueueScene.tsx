import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const PRODUCERS: Vec3[] = [-4, 0, 4].map((z) => [-14, Y, z] as Vec3);
const Q_IN: Vec3 = [-7, Y, 0];
const Q_OUT: Vec3 = [3, Y, 0];
const CONSUMERS: Vec3[] = [-4.5, 0, 4.5].map((z) => [10, Y, z] as Vec3);

export function QueueScene() {
  const failure = useSystemStore((s) => s.failure);
  const backlog = useSystemStore((s) => s.trafficRate >= 65);
  const live = failure ? [0, 2] : [0, 1, 2];

  return (
    <group>
      <CloudZoneBox position={[-2, 1.2, 0]} size={[11, 2.2, 3]} color={C.replicate} label="Queue (SQS / RabbitMQ)" sublabel="durable buffer · FIFO-ish · at-least-once" />
      {PRODUCERS.map((p, i) => (
        <ServerNode key={i} id={`q-p-${i}`} kind="server" position={p} label={`Producer ${i + 1}`} sublabel="SendMessage → 200 OK" color={C.server} description="Producers enqueue work and return immediately — they are decoupled from how fast (or whether) consumers are running." />
      ))}
      <ServerNode id="q-in" kind="storage" position={Q_IN} scale={0.8} label="enqueue" color={C.replicate} description="Messages are stored redundantly before the send is acknowledged." />
      <ServerNode id="q-out" kind="storage" position={Q_OUT} scale={0.8} label={backlog ? 'backlog growing' : 'receive'} sublabel={backlog ? 'oldest msg age ↑' : 'visibility timeout 30 s'} status={backlog ? 'degraded' : 'healthy'} color={C.replicate} description="A consumer receives a message, which becomes invisible to others for the visibility timeout. If not deleted in time, it reappears and is redelivered." />
      {CONSUMERS.map((p, i) => (
        <ServerNode
          key={i}
          id={`q-c-${i}`}
          kind="server"
          position={p}
          label={`Worker ${i + 1}`}
          sublabel={failure && i === 1 ? 'crashed mid-job' : 'process → DeleteMessage'}
          status={failure && i === 1 ? 'failed' : backlog ? 'degraded' : 'healthy'}
          color={C.gateway}
          description="Competing consumers: each message goes to exactly one worker at a time. Add workers to drain a backlog; processing must be idempotent because delivery is at-least-once."
        />
      ))}

      {PRODUCERS.map((p, i) => (
        <NetworkLink key={i} from={p} to={Q_IN} color={C.server} />
      ))}
      <NetworkLink from={Q_IN} to={Q_OUT} color={C.replicate} width={3} />
      {CONSUMERS.map((p, i) => (
        <NetworkLink key={i} from={Q_OUT} to={p} color={C.gateway} status={failure && i === 1 ? 'down' : 'active'} />
      ))}

      {PRODUCERS.map((p, i) => (
        <PacketFlow key={`p${i}`} waypoints={[p, Q_IN]} color={C.write} max={6} speed={1.2} seed={i} />
      ))}
      <PacketFlow waypoints={[Q_IN, Q_OUT]} color={C.write} max={backlog ? 14 : 7} size={0.15} speed={backlog ? 0.25 : 0.6} />
      {live.map((c) => (
        <PacketFlow key={`c${c}-${failure}`} waypoints={[Q_OUT, CONSUMERS[c]]} color={C.write} max={4} speed={backlog ? 0.6 : 1} seed={c} />
      ))}
      {failure && <PacketFlow key="redeliver" waypoints={[CONSUMERS[1], Q_OUT]} arc={1.2} color={C.miss} max={2} size={0.13} speed={0.4} />}
    </group>
  );
}
