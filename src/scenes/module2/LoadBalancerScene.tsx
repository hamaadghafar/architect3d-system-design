import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const CLIENTS: Vec3[] = [-4.8, -1.6, 1.6, 4.8].map((z) => [-13, Y, z] as Vec3);
const LB: Vec3 = [-4.5, Y, 0];
const BZ = [-8, -4.8, -1.6, 1.6, 4.8, 8];
const BACKENDS: Vec3[] = BZ.map((z) => [5.5, Y, z] as Vec3);
const POOLS = [
  { path: '/api/*', color: C.request, name: 'api-service', members: [0, 1] },
  { path: '/img/*', color: C.response, name: 'image-service', members: [2, 3] },
  { path: '/video/*', color: C.replicate, name: 'video-service', members: [4, 5] },
];
const FAILED_BACKEND = 1;

const poolOf = (b: number) => POOLS.findIndex((p) => p.members.includes(b));

export function LoadBalancerScene() {
  const failure = useSystemStore((s) => s.failure);
  const variant = useSystemStore((s) => s.variant);
  const l7 = variant === 'l7';

  /** Where each logical flow lands after health checks. */
  const target = (b: number) => {
    if (!(failure && b === FAILED_BACKEND)) return b;
    return l7 ? POOLS[poolOf(b)].members.find((m) => m !== b)! : 2;
  };

  return (
    <group>
      {l7 ? (
        POOLS.map((p) => (
          <CloudZoneBox key={p.name} position={[5.5, 1.3, (BZ[p.members[0]] + BZ[p.members[1]]) / 2]} size={[3.4, 2.4, 5.2]} color={p.color} label={`${p.path} → ${p.name}`} opacity={0.04} />
        ))
      ) : (
        <CloudZoneBox position={[5.5, 1.4, 0]} size={[3.6, 2.6, 18.6]} color={C.edge} label="Target group · TCP :443" sublabel="any healthy instance" opacity={0.04} />
      )}

      {CLIENTS.map((p, i) => (
        <ServerNode key={i} id={`lb-client-${i}`} kind="client" position={p} label={`Client ${i + 1}`} sublabel={`src 198.51.100.${10 + i}:5${i}812`} color={C.client} description="Clients connect to a single virtual IP / DNS name. They never see the backend fleet." />
      ))}
      <ServerNode
        id="lb-lb"
        kind="loadbalancer"
        position={LB}
        scale={1.3}
        label={l7 ? 'L7 · Application LB' : 'L4 · Network LB'}
        sublabel={l7 ? 'terminates TLS · reads HTTP' : 'hashes 5-tuple · TLS passthrough'}
        color={l7 ? C.hybrid : C.edge}
        description={
          l7
            ? 'Layer 7: terminates TLS, parses HTTP, and routes on host, path, headers or cookies. Enables canaries, retries, header rewriting and WAF — at the cost of more CPU and ~ms of latency.'
            : 'Layer 4: forwards TCP/UDP flows by hashing the 5-tuple (src IP, src port, dst IP, dst port, protocol). It never reads the payload, so it is extremely fast (µs) and protocol-agnostic, but cannot route by URL.'
        }
      />
      {BACKENDS.map((p, b) => {
        const pool = POOLS[poolOf(b)];
        return (
          <ServerNode
            key={b}
            id={`lb-be-${b}`}
            kind="server"
            position={p}
            scale={0.85}
            label={l7 ? `${pool.name}-${(b % 2) + 1}` : `instance-${b + 1}`}
            sublabel={failure && b === FAILED_BACKEND ? 'health check: 3× fail' : `10.0.${b}.21:8443`}
            color={l7 ? pool.color : C.server}
            status={failure && b === FAILED_BACKEND ? 'failed' : 'healthy'}
            description="A backend target. The load balancer health-checks it every few seconds; after N consecutive failures it is marked unhealthy and receives no new connections (existing ones drain)."
          />
        );
      })}

      {CLIENTS.map((p, i) => (
        <NetworkLink key={i} from={p} to={LB} color={C.edge} />
      ))}
      {BACKENDS.map((p, b) => {
        const pool = POOLS[poolOf(b)];
        const down = failure && b === FAILED_BACKEND;
        return (
          <NetworkLink
            key={b}
            from={LB}
            to={p}
            color={l7 ? pool.color : C.edge}
            status={down ? 'down' : 'active'}
            label={down ? 'unhealthy' : l7 && b % 2 === 0 ? pool.path : undefined}
          />
        );
      })}

      {BACKENDS.map((_, b) => {
        const dest = target(b);
        const c = b % CLIENTS.length;
        const color = l7 ? POOLS[poolOf(b)].color : C.request;
        return (
          <PacketFlow
            key={`${variant}-${b}-${dest}`}
            waypoints={[CLIENTS[c], LB, BACKENDS[dest], LB, CLIENTS[c]]}
            color={color}
            returnColor={l7 ? C.client : C.response}
            max={5}
            speed={l7 ? 0.95 : 1.25}
            seed={b}
          />
        );
      })}
    </group>
  );
}
