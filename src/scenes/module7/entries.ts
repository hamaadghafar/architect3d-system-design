import type { SceneEntry } from '../../types';
import { C } from '../../three/palette';
import { CircuitBreakerScene } from './CircuitBreakerScene';
import { TokenBucketScene } from './TokenBucketScene';
import { MultiRegionScene } from './MultiRegionScene';
import { BUCKET_CAPACITY, BUCKET_REFILL, bucketArrivalRate } from '../sceneLogic';

export const MODULE7_SCENES = {
  'circuit-breaker': {
    Component: CircuitBreakerScene,
    legend: [{ color: C.request, label: 'Call' }, { color: C.response, label: 'Success / fallback' }, { color: C.error, label: 'Timeout / failure' }, { color: C.miss, label: 'Half-open probe' }],
    metrics: (s) => {
      const br = s.variant === 'breaker';
      return [
        { label: 'Dependency B', value: s.failure ? 'Hanging' : 'Healthy', tone: s.failure ? 'bad' : 'good' },
        { label: 'Breaker state', value: !br ? 'n/a' : s.failure ? 'OPEN' : 'CLOSED', tone: !br ? 'info' : s.failure ? 'warn' : 'good' },
        { label: 'Checkout latency', value: s.failure ? (br ? '~5 ms (fallback)' : '30 s timeouts') : '~60 ms', tone: s.failure ? (br ? 'good' : 'bad') : 'good' },
        { label: 'Service A', value: s.failure && !br ? 'Thread pool exhausted' : 'Healthy', tone: s.failure && !br ? 'bad' : 'good' },
        { label: 'User impact', value: s.failure ? (br ? 'Generic recs shown' : 'Checkout down') : 'None', tone: s.failure ? (br ? 'warn' : 'bad') : 'good' },
      ];
    },
    narrate: (s) => {
      if (!s.failure) return 'Breaker CLOSED: calls flow normally while it counts errors and timeouts. Now make service B hang and compare having a breaker vs. not.';
      return s.variant === 'breaker'
        ? 'B is hanging. After the error threshold the breaker OPENS: calls fail fast to a fallback (popular items), so checkout stays fast. Every 30 s a single half-open probe checks whether B has recovered.'
        : 'No breaker: every call waits for B’s 30 s timeout. A’s threads pile up waiting, A stops answering its own users, and a non-critical dependency has taken down checkout.';
    },
  },
  'token-bucket': {
    Component: TokenBucketScene,
    spread: 1,
    legend: [{ color: C.request, label: 'Incoming request' }, { color: C.response, label: 'Allowed' }, { color: C.error, label: 'Rejected (429)' }, { color: '#fbbf24', label: 'Token' }],
    metrics: (s) => {
      const arrival = bucketArrivalRate(s.trafficRate, s.failure);
      const accepted = Math.min(arrival, BUCKET_REFILL);
      const rejectPct = arrival > 0 ? Math.round(100 * (1 - accepted / arrival)) : 0;
      return [
        { label: 'Arrival rate', value: `${arrival.toFixed(1)} req/s` },
        { label: 'Refill rate (sustained)', value: `${BUCKET_REFILL} tokens/s`, tone: 'info' },
        { label: 'Bucket capacity (burst)', value: `${BUCKET_CAPACITY} tokens`, tone: 'info' },
        { label: 'Long-run rejection', value: `~${rejectPct}%`, tone: rejectPct > 30 ? 'bad' : rejectPct > 0 ? 'warn' : 'good' },
        { label: 'Mode', value: s.failure ? 'Burst ×3' : 'Steady', tone: s.failure ? 'warn' : 'good' },
      ];
    },
    narrate: (s) => {
      const arrival = bucketArrivalRate(s.trafficRate, s.failure);
      if (arrival <= BUCKET_REFILL) return 'Arrivals are below the refill rate, so the bucket stays (nearly) full and every request gets a token. Raise the slider or trigger a burst.';
      return s.failure
        ? 'Burst! The bucket’s stored tokens absorb the first wave (that is what capacity is for), then it empties and the excess is rejected with 429 until tokens refill.'
        : 'Arrivals exceed the refill rate: the bucket drains and the limiter lets through ~4 req/s on average while rejecting the rest. Watch the live counters above the bucket.';
    },
  },
  'multi-region': {
    Component: MultiRegionScene,
    legend: [{ color: C.request, label: 'Request' }, { color: C.response, label: 'Response' }, { color: C.replicate, label: 'Cross-region replication' }, { color: C.error, label: 'Failed region' }],
    metrics: (s) => {
      const aa = s.variant === 'aa';
      return [
        { label: 'Topology', value: aa ? 'Active-active' : 'Active-passive', tone: 'info' },
        { label: 'Serving regions', value: s.failure ? '1 (eu-west-1)' : aa ? '2' : '1 (+standby)', tone: s.failure ? 'warn' : 'good' },
        { label: 'RTO', value: aa ? '~seconds–1 min (reroute)' : '~minutes (promote + scale)', tone: aa ? 'good' : 'warn' },
        { label: 'RPO', value: aa ? '≈0–seconds (conflicts possible)' : 'seconds (async lag)', tone: 'warn' },
        { label: 'Cost', value: aa ? '2× full capacity' : '~1.2–1.5×', tone: 'info' },
      ];
    },
    narrate: (s) => {
      const aa = s.variant === 'aa';
      if (s.failure)
        return aa
          ? 'us-east-1 is down. Health checks pull it from DNS and its users shift to eu-west-1, which was already serving live traffic — so failover is fast, provided it has capacity headroom.'
          : 'us-east-1 is down. The standby must be promoted (DB promotion + scaling the app fleet) before it can serve — minutes of downtime and a few seconds of unreplicated writes lost.';
      return aa
        ? 'Active-active: both regions serve their nearest users and replicate writes to each other. Lower latency and instant failover, but you must handle write conflicts and run 2× capacity.'
        : 'Active-passive: one region serves everything while the other receives replicated data and waits. Simpler data model and cheaper, but failover is slower and must be drilled.';
    },
  },
} satisfies Record<string, SceneEntry>;
