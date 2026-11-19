import { rps, type SceneEntry } from '../../types';
import { C } from '../../three/palette';
import { SqlNoSqlScene } from './SqlNoSqlScene';
import { ReadReplicasScene } from './ReadReplicasScene';
import { HashRingScene } from './HashRingScene';
import { CapScene } from './CapScene';
import { StorageScene } from './StorageScene';
import { RING_KEYS, ringMovedKeys } from '../sceneLogic';

const REQ = [
  { color: C.request, label: 'Request' },
  { color: C.response, label: 'Response' },
];

export const MODULE4_SCENES = {
  'sql-nosql': {
    Component: SqlNoSqlScene,
    legend: [...REQ, { color: C.replicate, label: 'Replication' }, { color: C.miss, label: 'Foreign key' }],
    metrics: (s) =>
      s.variant === 'sql'
        ? [
            { label: 'Data model', value: 'Tables + JOINs', tone: 'info' },
            { label: 'Transactions', value: 'Multi-row ACID', tone: 'good' },
            { label: 'Write scaling', value: 'Single primary', tone: 'warn' },
            { label: 'Writer', value: s.failure ? 'Standby promoted' : 'Primary', tone: s.failure ? 'warn' : 'good' },
            { label: 'Load', value: rps(s.trafficRate, 60) },
          ]
        : [
            { label: 'Data model', value: 'Items by partition key', tone: 'info' },
            { label: 'Transactions', value: 'Per item (limited multi)', tone: 'warn' },
            { label: 'Write scaling', value: 'Add partitions', tone: 'good' },
            { label: 'Partition 1', value: s.failure ? 'Leader re-elected' : 'Healthy', tone: s.failure ? 'warn' : 'good' },
            { label: 'Load', value: rps(s.trafficRate, 600) },
          ],
    narrate: (s) =>
      s.variant === 'sql'
        ? s.failure
          ? 'The primary failed; the synchronous standby is promoted. Writes pause during failover, but no committed transaction is lost.'
          : 'A relational database stores normalised tables and joins them at query time; transactions keep multi-table updates atomic. Flexible queries — but one primary handles all writes.'
        : s.failure
          ? 'Partition 1’s leader failed. Its replicas elect a new leader and only that key range sees a brief blip — the other partitions are unaffected.'
          : 'A key-value / wide-column store hashes the partition key to pick a partition, each replicated across nodes. Writes scale horizontally, but you must design tables around your access patterns.',
  },
  'read-replicas': {
    Component: ReadReplicasScene,
    legend: [{ color: C.write, label: 'Write' }, { color: C.request, label: 'Read' }, { color: C.response, label: 'Response' }, { color: C.replicate, label: 'Replication' }],
    metrics: (s) => [
      { label: 'Reads served by replicas', value: s.failure ? '2 replicas' : '3 replicas', tone: 'good' },
      { label: 'Replication lag', value: s.trafficRate >= 75 ? '~2–5 s' : '~20 ms', tone: s.trafficRate >= 75 ? 'bad' : 'good' },
      { label: 'Write capacity', value: '1 node (unchanged)', tone: 'warn' },
      { label: 'Writer', value: s.failure ? 'Replica 1 promoted' : 'Primary', tone: s.failure ? 'warn' : 'good' },
      { label: 'Read load', value: rps(s.trafficRate, 150) },
    ],
    narrate: (s) =>
      s.failure
        ? 'The primary failed. Replica 1 is promoted to primary; the remaining replicas re-point to it. Any writes not yet replicated to Replica 1 are lost (async replication).'
        : s.trafficRate >= 75
          ? 'Under heavy write load replicas fall behind. A user who just updated their profile may read the old value from a replica — route read-your-writes to the primary.'
          : 'Writes go to the primary; reads fan out to replicas through a reader endpoint. Great for read-heavy workloads (10:1 or more), but it does not scale writes.',
  },
  'hash-ring': {
    Component: HashRingScene,
    spread: 1,
    legend: [{ color: '#38bdf8', label: 'Key → owner (colour = shard)' }, { color: C.miss, label: 'Key that moved' }, { color: C.error, label: 'Removed shard' }],
    metrics: (s) => {
      const moved = s.failure ? ringMovedKeys(s.variant) : 0;
      return [
        { label: 'Scheme', value: s.variant === 'ring' ? 'Consistent hashing' : 'hash mod N', tone: 'info' },
        { label: 'Shards', value: s.failure ? '4 (C removed)' : '5', tone: s.failure ? 'warn' : 'good' },
        { label: 'Keys remapped', value: `${moved} / ${RING_KEYS.length}`, tone: moved > 4 ? 'bad' : moved > 0 ? 'warn' : 'good' },
        { label: 'Expected remap', value: s.variant === 'ring' ? '~1/N of keys' : '~(N−1)/N of keys', tone: s.variant === 'ring' ? 'good' : 'bad' },
        { label: 'Cache impact', value: s.variant === 'ring' ? 'Local' : 'Near-total miss storm', tone: s.variant === 'ring' ? 'good' : 'bad' },
      ];
    },
    narrate: (s) => {
      if (!s.failure)
        return s.variant === 'ring'
          ? 'Nodes and keys are hashed onto the same ring. Each key walks clockwise to the next node. Toggle the failure to remove shard C and watch which keys move.'
          : 'With hash(key) mod N, ownership depends on N. Remove one shard and nearly every key changes owner.';
      return s.variant === 'ring'
        ? 'Shard C left the ring: only the keys it owned move to its clockwise neighbour (amber). Every other key stays put — that is the whole point of consistent hashing.'
        : 'N changed from 5 to 4, so most keys now map to a different shard (amber) — a cache would see a mass miss storm and a database a huge rebalance.';
    },
  },
  cap: {
    Component: CapScene,
    legend: [{ color: C.write, label: 'Write' }, { color: C.response, label: 'Committed' }, { color: C.error, label: 'Rejected (CP)' }, { color: C.miss, label: 'Divergent (AP)' }],
    metrics: (s) => {
      const cp = s.variant === 'cp';
      return [
        { label: 'Mode', value: cp ? 'CP (consistency first)' : 'AP (availability first)', tone: 'info' },
        { label: 'Network', value: s.failure ? 'PARTITIONED' : 'Connected', tone: s.failure ? 'bad' : 'good' },
        { label: 'Region B writes', value: s.failure ? (cp ? 'Rejected' : 'Accepted locally') : 'OK', tone: s.failure ? (cp ? 'bad' : 'warn') : 'good' },
        { label: 'Reads may be stale', value: !cp && s.failure ? 'Yes' : 'No', tone: !cp && s.failure ? 'warn' : 'good' },
        { label: 'After heal', value: cp ? 'Nothing to reconcile' : 'Resolve conflicts (LWW/CRDT)', tone: cp ? 'good' : 'warn' },
      ];
    },
    narrate: (s) => {
      if (!s.failure) return 'With the network healthy, every write is replicated and you get both consistency and availability. CAP only forces a choice when a partition happens — so cut the link.';
      return s.variant === 'cp'
        ? 'Partition! Region B cannot reach a quorum, so it refuses writes (errors) to avoid split-brain. Region A keeps working with its 2-of-3 majority. Consistent, but B is unavailable.'
        : 'Partition! Both sides keep accepting writes. Everyone stays available, but the replicas diverge and must reconcile later (last-writer-wins, vector clocks or CRDTs).';
    },
  },
  storage: {
    Component: StorageScene,
    legend: [...REQ, { color: C.miss, label: 'Block I/O' }, { color: C.dx, label: 'Snapshot / object' }],
    metrics: (s) =>
      s.variant === 'block'
        ? [
            { label: 'Access', value: 'Block device (1 host)', tone: 'info' },
            { label: 'Latency', value: 'sub-ms', tone: 'good' },
            { label: 'Durability scope', value: 'Single AZ', tone: 'warn' },
            { label: 'AZ a', value: s.failure ? 'DOWN — restore from snapshot' : 'Healthy', tone: s.failure ? 'bad' : 'good' },
            { label: 'Best for', value: 'Databases, boot disks', tone: 'info' },
          ]
        : [
            { label: 'Access', value: 'HTTP API by key', tone: 'info' },
            { label: 'Latency', value: '~10–100 ms', tone: 'warn' },
            { label: 'Durability scope', value: '≥3 AZs · 11 nines', tone: 'good' },
            { label: 'AZ a', value: s.failure ? 'DOWN — still serving' : 'Healthy', tone: s.failure ? 'warn' : 'good' },
            { label: 'Best for', value: 'Media, backups, data lakes', tone: 'info' },
          ],
    narrate: (s) =>
      s.variant === 'block'
        ? s.failure
          ? 'AZ a failed: the instance and its EBS volume are unavailable together. Recovery means restoring a snapshot into another AZ.'
          : 'Block storage presents raw blocks to one machine, which runs a filesystem or database on top. Fast random I/O, but tied to an AZ and (usually) a single host.'
        : s.failure
          ? 'AZ a failed, yet every GET still succeeds from the copies in AZ b and c. Object storage trades latency for massive durability and scale.'
          : 'Object storage stores whole objects by key behind an HTTP API, replicated across AZs. Practically unlimited capacity and many concurrent clients, but no in-place edits.',
  },
} satisfies Record<string, SceneEntry>;
