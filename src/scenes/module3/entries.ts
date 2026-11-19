import { rps, type SceneEntry } from '../../types';
import { C } from '../../three/palette';
import { ScalingScene } from './ScalingScene';
import { AsgScene } from './AsgScene';
import { KubernetesScene } from './KubernetesScene';
import { ServerlessScene } from './ServerlessScene';
import { asgCpu, asgDesired, horizontalCount, k8sReplicas, lambdaConcurrency, RESERVED_CONCURRENCY, VERTICAL_SIZES, verticalTier } from '../sceneLogic';

const REQ = [
  { color: C.request, label: 'Request' },
  { color: C.response, label: 'Response' },
];

export const MODULE3_SCENES = {
  scaling: {
    Component: ScalingScene,
    legend: [...REQ, { color: C.miss, label: 'Slow (saturated)' }, { color: C.error, label: 'Failed' }],
    metrics: (s) => {
      if (s.variant === 'vertical') {
        const size = VERTICAL_SIZES[verticalTier(s.trafficRate)];
        return [
          { label: 'Demand', value: rps(s.trafficRate) },
          { label: 'Instance', value: `${size.name} (${size.vcpu} vCPU)`, tone: 'info' },
          { label: 'Headroom', value: s.trafficRate >= 90 ? 'At ceiling' : 'OK', tone: s.trafficRate >= 90 ? 'bad' : 'good' },
          { label: 'Resize downtime', value: 'Restart / failover', tone: 'warn' },
          { label: 'Failure blast radius', value: '100% of capacity', tone: 'bad' },
        ];
      }
      const n = horizontalCount(s.trafficRate);
      return [
        { label: 'Demand', value: rps(s.trafficRate) },
        { label: 'Nodes', value: `${s.failure ? n - 1 : n} healthy / ${n}`, tone: s.failure ? 'warn' : 'good' },
        { label: 'Headroom', value: 'Add nodes (no ceiling)', tone: 'good' },
        { label: 'Resize downtime', value: 'None', tone: 'good' },
        { label: 'Failure blast radius', value: `${Math.round(100 / n)}% of capacity`, tone: 'good' },
      ];
    },
    narrate: (s) =>
      s.variant === 'vertical'
        ? s.failure
          ? 'The one big machine failed: 100% outage. Vertical scaling keeps a single point of failure no matter how large the box is.'
          : 'As traffic grows the machine is replaced with bigger instance types. Easy at first, but each step needs a restart, costs grow super-linearly, and past the largest instance there is nowhere to go.'
        : s.failure
          ? 'node-1 died; the load balancer routes around it and the pool loses only a fraction of capacity.'
          : 'Traffic grows → add identical nodes behind the load balancer. Requires stateless services, but gives near-linear scale and fault tolerance.',
  },
  asg: {
    Component: AsgScene,
    legend: [...REQ, { color: C.miss, label: 'Metrics / alarm' }, { color: C.gateway, label: 'Launch / replace' }],
    metrics: (s) => {
      const d = asgDesired(s.trafficRate);
      const cpu = asgCpu(s.trafficRate);
      return [
        { label: 'Demand', value: rps(s.trafficRate) },
        { label: 'Desired / max', value: `${d} / 6`, tone: d === 6 ? 'warn' : 'info' },
        { label: 'Avg CPU (target 50%)', value: `${cpu}%`, tone: cpu > 65 ? 'bad' : cpu > 55 ? 'warn' : 'good' },
        { label: 'Instance warm-up', value: '~60–180 s', tone: 'info' },
        { label: 'Health', value: s.failure ? '1 unhealthy → replacing' : 'All healthy', tone: s.failure ? 'warn' : 'good' },
      ];
    },
    narrate: (s) =>
      s.failure
        ? 'i-01a failed its ELB health check. The ASG terminates it and launches a replacement to get back to desired capacity — self-healing without a human.'
        : 'Move the traffic slider: CloudWatch sees average CPU drift from 50%, the target-tracking policy changes desired capacity, and the ASG launches or terminates instances (never below min 2 or above max 6).',
  },
  kubernetes: {
    Component: KubernetesScene,
    legend: [...REQ, { color: C.db, label: 'etcd writes' }, { color: C.gateway, label: 'Reconcile loop' }],
    metrics: (s) => {
      const r = k8sReplicas(s.trafficRate);
      const cap = s.failure ? 6 : 9;
      return [
        { label: 'HPA desired replicas', value: String(r), tone: 'info' },
        { label: 'Running pods', value: `${Math.min(r, cap)}`, tone: 'good' },
        { label: 'Pending (no capacity)', value: String(Math.max(0, r - cap)), tone: r > cap ? 'bad' : 'good' },
        { label: 'Ready nodes', value: s.failure ? '2 / 3' : '3 / 3', tone: s.failure ? 'warn' : 'good' },
        { label: 'Pod start time', value: '~seconds', tone: 'info' },
      ];
    },
    narrate: (s) =>
      s.failure
        ? 'worker-node-1 stopped heart-beating. After the eviction timeout its pods are recreated on the remaining nodes. If they run out of room, pods sit Pending until the Cluster Autoscaler adds a node.'
        : 'You declare “run N replicas of web”; controllers continuously reconcile reality toward that desired state. The HPA raises N with load and the scheduler spreads pods across nodes.',
  },
  serverless: {
    Component: ServerlessScene,
    legend: [...REQ, { color: C.dx, label: 'S3 event' }, { color: C.error, label: 'Throttled (429)' }],
    metrics: (s) => {
      const want = lambdaConcurrency(s.trafficRate);
      const run = s.failure ? Math.min(want, RESERVED_CONCURRENCY) : want;
      return [
        { label: 'Concurrent executions', value: `${run}`, tone: 'info' },
        { label: 'Throttled', value: want > run ? `${want - run} slots` : 'none', tone: want > run ? 'bad' : 'good' },
        { label: 'Start type', value: s.cacheHit ? 'Warm (~ms)' : 'Cold (100 ms–s)', tone: s.cacheHit ? 'good' : 'warn' },
        { label: 'Idle cost', value: '$0 (scale to zero)', tone: 'good' },
        { label: 'Max duration', value: '15 min', tone: 'info' },
      ];
    },
    narrate: (s) => {
      if (s.failure) return `Reserved concurrency caps this function at ${RESERVED_CONCURRENCY}. Extra requests are throttled with 429 instead of overwhelming the database — a deliberate safety valve.`;
      return s.cacheHit
        ? 'Each concurrent request gets its own execution environment. Warm environments are reused, so most invocations start in milliseconds and you pay only for compute time used.'
        : 'Cold starts: new environments must download code, start the runtime and run init code before handling the request — visible as slower packets. Provisioned concurrency or SnapStart keep environments warm.';
    },
  },
} satisfies Record<string, SceneEntry>;
