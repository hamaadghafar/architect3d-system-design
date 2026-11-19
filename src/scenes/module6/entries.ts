import { rps, type SceneEntry } from '../../types';
import { C } from '../../three/palette';
import { QueueScene } from './QueueScene';
import { KafkaScene } from './KafkaScene';
import { PubSubScene } from './PubSubScene';
import { DlqScene } from './DlqScene';

export const MODULE6_SCENES = {
  queue: {
    Component: QueueScene,
    legend: [{ color: C.write, label: 'Message' }, { color: C.miss, label: 'Redelivered' }, { color: C.error, label: 'Crashed worker' }],
    metrics: (s) => {
      const consumers = s.failure ? 2 : 3;
      const inRate = Math.round(s.trafficRate * 20);
      const outRate = consumers * 430;
      return [
        { label: 'Produce rate', value: `${inRate.toLocaleString()} msg/s` },
        { label: 'Consume capacity', value: `${outRate.toLocaleString()} msg/s (${consumers} workers)`, tone: 'info' },
        { label: 'Queue depth', value: inRate > outRate ? `growing +${(inRate - outRate).toLocaleString()}/s` : 'stable', tone: inRate > outRate ? 'bad' : 'good' },
        { label: 'Delivery', value: 'At-least-once', tone: 'warn' },
        { label: 'Producer latency', value: '~ms (decoupled)', tone: 'good' },
      ];
    },
    narrate: (s) =>
      s.failure
        ? 'Worker 2 crashed after receiving a message but before deleting it. When the visibility timeout expires the message reappears and another worker processes it — so handlers must be idempotent.'
        : s.trafficRate >= 65
          ? 'Producers are outpacing the workers: the queue absorbs the burst (the backlog grows) instead of the system falling over. Scale consumers on queue depth / age of oldest message.'
          : 'Producers enqueue and move on; a pool of competing workers pulls messages at their own pace. The queue decouples availability and throughput between the two sides.',
  },
  kafka: {
    Component: KafkaScene,
    legend: [{ color: '#38bdf8', label: 'Partition 0' }, { color: '#a78bfa', label: 'Partition 1' }, { color: '#34d399', label: 'Partition 2' }, { color: C.miss, label: 'Group B' }],
    metrics: (s) => [
      { label: 'Throughput', value: rps(s.trafficRate, 2000).replace('req', 'rec') },
      { label: 'Partitions', value: '3 (max 3 active consumers / group)', tone: 'info' },
      { label: 'Group A members', value: s.failure ? '2 (rebalanced)' : '3', tone: s.failure ? 'warn' : 'good' },
      { label: 'Ordering', value: 'Per partition (per key)', tone: 'info' },
      { label: 'Retention', value: '7 days · replayable', tone: 'good' },
    ],
    narrate: (s) =>
      s.failure
        ? 'Consumer A1 left the group (crash or long GC). The group coordinator triggers a rebalance and P1 is reassigned to A0, which resumes from P1’s last committed offset.'
        : 'Records with the same key land in the same partition, preserving their order. Each partition is consumed by one member of group A, while group B independently reads everything for analytics.',
  },
  pubsub: {
    Component: PubSubScene,
    legend: [{ color: C.write, label: 'Event' }, { color: C.replicate, label: 'Topic → queue' }, { color: C.error, label: 'Subscriber down' }],
    metrics: (s) => [
      { label: 'Events published', value: rps(s.trafficRate, 40).replace('req', 'evt') },
      { label: 'Fan-out', value: '× 3 subscriptions', tone: 'info' },
      { label: 'inventory', value: s.failure ? 'Down · queue buffering' : 'Healthy', tone: s.failure ? 'warn' : 'good' },
      { label: 'Other subscribers', value: 'Unaffected', tone: 'good' },
      { label: 'Publisher coupling', value: 'None', tone: 'good' },
    ],
    narrate: (s) =>
      s.failure
        ? 'inventory is down, but its queue keeps buffering events. Email and analytics carry on, and when inventory recovers it drains the backlog — no event lost, no publisher change.'
        : 'One OrderPlaced event is delivered to every subscriber. Topic → queue-per-subscriber isolates them: each scales, retries and fails independently.',
  },
  dlq: {
    Component: DlqScene,
    legend: [{ color: C.write, label: 'Message' }, { color: C.response, label: 'Processed' }, { color: C.error, label: 'Poison / retry' }, { color: C.miss, label: 'Alarm' }],
    metrics: (s) => [
      { label: 'Processed', value: rps(s.trafficRate, 10).replace('req', 'msg') },
      { label: 'Poison message', value: s.failure ? 'Retried 3× → DLQ' : 'None', tone: s.failure ? 'warn' : 'good' },
      { label: 'DLQ depth', value: s.failure ? '1' : '0', tone: s.failure ? 'bad' : 'good' },
      { label: 'Healthy traffic', value: 'Keeps flowing', tone: 'good' },
      { label: 'Next step', value: s.failure ? 'Investigate → redrive' : '—', tone: 'info' },
    ],
    narrate: (s) =>
      s.failure
        ? 'A poison message fails every time. After 3 receives the redrive policy moves it to the DLQ, the alarm pages someone, and all the healthy messages keep flowing behind it.'
        : 'Normal operation: messages flow through and are deleted after processing. Inject a poison message to see why every queue needs a dead-letter queue and an alarm.',
  },
} satisfies Record<string, SceneEntry>;
