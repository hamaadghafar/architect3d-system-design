import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';
import { THROTTLE_AT } from '../sceneLogic';

const Y = 0.65;
const CLIENTS: Vec3[] = [-4.5, 0, 4.5].map((z) => [-14, Y, z] as Vec3);
const CLIENT_NAMES = ['Web SPA', 'Mobile app', 'Partner API'];
const GW: Vec3 = [-5.5, Y, 0];
const AUTH: Vec3 = [-5.5, Y, -5.5];
const RL: Vec3 = [-5.5, Y, 5.5];
const SVC_Z = [-5, 0, 5];
const SVC: Vec3[] = SVC_Z.map((z) => [3, Y, z] as Vec3);
const DBS: Vec3[] = SVC_Z.map((z) => [9, Y, z] as Vec3);
const SVC_NAMES = ['users-svc', 'orders-svc', 'payments-svc'];
const ROUTES = ['GET /v1/users/me', 'POST /v1/orders', 'POST /v1/charges'];

export function ApiGatewayScene() {
  const failure = useSystemStore((s) => s.failure);
  const cacheHit = useSystemStore((s) => s.cacheHit);
  const throttled = useSystemStore((s) => s.trafficRate >= THROTTLE_AT);

  return (
    <group>
      <CloudZoneBox position={[-5.5, 1.6, 0]} size={[4, 3.2, 15]} color={C.gateway} label="Edge / DMZ" sublabel="single public entry point" />
      <CloudZoneBox position={[6, 1.6, 0]} size={[10, 3.2, 15]} color={C.public} label="Private subnets" sublabel="microservices · not Internet-reachable" />

      {CLIENTS.map((p, i) => (
        <ServerNode key={i} id={`gw-client-${i}`} kind="client" position={p} label={CLIENT_NAMES[i]} sublabel={ROUTES[i]} color={C.client} description="Different clients with different needs (payload shape, auth method, quota). The gateway gives them one stable, versioned API surface." />
      ))}
      <ServerNode
        id="gw-gw"
        kind="gateway"
        position={GW}
        scale={1.4}
        label="API Gateway / Reverse proxy"
        sublabel="TLS · authN · rate limit · route"
        color={C.gateway}
        description="A reverse proxy that is API-aware: TLS termination, JWT/OAuth validation, per-key rate limiting & quotas, request routing, response caching, request/response transformation, and observability — all before a request touches a service."
      />
      <ServerNode id="gw-auth" kind="vpn" position={AUTH} label="Identity provider" sublabel="JWKS · OAuth2 / OIDC" color={C.security} description="The gateway validates JWT signatures locally against cached JWKS keys (no network hop per request) and only calls the IdP for token introspection or key rotation." />
      <ServerNode id="gw-rl" kind="cache" position={RL} label="Rate-limit store" sublabel="Redis · token buckets" status={throttled ? 'degraded' : 'healthy'} color={C.cache} description="Shared counters (token bucket / sliding window) keyed by API key or user. Shared state lets limits hold across many gateway nodes." />
      {SVC.map((p, i) => (
        <ServerNode key={i} id={`gw-svc-${i}`} kind="server" position={p} label={SVC_NAMES[i]} sublabel={i === 1 && failure ? 'circuit OPEN' : 'k8s · 6 pods'} status={i === 1 && failure ? 'failed' : 'healthy'} color={C.server} description="Internal microservices behind the gateway. They trust the identity headers the gateway injects and focus on business logic." />
      ))}
      {DBS.map((p, i) => (
        <ServerNode key={i} id={`gw-db-${i}`} kind="database" position={p} scale={0.85} label={['users DB', 'orders DB', 'ledger DB'][i]} color={C.db} description="Each service owns its data store; nothing outside the service talks to it directly." />
      ))}

      {CLIENTS.map((p, i) => (
        <NetworkLink key={i} from={p} to={GW} color={C.gateway} label={i === 2 && throttled ? '429 Too Many Requests' : undefined} status={i === 2 && throttled ? 'degraded' : 'active'} />
      ))}
      <NetworkLink from={GW} to={AUTH} color={C.security} dashed label="verify JWT" />
      <NetworkLink from={GW} to={RL} color={C.cache} dashed label="INCR bucket" />
      {SVC.map((p, i) => (
        <NetworkLink key={i} from={GW} to={p} color={C.server} status={i === 1 && failure ? 'down' : i === 0 && cacheHit ? 'backup' : 'active'} label={i === 1 && failure ? 'fast-fail 503' : undefined} />
      ))}
      {SVC.map((p, i) => (
        <NetworkLink key={`d${i}`} from={p} to={DBS[i]} color={C.db} status={i === 1 && failure ? 'idle' : 'active'} />
      ))}

      {/* Web: cached at the gateway or full round trip */}
      {cacheHit ? (
        <PacketFlow key="web-hit" waypoints={[CLIENTS[0], GW, CLIENTS[0]]} color={C.request} returnColor={C.response} max={6} speed={1.2} />
      ) : (
        <PacketFlow key="web-miss" waypoints={[CLIENTS[0], GW, SVC[0], DBS[0], SVC[0], GW, CLIENTS[0]]} turnAt={3} color={C.request} returnColor={C.response} max={6} />
      )}
      {/* Mobile → orders: circuit breaker fails fast when the service is down */}
      {failure ? (
        <PacketFlow key="mob-fail" waypoints={[CLIENTS[1], GW, CLIENTS[1]]} color={C.request} returnColor={C.error} max={6} />
      ) : (
        <PacketFlow key="mob-ok" waypoints={[CLIENTS[1], GW, SVC[1], DBS[1], SVC[1], GW, CLIENTS[1]]} turnAt={3} color={C.request} returnColor={C.response} max={6} seed={2} />
      )}
      {/* Partner → payments, with throttling above quota */}
      <PacketFlow waypoints={[CLIENTS[2], GW, SVC[2], DBS[2], SVC[2], GW, CLIENTS[2]]} turnAt={3} color={C.write} returnColor={C.response} max={throttled ? 3 : 6} seed={4} />
      {throttled && <PacketFlow key="429" waypoints={[CLIENTS[2], GW, CLIENTS[2]]} color={C.write} returnColor={C.error} max={7} speed={1.3} seed={5} />}

      <PacketFlow waypoints={[GW, AUTH, GW]} color={C.security} max={3} size={0.09} speed={0.7} />
      <PacketFlow waypoints={[GW, RL, GW]} color={C.cache} max={throttled ? 6 : 3} size={0.09} speed={0.9} />
    </group>
  );
}
