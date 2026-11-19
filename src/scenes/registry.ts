import type { LegendItem, SceneEntry, SceneId } from '../types';
import { C } from '../three/palette';
import { MODULE3_SCENES } from './module3/entries';
import { MODULE4_SCENES } from './module4/entries';
import { MODULE5_SCENES } from './module5/entries';
import { MODULE6_SCENES } from './module6/entries';
import { MODULE7_SCENES } from './module7/entries';
import { MODULE8_SCENES } from './module8/entries';
import { PublicCloudScene } from './module1/PublicCloudScene';
import { PrivateCloudScene } from './module1/PrivateCloudScene';
import { HybridCloudScene } from './module1/HybridCloudScene';
import { ConnectivityScene } from './module1/ConnectivityScene';
import { TransitGatewayScene } from './module1/TransitGatewayScene';
import { DnsScene } from './module2/DnsScene';
import { AnycastScene } from './module2/AnycastScene';
import { CdnScene } from './module2/CdnScene';
import { LoadBalancerScene } from './module2/LoadBalancerScene';
import { ApiGatewayScene } from './module2/ApiGatewayScene';
import { ANYCAST_CLIENTS, FAILED_POP, POPS, THROTTLE_AT, effectiveLink, greatCircleKm, nearestPop } from './sceneLogic';

const CLIENT_COUNT = ANYCAST_CLIENTS.length;


const rps = (rate: number, scale = 200) => `${Math.round(rate * scale).toLocaleString()} req/s`;
const REQ_RESP: LegendItem[] = [
  { color: C.request, label: 'Request' },
  { color: C.response, label: 'Response' },
];

