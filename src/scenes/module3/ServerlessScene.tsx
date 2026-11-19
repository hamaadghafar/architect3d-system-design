import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';
import { lambdaConcurrency, RESERVED_CONCURRENCY } from '../sceneLogic';

const Y = 0.65;
const CLIENT: Vec3 = [-14, Y, 0];
const APIGW: Vec3 = [-7, Y, 0];
const S3: Vec3 = [-7, Y, -6];
const SQS: Vec3 = [-7, Y, 6];
const SLOTS: Vec3[] = [-4.5, -1.5, 1.5, 4.5].flatMap((z) => [[1, Y, z] as Vec3, [5, Y, z] as Vec3]);
const DDB: Vec3 = [11, Y, 0];

export function ServerlessScene() {
  const warm = useSystemStore((s) => s.cacheHit);
  const failure = useSystemStore((s) => s.failure);
  const wanted = useSystemStore((s) => lambdaConcurrency(s.trafficRate));
  const running = failure ? Math.min(wanted, RESERVED_CONCURRENCY) : wanted;
  const throttled = wanted > running;

  return (
    <group>
      <CloudZoneBox position={[3, 1.6, 0]} size={[8, 3.2, 12.5]} color={C.miss} label="Lambda execution environments" sublabel="Firecracker micro-VMs · 1 request each" />
      <ServerNode id="sl-client" kind="client" position={CLIENT} label="Clients" color={C.client} description="HTTP callers. They never see servers — only an endpoint." />
      <ServerNode id="sl-gw" kind="gateway" position={APIGW} label="API Gateway" sublabel={throttled ? '429 throttling' : 'invoke sync'} status={throttled ? 'degraded' : 'healthy'} color={C.gateway} description="Triggers the function synchronously per request. If concurrency limits are hit, invocations are throttled (429 for sync callers; async events are retried)." />
      <ServerNode id="sl-s3" kind="storage" position={S3} label="S3 event" sublabel="ObjectCreated" color={C.dx} description="Asynchronous event source: an upload triggers a function (e.g. thumbnailing)." />
      <ServerNode id="sl-sqs" kind="storage" position={SQS} label="SQS queue" sublabel="batch of 10" color={C.replicate} description="Poll-based event source: Lambda polls the queue and invokes functions with batches, scaling pollers with queue depth." />
      {SLOTS.map((p, i) => {
        const active = i < running;
        return (
          <ServerNode
            key={i}
            id={`sl-fn-${i}`}
            kind="cache"
            position={p}
            scale={0.8}
            labelSize={17}
            showLabel={active || (failure && i < wanted)}
            label={active ? `fn instance ${i + 1}` : 'throttled slot'}
            sublabel={active ? (warm ? 'warm · reused' : 'cold start') : '429'}
            status={!active ? 'idle' : warm ? 'healthy' : 'degraded'}
            color={C.miss}
            description="Each execution environment handles one request at a time. New concurrency = new environment = a cold start (download code, start runtime, run init). Warm environments are reused for subsequent requests."
          />
        );
      })}
      <ServerNode id="sl-ddb" kind="database" position={DDB} label="DynamoDB" sublabel="on-demand capacity" color={C.db} description="Serverless-friendly datastore: HTTP API, no connection pools to exhaust, scales with request volume." />

      <NetworkLink from={CLIENT} to={APIGW} color={C.gateway} label={throttled ? '429 Too Many Requests' : undefined} status={throttled ? 'degraded' : 'active'} />
      <NetworkLink from={S3} to={SLOTS[0]} arc={0.6} color={C.dx} dashed />
      <NetworkLink from={SQS} to={SLOTS[7]} arc={0.6} color={C.replicate} dashed />
      {SLOTS.map((p, i) => (
        <NetworkLink key={i} from={APIGW} to={p} color={C.miss} width={1.1} status={i < running ? 'active' : 'idle'} />
      ))}
      {SLOTS.map((p, i) => (
        <NetworkLink key={`d${i}`} from={p} to={DDB} color={C.db} width={1} status={i < running ? 'active' : 'idle'} />
      ))}

      {SLOTS.slice(0, running).map((p, i) => (
        <PacketFlow key={`${i}-${warm}`} waypoints={[CLIENT, APIGW, p, DDB, p, APIGW, CLIENT]} turnAt={3} color={C.request} returnColor={C.response} speed={warm ? 1 : 0.55} max={4} seed={i} />
      ))}
      {throttled && <PacketFlow key="thr" waypoints={[CLIENT, APIGW, CLIENT]} color={C.request} returnColor={C.error} max={6} speed={1.2} />}
      <PacketFlow waypoints={[S3, SLOTS[0]]} arc={0.6} color={C.dx} max={2} size={0.1} speed={0.6} />
      <PacketFlow waypoints={[SQS, SLOTS[7 < running ? 7 : Math.max(0, running - 1)]]} arc={0.6} color={C.replicate} max={3} size={0.1} speed={0.6} />
    </group>
  );
}
