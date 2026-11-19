import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const PRODUCER: Vec3 = [-13, Y, 0];
const QUEUE: Vec3 = [-4, Y, 0];
const CONSUMER: Vec3 = [5, Y, 0];
const DB: Vec3 = [12, Y, 0];
const DLQ: Vec3 = [-4, Y, 7];
const ALARM: Vec3 = [5, Y, 7];

export function DlqScene() {
  const poison = useSystemStore((s) => s.failure);

  return (
    <group>
      <ServerNode id="dlq-p" kind="server" position={PRODUCER} label="Producer" sublabel="payment events" color={C.server} description="Sends messages — including, occasionally, one the consumer can never process (malformed JSON, unknown schema version, a bug-triggering value)." />
      <ServerNode id="dlq-q" kind="storage" position={QUEUE} scale={1.1} label="Main queue" sublabel="maxReceiveCount = 3" color={C.replicate} description="A redrive policy moves a message to the DLQ after it has been received (and not deleted) maxReceiveCount times." />
      <ServerNode id="dlq-c" kind="server" position={CONSUMER} label="Consumer" sublabel={poison ? 'throws on msg #8812' : 'process → delete'} status={poison ? 'degraded' : 'healthy'} color={C.gateway} description="Without a DLQ, a poison message is retried forever: it burns capacity, can block FIFO ordering, and floods logs with the same error." />
      <ServerNode id="dlq-db" kind="database" position={DB} label="Ledger DB" color={C.db} description="Successful messages are applied here (idempotently)." />
      <ServerNode id="dlq-dlq" kind="storage" position={DLQ} scale={1.1} label="Dead-letter queue" sublabel={poison ? '1 message parked' : 'empty'} status={poison ? 'degraded' : 'idle'} color={C.error} description="Quarantine for messages that repeatedly failed. Inspect them, fix the bug or data, then redrive them back to the main queue." />
      <ServerNode id="dlq-alarm" kind="hub" position={ALARM} label="Alarm: DLQ depth > 0" sublabel={poison ? 'PAGING on-call' : 'OK'} status={poison ? 'failed' : 'idle'} color={C.miss} description="Always alarm on DLQ depth — a DLQ nobody watches is just a slower way to lose data." />

      <NetworkLink from={PRODUCER} to={QUEUE} color={C.server} />
      <NetworkLink from={QUEUE} to={CONSUMER} color={C.replicate} />
      <NetworkLink from={CONSUMER} to={DB} color={C.db} />
      <NetworkLink from={QUEUE} to={DLQ} color={C.error} dashed status={poison ? 'active' : 'idle'} label={poison ? 'after 3 failed receives' : 'redrive policy'} />
      <NetworkLink from={DLQ} to={ALARM} color={C.miss} dashed status={poison ? 'active' : 'idle'} />

      <PacketFlow waypoints={[PRODUCER, QUEUE]} color={C.write} max={6} />
      <PacketFlow waypoints={[QUEUE, CONSUMER, DB]} color={C.write} returnColor={C.response} turnAt={1} max={6} />
      {poison && (
        <>
          <PacketFlow key="retry" waypoints={[QUEUE, CONSUMER, QUEUE]} arc={1.4} color={C.error} max={3} size={0.16} speed={0.7} />
          <PacketFlow key="dead" waypoints={[QUEUE, DLQ]} color={C.error} max={1} size={0.18} speed={0.35} />
          <PacketFlow key="alarm" waypoints={[DLQ, ALARM]} color={C.miss} max={2} size={0.1} speed={0.6} />
        </>
      )}
    </group>
  );
}