const M12_SCENES = {
  'public-cloud': {
    Component: PublicCloudScene,
    legend: [...REQ_RESP, { color: C.replicate, label: 'DB replication' }, { color: C.error, label: 'Failed' }],
    metrics: (s) => [
      { label: 'Ingress', value: rps(s.trafficRate) },
      { label: 'Healthy AZs', value: s.failure ? '2 / 3' : '3 / 3', tone: s.failure ? 'warn' : 'good' },
      { label: 'DB writer', value: s.failure ? 'Standby promoted (AZ b)' : 'Primary (AZ a)', tone: s.failure ? 'warn' : 'good' },
      { label: 'RTO / RPO', value: s.failure ? '~60–120 s / 0 (sync)' : 'n/a', tone: 'info' },
      { label: 'Capacity', value: 'Elastic · ASG rebalances', tone: 'good' },
    ],
    narrate: (s) =>
      s.failure
        ? 'AZ-a lost power. ALB health checks pulled its targets within seconds; RDS Multi-AZ flipped its DNS endpoint to the synchronous standby in AZ-b, so no committed write was lost.'
        : 'Users → Internet → IGW → ALB (nodes in every AZ) → stateless EC2 → RDS primary. Every write is synchronously copied to a standby in another AZ.',
  },
  'private-cloud': {
    Component: PrivateCloudScene,
    legend: [...REQ_RESP, { color: C.write, label: 'DB traffic' }, { color: C.miss, label: 'VM restart (HA)' }],
    metrics: (s) => {
      const hosts = s.failure ? 2 : 3;
      const util = Math.min(100, Math.round((s.trafficRate * 0.95 * 3) / hosts));
      return [
        { label: 'Demand', value: rps(s.trafficRate) },
        { label: 'Cluster utilisation', value: `${util}%`, tone: util >= 80 ? 'bad' : util >= 65 ? 'warn' : 'good' },
        { label: 'Hosts online', value: `${hosts} / 3 (N+1)`, tone: s.failure ? 'warn' : 'good' },
        { label: 'New capacity lead time', value: '6–12 weeks', tone: 'warn' },
        { label: 'Marginal cost at steady load', value: 'Low (sunk capex)', tone: 'good' },
      ];
    },
    narrate: (s) =>
      s.failure
        ? 'Host 1 died. vSphere HA restarts its VMs on hosts 2–3 from shared storage (minutes of downtime for those VMs). The N+1 headroom is now gone — push the slider and the cluster saturates.'
        : s.trafficRate >= 75
          ? 'Demand exceeds the fixed capacity you bought. No API call can add servers — you queue, shed load, or wait weeks for hardware. This is the core private-cloud trade-off.'
          : 'Corporate users reach a single-tenant data centre over MPLS/SD-WAN. Compute is virtualised on owned hosts; VM disks live on shared storage so any host can run any VM.',
  },
  'hybrid-cloud': {
    Component: HybridCloudScene,
    legend: [
      { color: C.dx, label: 'Direct Connect' },
      { color: C.vpn, label: 'IPsec VPN' },
      { color: C.write, label: 'PII lookup (stays on-prem)' },
      { color: C.response, label: 'Response' },
    ],
    metrics: (s) => {
      const link = effectiveLink(s.linkMode, s.failure);
      return [
        { label: 'Active path', value: link === 'dx' ? 'Direct Connect 10 Gbps' : 'Site-to-Site VPN', tone: s.failure ? 'warn' : 'good' },
        { label: 'RTT on-prem ↔ cloud', value: link === 'dx' ? '~2–5 ms, stable' : '~20–60 ms, jittery', tone: link === 'dx' ? 'good' : 'warn' },
        { label: 'Bandwidth', value: link === 'dx' ? '1 / 10 / 100 Gbps' : '≤ 1.25 Gbps per tunnel', tone: 'info' },
        { label: 'Encryption', value: link === 'dx' ? 'None by default (add MACsec/IPsec)' : 'IPsec (AES-256)', tone: link === 'dx' ? 'warn' : 'good' },
        { label: 'Failover', value: s.failure ? 'BGP converged to backup' : 'Primary healthy', tone: s.failure ? 'warn' : 'good' },
      ];
    },
    narrate: (s) => {
      const link = effectiveLink(s.linkMode, s.failure);
      if (s.failure) return `The ${s.linkMode === 'dx' ? 'Direct Connect circuit' : 'VPN'} failed. BGP withdrew its routes and traffic re-converged onto the ${link === 'dx' ? 'Direct Connect' : 'IPsec VPN'} path — slower, but the hybrid estate stays connected.`;
      return 'Steady workloads and regulated PII stay on-prem; elastic burst compute and analytics run in AWS. Cloud workers call back on-prem for tokenised PII lookups, so raw data never leaves the country.';
    },
  },
  'vpn-dx': {
    Component: ConnectivityScene,
    legend: [
      { color: C.dx, label: 'Direct Connect' },
      { color: C.vpn, label: 'VPN tunnels' },
      { color: C.response, label: 'Response' },
      { color: C.error, label: 'Down' },
    ],
    metrics: (s) => {
      const onDx = s.linkMode === 'dx' && !s.failure;
      const tunnels = s.linkMode === 'vpn' ? (s.failure ? 1 : 2) : s.failure ? 2 : 0;
      return [
        { label: 'Carrying traffic', value: onDx ? 'DX private/transit VIF' : `${tunnels} IPsec tunnel${tunnels === 1 ? '' : 's'}`, tone: s.failure ? 'warn' : 'good' },
        { label: 'Throughput ceiling', value: onDx ? '10 Gbps (port)' : `~${(1.25 * tunnels).toFixed(2)} Gbps (ECMP)`, tone: 'info' },
        { label: 'Latency profile', value: onDx ? 'Deterministic' : 'Internet-dependent', tone: onDx ? 'good' : 'warn' },
        { label: 'BGP', value: s.failure ? 'Session down → routes withdrawn' : 'Established', tone: s.failure ? 'bad' : 'good' },
        { label: 'Time to provision', value: s.linkMode === 'dx' ? 'Weeks (circuit + cross-connect)' : 'Minutes', tone: 'info' },
      ];
    },
    narrate: (s) => {
      if (s.linkMode === 'vpn')
        return s.failure
          ? 'Tunnel 1 lost IPsec Dead Peer Detection. Its BGP session dropped and all flows hashed onto Tunnel 2 — which is why AWS always gives you two tunnels in two AZs.'
          : 'Two IPsec tunnels to endpoints in different AZs, both active with ECMP via Transit Gateway. Encrypted and quick to set up, but riding the public Internet.';
      return s.failure
        ? 'The DX cross-connect went dark. BFD detected it in under a second, BGP withdrew the DX routes, and the less-preferred VPN routes took over. Plan VPN capacity for this moment.'
        : 'Traffic runs over a dedicated fibre circuit → AWS DX router → DX Gateway → Transit Gateway. The VPN tunnels stay up as a hot standby with less-preferred BGP routes.';
    },
  },
  'transit-gateway': {
    Component: TransitGatewayScene,
    legend: [
      { color: C.public, label: 'VPC peering' },
      { color: C.vpn, label: 'Per-VPC VPN' },
      { color: C.hybrid, label: 'TGW attachment' },
      { color: C.response, label: 'Response' },
    ],
    metrics: (s) => {
      const tgw = s.variant === 'tgw';
      return [
        { label: 'Connections to manage', value: tgw ? '6 attachments' : '10 peerings + 5 VPNs', tone: tgw ? 'good' : 'bad' },
        { label: 'Transitive routing', value: tgw ? 'Yes (route tables)' : 'No', tone: tgw ? 'good' : 'warn' },
        { label: 'Dev → Shared Services', value: s.failure ? (tgw ? 'OK (other AZ ENI)' : 'UNREACHABLE') : 'OK', tone: s.failure ? (tgw ? 'warn' : 'bad') : 'good' },
        { label: 'Extra hop latency', value: tgw ? '+ small (TGW hop)' : 'None (direct)', tone: 'info' },
        { label: 'Pricing model', value: tgw ? 'Per attachment-hour + per GB' : 'Data transfer only', tone: 'info' },
      ];
    },
    narrate: (s) => {
      const tgw = s.variant === 'tgw';
      if (tgw)
        return s.failure
          ? 'One AZ of the Shared Services attachment failed. TGW attachments have an ENI per AZ, so traffic continues through AZ-b. Segmentation (e.g. Dev ↛ Prod Data) is enforced centrally with route tables.'
          : 'Hub-and-spoke: every VPC and the on-prem connection attach once to the Transit Gateway. N attachments instead of N(N−1)/2 peerings, with central route tables for segmentation.';
      return s.failure
        ? 'The Dev ↔ Shared Services peering was deleted. Dev cannot route through Prod App even though both peer with it: VPC peering is strictly non-transitive.'
        : 'Full mesh: 6 networks need 15 point-to-point connections. Fast and cheap per GB, but the operational load grows quadratically and nothing is transitive.';
    },
  },
  dns: {
    Component: DnsScene,
    legend: [
      { color: C.miss, label: 'Iterative query' },
      { color: C.request, label: 'Cached query' },
      { color: C.response, label: 'Answer' },
      { color: C.server, label: 'App traffic' },
    ],
    metrics: (s) => [
      { label: 'Resolver cache', value: s.cacheHit ? 'HIT' : 'MISS', tone: s.cacheHit ? 'good' : 'warn' },
      { label: 'Lookup latency', value: s.cacheHit ? '~1–20 ms' : s.failure ? '~100–200 ms + timeout' : '~50–150 ms', tone: s.cacheHit ? 'good' : s.failure ? 'bad' : 'warn' },
      { label: 'Round trips (resolver)', value: s.cacheHit ? '0' : '3 (root, TLD, auth)', tone: 'info' },
      { label: 'Record TTL', value: '300 s', tone: 'info' },
      { label: 'Authoritative NS', value: s.failure ? 'ns1 down → ns2 answering' : 'ns1 + ns2 healthy', tone: s.failure ? 'warn' : 'good' },
    ],
    narrate: (s) =>
      s.cacheHit
        ? 'The resolver already holds api.example.com for the remainder of its TTL, so it answers instantly. Most DNS lookups on the Internet are served this way.'
        : s.failure
          ? 'Cache miss and ns1 is unresponsive. The resolver times out on ns1 and retries ns2 — this is why you run authoritative DNS on more than one network or provider.'
          : 'Cache miss: the resolver asks a root server (→ referral to .com), the .com TLD (→ referral to ns1/ns2.example.com) and finally the authoritative server for the A record, then caches each step.',
  },
  anycast: {
    Component: AnycastScene,
    spread: 1,
    legend: [
      { color: C.request, label: 'Client → PoP' },
      { color: C.response, label: 'Response' },
      { color: C.miss, label: 'Rerouted by BGP' },
      { color: C.error, label: 'Withdrawn PoP' },
    ],
    metrics: (s) => {
      const unicast = s.variant === 'unicast';
      let total = 0;
      for (let i = 0; i < CLIENT_COUNT; i++) {
        const pop = unicast ? 0 : nearestPop(i, s.failure ? FAILED_POP : null);
        total += greatCircleKm(i, pop);
      }
      const avgKm = total / CLIENT_COUNT;
      // ~1 ms RTT per 100 km of fibre (light in glass ≈ 200 km/ms, round trip) plus routing inefficiency
      const rtt = Math.round(avgKm / 100 + 5);
      return [
        { label: 'Addressing', value: unicast ? 'Unicast · 1 origin' : 'Anycast · 1.1.1.0/24 ×6', tone: 'info' },
        { label: 'Avg client→server distance', value: `${Math.round(avgKm).toLocaleString()} km`, tone: avgKm > 6000 ? 'bad' : avgKm > 3000 ? 'warn' : 'good' },
        { label: 'Est. avg RTT', value: `~${rtt} ms`, tone: rtt > 70 ? 'bad' : rtt > 40 ? 'warn' : 'good' },
        { label: 'Live PoPs', value: unicast ? '1' : s.failure ? `${POPS.length - 1} / ${POPS.length}` : `${POPS.length} / ${POPS.length}`, tone: s.failure && !unicast ? 'warn' : 'good' },
        { label: 'DDoS absorption', value: unicast ? 'Single site absorbs all' : 'Spread across PoPs', tone: unicast ? 'bad' : 'good' },
      ];
    },
    narrate: (s) => {
      if (s.variant === 'unicast') return 'Unicast: one IP lives in one place (Ashburn). Every user worldwide crosses oceans for every round trip, and a DDoS lands on a single site.';
      return s.failure
        ? 'Frankfurt withdrew its BGP announcement (maintenance or overload). Within seconds, London and Lagos are routed to the next-best PoP — no DNS change, no client change, same IP.'
        : 'Six PoPs announce the same prefix. BGP delivers each user to a topologically nearby PoP, cutting latency and naturally spreading load (and attacks) across the network.';
    },
  },
  cdn: {
    Component: CdnScene,
    legend: [
      { color: C.request, label: 'Request (hit)' },
      { color: C.miss, label: 'Request (miss)' },
      { color: C.response, label: 'Response' },
      { color: C.stale, label: 'Stale response' },
    ],
    metrics: (s) => [
      { label: 'Edge result', value: s.cacheHit ? 'HIT' : s.failure ? 'MISS → stale-if-error' : 'MISS → origin', tone: s.cacheHit ? 'good' : s.failure ? 'warn' : 'warn' },
      { label: 'TTFB (p50)', value: s.cacheHit ? '~15–30 ms' : s.failure ? '~60 ms (stale)' : '~150–300 ms', tone: s.cacheHit ? 'good' : 'warn' },
      { label: 'Origin load', value: s.cacheHit ? rps(s.trafficRate, 6) : s.failure ? '0 (origin down)' : rps(s.trafficRate, 200), tone: s.cacheHit ? 'good' : s.failure ? 'bad' : 'warn' },
      { label: 'Offload', value: s.cacheHit ? '~97%' : '0% (cold / purged)', tone: s.cacheHit ? 'good' : 'bad' },
      { label: 'Origin', value: s.failure ? 'DOWN' : 'Healthy', tone: s.failure ? 'bad' : 'good' },
    ],
    narrate: (s) =>
      s.cacheHit
        ? s.failure
          ? 'Origin is down, but objects are still fresh in edge caches: users notice nothing. A trickle of long-tail misses would fail unless stale-if-error is configured.'
          : 'Hits are served from the PoP near the user. Only rare long-tail misses travel to the shield and origin — the origin sees a tiny fraction of total traffic.'
        : s.failure
          ? 'Cold cache and dead origin: the shield serves its last stale copy (stale-if-error), keeping the site up in degraded mode instead of returning 5xx.'
          : 'Cache miss (cold, expired or purged): edge → origin shield → origin → back, filling both cache tiers. The shield collapses concurrent misses into one origin fetch.',
  },
  'load-balancer': {
    Component: LoadBalancerScene,
    legend: [
      { color: C.request, label: '/api or L4 flow' },
      { color: C.response, label: '/img' },
      { color: C.replicate, label: '/video' },
      { color: C.error, label: 'Unhealthy target' },
    ],
    metrics: (s) => {
      const l7 = s.variant === 'l7';
      return [
        { label: 'Routing key', value: l7 ? 'Host / path / headers' : '5-tuple hash', tone: 'info' },
        { label: 'TLS', value: l7 ? 'Terminated at LB' : 'Passthrough to target', tone: 'info' },
        { label: 'Added latency', value: l7 ? '~1–5 ms' : '~tens of µs', tone: l7 ? 'warn' : 'good' },
        { label: 'Healthy targets', value: s.failure ? '5 / 6' : '6 / 6', tone: s.failure ? 'warn' : 'good' },
        { label: 'Throughput', value: rps(s.trafficRate, l7 ? 400 : 4000), tone: 'info' },
      ];
    },
    narrate: (s) => {
      const l7 = s.variant === 'l7';
      if (s.failure)
        return l7
          ? 'api-service-2 failed its health checks. The ALB keeps routing /api/* to the remaining api target — the other pools are unaffected.'
          : 'instance-2 failed its health checks. New flows that hashed to it are rehashed to healthy targets; existing TCP connections to it are reset.';
      return l7
        ? 'The ALB terminates TLS, reads each HTTP request and routes it by path to a dedicated target group — enabling per-service scaling, canaries and WAF rules.'
        : 'The NLB never decrypts traffic: it hashes each flow’s 5-tuple to a target and forwards packets. Every packet of a connection lands on the same backend.';
    },
  },
  'api-gateway': {
    Component: ApiGatewayScene,
    legend: [
      { color: C.request, label: 'Request' },
      { color: C.response, label: '2xx' },
      { color: C.error, label: '429 / 503' },
      { color: C.security, label: 'Auth check' },
    ],
    metrics: (s) => [
      { label: 'Ingress', value: rps(s.trafficRate, 120) },
      { label: 'Partner quota', value: s.trafficRate >= THROTTLE_AT ? 'Exceeded → 429s' : 'Within quota', tone: s.trafficRate >= THROTTLE_AT ? 'bad' : 'good' },
      { label: 'GET /users/me', value: s.cacheHit ? 'Gateway cache HIT' : 'Proxied to users-svc', tone: s.cacheHit ? 'good' : 'info' },
      { label: 'orders-svc', value: s.failure ? 'Circuit OPEN · fast 503' : 'Healthy', tone: s.failure ? 'bad' : 'good' },
      { label: 'Gateway overhead', value: '~1–10 ms', tone: 'info' },
    ],
    narrate: (s) => {
      const parts: string[] = [];
      if (s.failure) parts.push('orders-svc is down: the gateway’s circuit breaker trips and returns a fast 503 instead of piling up timeouts.');
      if (s.trafficRate >= THROTTLE_AT) parts.push('The partner exceeded its token-bucket quota, so excess requests get 429 with a Retry-After header.');
      if (s.cacheHit) parts.push('GET /users/me is served from the gateway response cache.');
      return parts.length
        ? parts.join(' ')
        : 'Every request passes one hardened front door: TLS, JWT verification, rate limiting and routing happen once at the gateway, not in every service.';
    },
  },
} satisfies Partial<Record<SceneId, SceneEntry>>;

export const SCENES: Record<SceneId, SceneEntry> = {
  ...M12_SCENES,
  ...MODULE3_SCENES,
  ...MODULE4_SCENES,
  ...MODULE5_SCENES,
  ...MODULE6_SCENES,
  ...MODULE7_SCENES,
  ...MODULE8_SCENES,
};
