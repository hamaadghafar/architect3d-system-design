import { rps, type SceneEntry } from '../../types';
import { C } from '../../three/palette';
import { CacheAsideScene } from './CacheAsideScene';
import { WritePoliciesScene } from './WritePoliciesScene';
import { RedisClusterScene } from './RedisClusterScene';
import { StampedeScene } from './StampedeScene';

export const MODULE5_SCENES = {
  'cache-aside': {
    Component: CacheAsideScene,
    legend: [{ color: C.request, label: 'Read (hit path)' }, { color: C.miss, label: 'Read (miss path)' }, { color: C.write, label: 'Populate cache' }, { color: C.response, label: 'Response' }],
    metrics: (s) => {
      const toDb = s.failure || !s.cacheHit;
      return [
        { label: 'Read load', value: rps(s.trafficRate, 300) },
        { label: 'Result', value: s.failure ? 'Cache down → DB' : s.cacheHit ? 'HIT (~0.5 ms)' : 'MISS (~10 ms + SET)', tone: s.failure ? 'bad' : s.cacheHit ? 'good' : 'warn' },
        { label: 'DB load', value: toDb ? rps(s.trafficRate, 300) : rps(s.trafficRate, 15), tone: toDb && s.trafficRate >= 60 ? 'bad' : toDb ? 'warn' : 'good' },
        { label: 'Assumed hit ratio', value: s.failure ? '0%' : s.cacheHit ? '95%' : 'cold', tone: 'info' },
        { label: 'Staleness bound', value: 'TTL 300 s or invalidation', tone: 'info' },
      ];
    },
    narrate: (s) =>
      s.failure
        ? 'The cache cluster is down. Cache-aside degrades gracefully — the app falls back to the database — but the DB suddenly takes 100% of reads. Push the slider past 60% and it overloads.'
        : s.cacheHit
          ? 'HIT: the app finds product:42 in Redis and never touches the database.'
          : 'MISS: the app reads the database, returns the result, and writes it into the cache with a TTL so the next reader gets a hit.',
  },
  'write-policies': {
    Component: WritePoliciesScene,
    legend: [{ color: C.write, label: 'Write' }, { color: C.response, label: 'Ack' }, { color: C.miss, label: 'Async flush' }, { color: C.error, label: 'Lost write' }],
    metrics: (s) => {
      const v = s.variant;
      return [
        { label: 'Write latency', value: v === 'behind' ? 'Cache only (fast)' : 'Cache + DB / DB', tone: v === 'behind' ? 'good' : 'warn' },
        { label: 'Read-after-write in cache', value: v === 'around' ? 'Miss (then load)' : 'Hit', tone: v === 'around' ? 'warn' : 'good' },
        { label: 'Data-loss risk on cache crash', value: v === 'behind' ? 'Unflushed writes lost' : 'None', tone: v === 'behind' ? 'bad' : 'good' },
        { label: 'DB write load', value: v === 'behind' ? 'Batched / smoothed' : 'Every write', tone: v === 'behind' ? 'good' : 'info' },
        { label: 'Cache node', value: s.failure ? 'CRASHED' : 'Healthy', tone: s.failure ? 'bad' : 'good' },
      ];
    },
    narrate: (s) => {
      const crash = s.failure;
      if (s.variant === 'through')
        return crash ? 'Cache crashed: with write-through nothing is lost — the DB already had every acknowledged write. The app falls back to writing the DB directly.' : 'Write-through: the write goes to the cache and synchronously to the DB before the ack. The cache is always warm and consistent, at the cost of write latency.';
      if (s.variant === 'behind')
        return crash ? 'Cache crashed with writes still in the buffer — those acknowledged writes are gone (red). Write-behind needs a durable buffer if loss is unacceptable.' : 'Write-behind: the cache acks immediately and flushes batched writes later. Fastest writes and smooth DB load, but a window of possible data loss.';
      return 'Write-around: writes go straight to the DB and the cache key is deleted. Avoids filling the cache with data nobody reads, but the next read is a miss.';
    },
  },
  'redis-cluster': {
    Component: RedisClusterScene,
    legend: [{ color: C.request, label: 'Command' }, { color: C.response, label: 'Reply' }, { color: C.replicate, label: 'Replication' }, { color: C.neutral, label: 'Gossip' }],
    metrics: (s) => [
      { label: 'Hash slots', value: '16,384 over 3 masters', tone: 'info' },
      { label: 'Slot routing', value: 'CRC16(key) mod 16384', tone: 'info' },
      { label: 'Masters healthy', value: s.failure ? '2 / 3 (+1 promoted)' : '3 / 3', tone: s.failure ? 'warn' : 'good' },
      { label: 'Failover time', value: '~seconds (node-timeout)', tone: 'info' },
      { label: 'Throughput', value: rps(s.trafficRate, 3000) },
    ],
    narrate: (s) =>
      s.failure
        ? 'master 1 stopped responding. The other masters mark it FAIL via gossip and replica 1 is promoted, taking over slots 0–5460. Clients get MOVED/redirected and update their slot map.'
        : 'Keys are mapped to 16,384 slots, spread over three masters. Clients route each command directly to the owner — no proxy hop. Multi-key commands only work when keys share a slot (use {hash tags}).',
  },
  stampede: {
    Component: StampedeScene,
    legend: [{ color: C.request, label: 'Request' }, { color: C.response, label: 'Fresh value' }, { color: C.stale, label: 'Stale value' }, { color: C.error, label: 'Timeout' }],
    metrics: (s) => {
      const herd = !s.cacheHit && s.variant === 'naive';
      return [
        { label: 'Hot key', value: s.cacheHit ? 'Fresh' : 'Expired', tone: s.cacheHit ? 'good' : 'warn' },
        { label: 'DB queries for key', value: s.cacheHit ? '0' : herd ? `≈ ${Math.round(s.trafficRate * 20).toLocaleString()} concurrent` : '1', tone: herd ? 'bad' : 'good' },
        { label: 'Protection', value: s.variant === 'naive' ? 'None' : 'Lock + serve stale', tone: s.variant === 'naive' ? 'bad' : 'good' },
        { label: 'Database', value: herd ? 'Overloaded' : 'Healthy', tone: herd ? 'bad' : 'good' },
        { label: 'Eviction policy', value: 'allkeys-lru', tone: 'info' },
      ];
    },
    narrate: (s) => {
      if (s.cacheHit) return 'The hot key is fresh: every request is a hit. Now expire it (toggle to EXPIRED) and compare the naive and protected modes.';
      return s.variant === 'naive'
        ? 'Stampede! The key expired and every concurrent request missed at once. All of them run the same expensive query; the database saturates and requests time out.'
        : 'Coalesced: one request wins the lock and rebuilds the value; everyone else gets the stale copy (or waits briefly). The database sees one query instead of thousands.';
    },
  },
} satisfies Record<string, SceneEntry>;
