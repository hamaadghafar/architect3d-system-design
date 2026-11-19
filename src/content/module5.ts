import type { Topic } from '../types';

/* Module 5 — Caching & Performance */

const cacheAside: Topic = {
  id: 'cache-aside',
  title: 'Cache-Aside (Lazy Loading)',
  tagline: 'The application checks the cache first, loads from the database on a miss, and populates the cache for next time.',
  sceneId: 'cache-aside',
  camera: { position: [-3, 16, 20], target: [-3, 0.5, 0] },
  controls: {
    traffic: true,
    cache: true,
    failureLabel: 'Redis cluster',
    hint: 'Toggle HIT/MISS to compare the paths. Then fail the cache and push the traffic slider above 60%: every read falls through and the database overloads.',
  },
  fundamentals: {
    what: '**Cache-aside** (lazy loading) keeps a cache (Redis, Memcached) beside the database, managed by the **application**: read → check cache → on **hit** return; on **miss** read the database, return the value, and write it to the cache with a **TTL**. On updates the application writes the database and **invalidates** (deletes) the cache key.',
    why: 'Memory is ~100× faster than disk-backed database queries, and most traffic hits a small hot set of data. Caching that set cuts latency to sub-millisecond and offloads the database by orders of magnitude. Cache-aside is the most common pattern because it is simple, caches only what is actually requested, and degrades gracefully: if the cache fails, the app still works (slower).',
    where: 'Read-heavy data with tolerance for brief staleness: product pages, user profiles, configuration, computed results, session data, API responses, rendered fragments.',
    how: [
      'Request arrives: build a cache key (`product:42:v3`).',
      '`GET` from the cache. **Hit** → deserialize and return (sub-ms).',
      '**Miss** → query the database (ms to tens of ms).',
      '`SET` the result in the cache with a TTL (plus jitter to avoid synchronized expiry).',
      'Return the result. Subsequent requests hit the cache until TTL expiry or eviction.',
      'On write: update the DB **then delete the cache key** (not update it) to avoid races leaving stale values.',
      'Monitor hit ratio, latency, memory, evictions; size the cache to hold the working set.',
    ],
    bottlenecks: [
      { problem: 'Database overloaded by repetitive reads', solution: 'Serve the hot set from memory; DB sees only misses.' },
      { problem: 'High read latency', solution: 'Sub-ms in-memory lookups.' },
      { problem: 'Caching unused data wastes memory', solution: 'Lazy loading caches only what is requested.' },
      { problem: 'Cache outage taking down the app', solution: 'Fallback to the DB keeps functionality (if the DB can handle it).' },
    ],
    tradeoffs: [
      { aspect: 'Freshness', gain: 'Simple TTL-based staleness bound.', cost: 'Readers can see stale data until TTL/invalidation.' },
      { aspect: 'First request', gain: 'Only requested data is cached.', cost: 'Every miss pays DB latency plus a cache write (cold start after deploys/flushes).' },
      { aspect: 'Consistency', gain: 'Delete-on-write is simple.', cost: 'Race conditions (read-old, write-new, set-old) can leave stale entries — use short TTLs/versioning.' },
      { aspect: 'Failure', gain: 'App keeps working without cache.', cost: 'Thundering herd on the DB when the cache disappears.' },
    ],
    keyNumbers: [
      { label: 'Redis GET latency', value: '< 1 ms' },
      { label: 'Good hit ratio', value: '90–99%' },
      { label: 'Single Redis node', value: '~100k+ ops/s' },
      { label: 'Typical TTL', value: 'seconds–hours' },
    ],
  },
  cloud: {
    public: {
      summary: 'Managed Redis/Memcached: Amazon ElastiCache, MemoryDB (durable Redis-compatible), Google Memorystore, Azure Cache for Redis. DynamoDB Accelerator (DAX) is a write-through cache specifically for DynamoDB.',
      stack: ['Amazon ElastiCache (Redis/Valkey/Memcached)', 'Amazon MemoryDB', 'Google Memorystore', 'Azure Cache for Redis', 'DynamoDB DAX'],
      points: [
        'Place the cache in the same AZ/VPC as the app to keep latency sub-ms.',
        'Enable replicas and automatic failover; plan for the cold-cache scenario anyway.',
      ],
    },
    private: {
      summary: 'Self-hosted Redis/Valkey, Memcached or KeyDB clusters on-prem, often alongside in-process caches (Caffeine, Guava) for the hottest data.',
      stack: ['Redis / Valkey', 'Memcached', 'Caffeine (in-process)', 'Twemproxy / Envoy Redis proxy'],
      points: [
        'Two-level caching (local + distributed) cuts network hops for very hot keys.',
        'Watch memory fragmentation and eviction metrics.',
      ],
    },
    hybrid: {
      summary: 'Caches are a key hybrid latency tool: a cloud-side cache in front of an on-prem database avoids WAN round trips for hot reads; invalidations can be driven by CDC events from the on-prem DB.',
      stack: ['CDC-driven invalidation (Debezium → Kafka)', 'Cloud cache + on-prem DB', 'Edge caching'],
      points: [
        'Event-driven invalidation keeps a remote cache fresh without polling.',
        'Size TTLs with WAN failure in mind — a longer TTL keeps serving during link outages.',
      ],
    },
  },
  examples: [
    {
      company: 'Meta (Facebook)',
      headline: 'Scaling Memcache',
      scale: 'Billions of requests per second (NSDI 2013 paper)',
      detail: 'Facebook’s “Scaling Memcache at Facebook” paper describes a look-aside cache architecture across regions, with delete-on-write invalidations broadcast by a daemon (mcsqueal) reading the MySQL commit log, and leases to prevent stale sets and thundering herds.',
      lesson: 'At scale, invalidation and herd protection are the hard parts of caching — not the GET/SET.',
    },
    {
      company: 'Twitter / X',
      headline: 'Caching timelines',
      scale: 'Hundreds of millions of users',
      detail: 'Twitter famously precomputed and cached home timelines in Redis clusters, serving reads from memory rather than assembling them from the database on each request.',
      lesson: 'Caching precomputed results (not just raw rows) can turn expensive reads into simple lookups.',
    },
  ],
  interview: [
    {
      question: 'Explain cache-aside and its read and write paths.',
      difficulty: 'Junior/Mid',
      answer: [
        'Read: check cache → hit returns; miss reads DB, populates cache with TTL, returns. Write: update DB, then delete the cache key so the next read reloads fresh data.',
        'The application owns cache logic; the cache does not talk to the database.',
      ],
      followUps: [{ q: 'Why delete instead of updating the cache on write?', a: 'Concurrent writers can apply cache updates out of order and leave stale data; deleting forces the next reader to load the committed value.' }],
      redFlags: ['No TTL or invalidation strategy.'],
    },
    {
      question: 'What should and should not be cached?',
      difficulty: 'Junior/Mid',
      answer: [
        'Cache data that is read often, expensive to compute/fetch, and tolerant of brief staleness: catalogue items, profiles, configuration, aggregates. Avoid caching data that must be perfectly fresh (balances during transfers), rarely-read data, highly personalised data with low reuse, or data that is cheap to fetch.',
      ],
      followUps: [{ q: 'How do you measure success?', a: 'Hit ratio, latency improvement, DB load reduction and memory cost.' }],
      redFlags: ['“Cache everything.”'],
    },
    {
      question: 'Describe a race condition in cache-aside that leaves stale data, and fix it.',
      difficulty: 'Senior',
      answer: [
        'Reader A misses and reads value v1 from the DB. Writer B updates the DB to v2 and deletes the key. Reader A then sets v1 into the cache — stale until TTL expiry.',
        'Fixes: short TTLs as a safety net; versioned values with compare-and-set (only set if version is newer); leases (Facebook: the cache issues a lease token on miss and rejects sets whose lease was invalidated by a delete); or delayed double-delete.',
      ],
      followUps: [{ q: 'Is this common?', a: 'Rare per request but common at high volume; that is why large systems use leases or versioning.' }],
      redFlags: ['Believing delete-on-write is race-free.'],
    },
    {
      question: 'Your Redis cluster fails during peak. What happens and how should you have designed for it?',
      difficulty: 'Senior',
      answer: [
        'All reads fall through to the database, multiplying its load; latency spikes, connection pools exhaust and the DB may fall over — taking the whole app down even though the cache is “optional”.',
        'Design: replicated cache with automatic failover across AZs; client timeouts and circuit breakers so slow cache calls fail fast; a small in-process cache for the hottest keys; request coalescing; load shedding/rate limiting to protect the DB; and capacity testing of the DB with a cold cache.',
      ],
      followUps: [{ q: 'How do you warm a cold cache after recovery?', a: 'Let traffic warm it gradually with herd protection, or pre-load known hot keys from logs/analytics.' }],
      redFlags: ['Treating the cache as optional without testing a cold-cache scenario.'],
    },
    {
      question: 'Design a caching strategy for a product catalogue serving 200k reads/s with prices that change a few times a day.',
      difficulty: 'Staff',
      answer: [
        'Layers: CDN caching for anonymous product pages/API responses (short TTL + stale-while-revalidate, surrogate-key purge on price change); a distributed Redis cache with cache-aside for product objects; an in-process LRU for the top few thousand items. Invalidate on change via events from the catalogue service (CDC → purge cache keys and CDN tags).',
        'Use versioned keys so a price change creates a new key, avoiding races; add TTL jitter; protect hot keys with request coalescing; monitor hit ratios per layer. The database then sees only a trickle of misses.',
      ],
      followUps: [{ q: 'How fresh will prices be?', a: 'Seconds after a change, bounded by event propagation and purge time — usually acceptable; checkout re-reads the authoritative price.' }],
      redFlags: ['Using one long TTL without invalidation for price data.'],
    },
  ],
};

const writePolicies: Topic = {
  id: 'write-through-behind',
  title: 'Write-Through, Write-Behind & Write-Around',
  tagline: 'Who acknowledges the write and when: the trade-off between write latency, cache freshness and durability.',
  sceneId: 'write-policies',
  camera: { position: [0, 15, 19], target: [0, 0.5, 0.5] },
  controls: {
    traffic: true,
    failureLabel: 'Cache node',
    failureStates: ['CRASHED', 'healthy'],
    variants: [
      { id: 'through', label: 'Write-through' },
      { id: 'behind', label: 'Write-behind' },
      { id: 'around', label: 'Write-around' },
    ],
    hint: 'Compare the three write paths, then crash the cache node in each mode. Only write-behind loses acknowledged writes.',
  },
  fundamentals: {
    what: '**Write-through**: writes go to the cache, which synchronously writes the database before acknowledging. **Write-behind (write-back)**: the cache acknowledges immediately and persists to the database asynchronously, often in batches. **Write-around**: writes go directly to the database, bypassing (and invalidating) the cache; data enters the cache only when read.',
    why: 'Cache-aside leaves the first read after every write as a miss and requires application-side invalidation. Write policies let the caching layer keep data warm (write-through), absorb write bursts and coalesce updates (write-behind), or avoid polluting the cache with write-once data (write-around).',
    where: 'Write-through: read-after-write heavy data needing a warm cache (user profiles, session stores, DAX for DynamoDB). Write-behind: high-frequency updates where some loss is tolerable or the buffer is durable (counters, metrics, game state, view counts). Write-around: bulk/ingest data rarely re-read soon (logs, archives, large uploads).',
    how: [
      '**Write-through**: app → cache SET → cache writes DB → DB commits → ack to app. Reads afterwards hit.',
      'Failure of the DB write must fail the request (or the cache must roll back) to stay consistent.',
      '**Write-behind**: app → cache SET → immediate ack; a background flusher batches dirty entries and writes them to the DB every N ms or N items.',
      'Multiple updates to the same key within a window collapse into one DB write (write coalescing).',
      'Durability depends on the buffer: in-memory only → lost on crash; replicated log (e.g. Kafka, AOF with replicas) → safer.',
      '**Write-around**: app → DB write → delete cache key; the next read misses and loads.',
    ],
    bottlenecks: [
      { problem: 'First read after a write misses the cache', solution: 'Write-through keeps the cache warm.' },
      { problem: 'Database cannot absorb write bursts', solution: 'Write-behind buffers and batches writes.' },
      { problem: 'Write-once data evicts useful hot data', solution: 'Write-around avoids caching it.' },
      { problem: 'Hot counters updated thousands of times/s', solution: 'Write-behind coalesces into periodic DB updates.' },
    ],
    tradeoffs: [
      { aspect: 'Write latency', gain: 'Write-behind: cache-speed acks.', cost: 'Write-through: cache + DB latency on every write.' },
      { aspect: 'Durability', gain: 'Write-through/around: DB has every acked write.', cost: 'Write-behind: acknowledged writes can be lost before flush.' },
      { aspect: 'Read freshness', gain: 'Write-through: always warm and current.', cost: 'Write-around: next read misses.' },
      { aspect: 'Cache efficiency', gain: 'Write-around: only read data cached.', cost: 'Write-through: caches data that may never be read.' },
    ],
    keyNumbers: [
      { label: 'Write-through latency', value: 'cache + DB' },
      { label: 'Write-behind ack', value: '~sub-ms' },
      { label: 'Typical flush interval', value: '100 ms–seconds' },
      { label: 'Loss window (in-memory)', value: '≤ flush interval' },
    ],
  },
  cloud: {
    public: {
      summary: 'DynamoDB Accelerator (DAX) is a managed write-through/read-through cache. MemoryDB offers a durable Redis-compatible store (transaction log across AZs) that can act as the primary database. ElastiCache is typically used with cache-aside/write-through implemented in the app.',
      stack: ['DynamoDB DAX', 'Amazon MemoryDB', 'ElastiCache', 'Kinesis / SQS as write-behind buffer'],
      points: [
        'For write-behind, put a durable queue/stream between cache and DB if loss is unacceptable.',
        'MemoryDB removes the cache/DB split for some workloads by being durable itself.',
      ],
    },
    private: {
      summary: 'Data-grid products implement these policies natively (Hazelcast, Apache Ignite, Oracle Coherence with read-through/write-through/write-behind CacheStores). Redis with AOF + replicas narrows write-behind loss windows.',
      stack: ['Hazelcast MapStore', 'Apache Ignite', 'Oracle Coherence', 'Redis AOF'],
      points: [
        'Data grids handle batching, retry and coalescing for write-behind.',
        'Test crash scenarios to know the real loss window.',
      ],
    },
    hybrid: {
      summary: 'Write-behind is useful across WAN links: a cloud-side cache acknowledges quickly and syncs to an on-prem system of record asynchronously — but only when the business accepts eventual persistence.',
      stack: ['Queue-based sync to on-prem', 'CDC back-propagation', 'Durable outbox'],
      points: [
        'Use an outbox/queue to guarantee eventual delivery across the WAN.',
        'Idempotent DB writes make retries after link failures safe.',
      ],
    },
  },
  examples: [
    {
      company: 'CPU caches',
      headline: 'The original write-back cache',
      scale: 'Every modern processor',
      detail: 'CPU L1/L2 caches commonly use write-back: modified cache lines are marked dirty and written to memory only on eviction, with coherence protocols (MESI) keeping cores consistent. Operating-system page caches also buffer writes and flush them later (hence fsync).',
      lesson: 'Write-back trades durability windows for throughput — databases call fsync precisely to close that window.',
    },
    {
      company: 'Gaming & counters',
      headline: 'Write-behind for high-frequency state',
      scale: 'Thousands of updates per second per hot entity',
      detail: 'Game servers and view/like counters often keep state in memory/Redis and persist snapshots or aggregated deltas periodically, because persisting every update synchronously would overwhelm the database.',
      lesson: 'Write-behind fits data where the latest value matters more than every intermediate step.',
    },
  ],
  interview: [
    {
      question: 'Compare write-through, write-behind and write-around.',
      difficulty: 'Junior/Mid',
      answer: [
        'Write-through: synchronous write to cache and DB — consistent and warm, slower writes. Write-behind: ack after cache write, async DB persistence — fastest, risk of loss. Write-around: write DB only, invalidate cache — avoids caching unread data, first read misses.',
      ],
      followUps: [{ q: 'Which pairs naturally with cache-aside?', a: 'Write-around (update DB, delete key) is essentially cache-aside’s write path.' }],
      redFlags: ['Not mentioning durability risk of write-behind.'],
    },
    {
      question: 'When is write-behind acceptable?',
      difficulty: 'Junior/Mid',
      answer: [
        'When losing the last few seconds of updates is acceptable (view counts, analytics, presence), when the buffer is durable (replicated log) so loss is not a concern, or when write volume would otherwise overwhelm the DB. Not for payments or orders unless backed by a durable queue.',
      ],
      followUps: [{ q: 'How do you make write-behind durable?', a: 'Write updates to a replicated log (Kafka, Kinesis) or Redis with AOF + replicas before acking, and apply them to the DB idempotently.' }],
      redFlags: ['Using in-memory write-behind for financial data.'],
    },
    {
      question: 'In write-through, what happens if the database write fails?',
      difficulty: 'Senior',
      answer: [
        'The request must fail and the cache must not keep the new value (or must be invalidated), otherwise cache and DB diverge. Implement as: write DB first then update cache, or use a transactional pattern in the caching layer that rolls back. Retries must be idempotent.',
      ],
      followUps: [{ q: 'What if the cache update fails after the DB write succeeds?', a: 'Delete or expire the key so the next read reloads; log and alert — the DB is the source of truth.' }],
      redFlags: ['Treating the cache as the source of truth in write-through.'],
    },
    {
      question: 'Design a like-counter for posts receiving 50k likes per second on viral content.',
      difficulty: 'Senior',
      answer: [
        'Increment counters in Redis (INCR, possibly sharded counters per post to spread hot keys); record the like event itself in a durable log (Kafka) for idempotency/dedup (user can like once). A write-behind job aggregates deltas and persists counts to the DB periodically. Reads come from Redis with DB fallback.',
        'Approximate display counts are acceptable; exact per-user like state lives in the durable store.',
      ],
      followUps: [{ q: 'What if Redis crashes?', a: 'Rebuild counters from the DB + replay of the log since the last flush.' }],
      redFlags: ['Synchronous DB UPDATE per like on a single row.'],
    },
    {
      question: 'How do these policies interact with multi-region replication of caches and databases?',
      difficulty: 'Staff',
      answer: [
        'Caches are usually regional; the DB replicates across regions. With write-through, a write in region A updates A’s cache and the DB; region B’s cache is stale until invalidated — so publish invalidation events (from CDC) to all regions. Write-behind across regions compounds the loss window and conflict risk — prefer a durable per-region log and idempotent, conflict-aware application.',
        'Decide per data class: strongly consistent data bypasses caches on the write path; eventually consistent data uses regional caches with event-driven invalidation and bounded TTLs.',
      ],
      followUps: [{ q: 'How do you order invalidations?', a: 'Version keys or include commit timestamps so an older invalidation/set cannot overwrite a newer value.' }],
      redFlags: ['Assuming a write in one region refreshes caches everywhere.'],
    },
  ],
};

const redisCluster: Topic = {
  id: 'redis-cluster',
  title: 'Redis Cluster',
  tagline: '16,384 hash slots spread across masters with replicas — horizontal scale and automatic failover for in-memory data.',
  sceneId: 'redis-cluster',
  camera: { position: [-2, 17, 21], target: [-2, 0.5, 0] },
  controls: {
    traffic: true,
    failureLabel: 'master 1',
    hint: 'Fail master 1: the cluster detects it via gossip, replica 1 is promoted and clients are redirected to the new owner of slots 0–5460.',
  },
  fundamentals: {
    what: '**Redis Cluster** partitions the keyspace into **16,384 hash slots** (`CRC16(key) mod 16384`) distributed across multiple **master** nodes, each with one or more **replicas**. Nodes communicate over a **cluster bus** using gossip to share slot ownership and detect failures. Clients are cluster-aware: they cache the slot → node map and follow `MOVED`/`ASK` redirections.',
    why: 'A single Redis node is limited by one machine’s memory and (mostly single-threaded) CPU. Redis Cluster scales memory and throughput horizontally while keeping direct client → node access (no proxy hop) and provides automatic failover by promoting replicas.',
    where: 'Large caches, session stores, rate-limit counters, leaderboards, pub/sub fan-out, real-time feature stores — any Redis workload too big or too hot for one node.',
    how: [
      'The client hashes the key (or its `{hash tag}` portion) to a slot and sends the command to the master that owns it.',
      'If the slot moved, the node replies `MOVED <slot> <host:port>` and the client updates its map.',
      'Masters replicate asynchronously to their replicas.',
      'Nodes gossip PING/PONG; if a master is unreachable beyond `cluster-node-timeout`, others mark it PFAIL → FAIL when a majority of masters agree.',
      'One of the failed master’s replicas is elected and promoted; it takes over the slots.',
      'Resharding moves slots between masters online (`MIGRATING`/`IMPORTING`, with `ASK` redirections during moves).',
      'Multi-key commands and transactions only work when all keys map to the same slot — use hash tags like `cart:{user42}:items`.',
    ],
    bottlenecks: [
      { problem: 'Dataset larger than one node’s RAM', solution: 'Spread slots across many masters.' },
      { problem: 'One node’s CPU saturated', solution: 'Throughput scales with the number of masters.' },
      { problem: 'Manual failover on node loss', solution: 'Automatic replica promotion via gossip consensus.' },
      { problem: 'Proxy hop latency', solution: 'Smart clients route directly to the owning node.' },
    ],
    tradeoffs: [
      { aspect: 'Multi-key operations', gain: 'Same-slot keys via hash tags.', cost: 'Cross-slot MGET/transactions/Lua not allowed.' },
      { aspect: 'Consistency', gain: 'Fast async replication.', cost: 'Acknowledged writes can be lost on failover; not a strongly consistent store.' },
      { aspect: 'Client complexity', gain: 'No proxy needed.', cost: 'Requires cluster-aware clients and handling redirections.' },
      { aspect: 'Hot keys', gain: 'Even spread of many keys.', cost: 'A single hot key still lives on one master.' },
    ],
    keyNumbers: [
      { label: 'Hash slots', value: '16,384' },
      { label: 'Recommended max masters', value: '~1,000' },
      { label: 'Failover time', value: '~node-timeout + seconds' },
      { label: 'Min for HA', value: '3 masters + replicas' },
    ],
  },
  cloud: {
    public: {
      summary: 'ElastiCache and MemoryDB in cluster mode (sharded, Multi-AZ replicas, online resharding), Google Memorystore for Redis Cluster, Azure Cache for Redis Enterprise clustering.',
      stack: ['ElastiCache cluster mode', 'Amazon MemoryDB', 'Memorystore for Redis Cluster', 'Azure Cache for Redis'],
      points: [
        'Place replicas in different AZs from their masters.',
        'Use the configuration endpoint so clients discover topology.',
        'Valkey is an open-source Redis fork supported by several managed services.',
      ],
    },
    private: {
      summary: 'Self-managed Redis/Valkey Cluster on VMs or Kubernetes (operators), or proxy-based sharding (Twemproxy, Envoy Redis proxy, Redis Enterprise).',
      stack: ['Redis / Valkey Cluster', 'Redis Kubernetes operators', 'Twemproxy', 'Envoy Redis proxy'],
      points: [
        'Spread masters and their replicas across racks/hosts (anti-affinity).',
        'Disable persistence or tune it carefully for pure cache workloads.',
      ],
    },
    hybrid: {
      summary: 'Redis Cluster is region-local by design (low latency gossip). Cross-site deployments use separate clusters with application-level replication or Redis Enterprise active-active (CRDT-based) geo-replication.',
      stack: ['Separate clusters per site', 'Redis Enterprise Active-Active (CRDTs)', 'Event-driven cache sync'],
      points: [
        'Do not stretch one cluster across a WAN — gossip timeouts cause false failovers.',
      ],
    },
  },
  examples: [
    {
      company: 'Twitter',
      headline: 'Twemproxy: proxy-based Redis/Memcached sharding',
      scale: 'Very large in-memory fleets',
      detail: 'Twitter open-sourced Twemproxy (nutcracker), a lightweight proxy that shards requests across Memcached/Redis servers with consistent hashing — a common alternative to cluster-aware clients before and alongside Redis Cluster.',
      lesson: 'Proxy-based sharding simplifies clients at the cost of an extra hop; Redis Cluster puts the routing in the client instead.',
    },
    {
      company: 'Managed Redis users',
      headline: 'Online resharding for growth',
      scale: 'Clusters grown from a few to many shards',
      detail: 'Managed services such as ElastiCache support adding shards and rebalancing slots online, letting teams grow cache capacity during the day without a maintenance window.',
      lesson: 'Slot-based partitioning makes resharding incremental: move slots, not the whole dataset.',
    },
  ],
  interview: [
    {
      question: 'How does Redis Cluster decide which node stores a key?',
      difficulty: 'Junior/Mid',
      answer: [
        'It computes CRC16 of the key (or the substring inside `{}` if a hash tag is present) mod 16,384 to get a slot; each slot is owned by one master. Clients keep a slot map and are redirected with MOVED if it is outdated.',
      ],
      followUps: [{ q: 'Why 16,384 slots?', a: 'Enough granularity for balancing across up to ~1,000 nodes while keeping the slot bitmap in gossip messages small.' }],
      redFlags: ['Thinking Redis Cluster uses a central coordinator.'],
    },
    {
      question: 'What are hash tags and when do you need them?',
      difficulty: 'Junior/Mid',
      answer: [
        'Only the part of the key inside `{...}` is hashed, so `user:{42}:cart` and `user:{42}:profile` land in the same slot. Needed for multi-key commands, transactions (MULTI/EXEC) and Lua scripts that touch several keys.',
        'Overusing one tag concentrates data on one node, creating a hot spot.',
      ],
      followUps: [{ q: 'What error do you get otherwise?', a: 'CROSSSLOT — keys in request do not hash to the same slot.' }],
      redFlags: ['Using a single global hash tag for everything.'],
    },
    {
      question: 'Walk through a master failure in Redis Cluster. Can data be lost?',
      difficulty: 'Senior',
      answer: [
        'Other nodes stop receiving PONGs; after node-timeout the master is flagged PFAIL, and when a majority of masters report it, FAIL. Its replicas start an election; the winner (most up-to-date offset preferred) is promoted and claims the slots; gossip propagates the new config; clients get MOVED.',
        'Yes, data can be lost: replication is asynchronous, so writes acknowledged by the old master but not yet replicated disappear. `WAIT` can reduce (not eliminate) this. During a partition, a minority-side master keeps accepting writes until node-timeout, which are then lost.',
      ],
      followUps: [{ q: 'How to reduce loss for important data?', a: 'Use MemoryDB (durable multi-AZ log) or a real database for data that must not be lost.' }],
      redFlags: ['Claiming Redis Cluster is strongly consistent.'],
    },
    {
      question: 'Your Redis cluster has one master at 95% CPU while others are at 20%. Diagnose and fix.',
      difficulty: 'Senior',
      answer: [
        'Likely a hot key or hot slot (a popular item, a global counter, an over-used hash tag) or expensive commands (KEYS, large HGETALL/ZRANGE, big Lua scripts) on that shard. Diagnose with `--hotkeys`, slowlog, command stats and client-side key sampling.',
        'Fix: local in-process caching for hot read keys, replicas for reads (READONLY) where staleness is OK, splitting hot keys (sharded counters), removing O(N) commands, and rebalancing slots if it is a distribution issue.',
      ],
      followUps: [{ q: 'Will adding more masters help?', a: 'Not for a single hot key — it still maps to one slot on one master.' }],
      redFlags: ['Scaling out without identifying the hot key.'],
    },
    {
      question: 'Design a global rate limiter on Redis Cluster for 1M requests/s across many API gateway nodes.',
      difficulty: 'Staff',
      answer: [
        'Key per client/window (e.g. token bucket state in a hash), updated atomically with a Lua script (read tokens, refill by elapsed time, decrement). Keys distribute across slots by client ID, spreading load. To reduce round trips, gateways can use local pre-allocation (lease N tokens at a time) and batch sync, trading slight accuracy.',
        'Deploy per region (limits often regional), replicas for failover, timeouts with fail-open behaviour plus local fallback limits. Hot clients (huge tenants) get dedicated keys split by sub-bucket. Monitor latency and CPU per shard.',
      ],
      followUps: [{ q: 'Why Lua?', a: 'It makes the read-modify-write atomic on the server, preventing races between gateway nodes.' }],
      redFlags: ['Non-atomic GET then SET from clients.'],
    },
  ],
};

const stampede: Topic = {
  id: 'eviction-stampede',
  title: 'Eviction Policies (LRU/LFU) & Cache Stampede',
  tagline: 'Decide what to throw away when memory is full — and stop thousands of simultaneous misses from crushing your database.',
  sceneId: 'stampede',
  camera: { position: [-2, 16, 21], target: [-2, 0.5, 0] },
  controls: {
    traffic: true,
    cache: true,
    cacheLabels: { label: 'Hot key', on: 'FRESH', off: 'EXPIRED' },
    variants: [
      { id: 'naive', label: 'No protection' },
      { id: 'coalesced', label: 'Lock + serve stale' },
    ],
    hint: 'Expire the hot key with No protection selected: every request stampedes the database. Switch to Lock + serve stale: one request rebuilds the value while the others get the stale copy.',
  },
  fundamentals: {
    what: '**Eviction policies** decide which keys to remove when a cache reaches its memory limit: **LRU** (least recently used), **LFU** (least frequently used), **FIFO**, **random**, **TTL-based** (volatile-ttl). Redis approximates LRU/LFU by sampling (`maxmemory-policy allkeys-lru`, `allkeys-lfu`, `volatile-*`, `noeviction`). A **cache stampede** (thundering herd, dog-piling) happens when a popular key expires or is evicted and many concurrent requests miss simultaneously, all recomputing the same value against the backend.',
    why: 'Memory is finite, so the policy determines hit ratio for a given cache size. Stampedes are a classic cause of outages: the cache normally shields the database, but a single expiry of a hot key can send thousands of identical expensive queries at once, overload the database and make the rebuild itself fail — a feedback loop.',
    where: 'Any shared cache under high concurrency: home pages, trending lists, configuration blobs, auth/JWKS keys, expensive aggregates, CDN edges (request collapsing is the same idea).',
    how: [
      '**LRU** evicts keys not accessed recently — good for recency-driven workloads.',
      '**LFU** keeps keys accessed often even if not very recently — resistant to one-off scans polluting the cache.',
      'Set **TTLs with jitter** (e.g. 300 s ± 10%) so many keys do not expire at the same moment.',
      '**Request coalescing / single-flight**: the first miss acquires a short lock (`SET lock:key NX PX 5000`) and recomputes; others wait briefly or retry.',
      '**Serve stale while revalidating**: keep a soft TTL; after it passes, one request refreshes in the background while everyone else receives the stale value.',
      '**Probabilistic early expiration** (XFetch): each reader may refresh slightly before expiry with a probability rising as expiry nears, spreading refreshes out.',
      '**Leases** (as in Facebook’s memcache) grant one client the right to set a key after a miss and tell others to wait.',
    ],
    bottlenecks: [
      { problem: 'Cache full of rarely used data', solution: 'LFU/LRU eviction keeps the working set.' },
      { problem: 'Synchronized expiry of many keys', solution: 'TTL jitter spreads expirations.' },
      { problem: 'Thousands of identical concurrent misses', solution: 'Single-flight locks / leases / request coalescing.' },
      { problem: 'Latency spike while rebuilding', solution: 'Serve stale and refresh asynchronously.' },
    ],
    tradeoffs: [
      { aspect: 'LRU vs. LFU', gain: 'LRU adapts quickly to new popularity.', cost: 'LRU is polluted by scans; LFU adapts slower to shifting popularity.' },
      { aspect: 'Serve stale', gain: 'No latency spike, DB protected.', cost: 'Users briefly see outdated data.' },
      { aspect: 'Locks', gain: 'Exactly one rebuild.', cost: 'Waiters add latency; lock holder crash must be handled with expiry.' },
      { aspect: 'noeviction policy', gain: 'Never silently drops data.', cost: 'Writes fail when memory is full — only for data stores, not caches.' },
    ],
    keyNumbers: [
      { label: 'Redis LRU sample size', value: '5 (default)' },
      { label: 'Suggested TTL jitter', value: '±5–20%' },
      { label: 'Lock TTL', value: '≈ rebuild time × 2' },
      { label: 'Herd size', value: '= concurrent requests' },
    ],
  },
  cloud: {
    public: {
      summary: 'Managed Redis/Memcached expose `maxmemory-policy` and memory metrics; CDNs implement request collapsing and stale-while-revalidate at the edge; API gateways can cache with TTLs.',
      stack: ['ElastiCache parameter groups (maxmemory-policy)', 'CloudFront / Cloudflare request collapsing', 'stale-while-revalidate', 'Lambda@Edge'],
      points: [
        'Alarm on evictions and memory usage — sustained evictions mean the cache is undersized.',
        'Use CDN-level collapsing for hot public content.',
      ],
    },
    private: {
      summary: 'Libraries implement single-flight and early refresh: Go `singleflight`, Caffeine `refreshAfterWrite` (async refresh, serve old value), Guava LoadingCache; Varnish/NGINX have request coalescing (`proxy_cache_lock`).',
      stack: ['Go singleflight', 'Caffeine refreshAfterWrite', 'NGINX proxy_cache_lock', 'Varnish grace mode'],
      points: [
        'In-process caches need herd protection too — per instance and across the fleet.',
        'Varnish “grace” is serve-stale-while-revalidate for HTTP.',
      ],
    },
    hybrid: {
      summary: 'Stampedes are worse across WAN boundaries: a cloud cache missing en masse to an on-prem database saturates the link as well as the DB. Herd protection and longer stale windows are essential there.',
      stack: ['Stale-if-error', 'Background refresh jobs', 'Pre-warming before cutovers'],
      points: [
        'Pre-warm caches before migrating traffic between sites.',
        'Use background refreshers for keys known to be hot.',
      ],
    },
  },
  examples: [
    {
      company: 'Meta (Facebook)',
      headline: 'Leases against thundering herds',
      scale: 'Memcache at Facebook (NSDI 2013)',
      detail: 'Facebook’s memcache issued a lease token on a miss; only the lease holder could set the value, and other clients asking for the same key within a short interval were told to wait and retry — dramatically cutting database load for hot keys after invalidation.',
      lesson: 'Coordinate who rebuilds a missing hot key; never let every client do it.',
    },
    {
      company: 'Research: XFetch',
      headline: 'Optimal probabilistic early expiration',
      scale: 'VLDB 2015 paper (Vattani et al.)',
      detail: 'The paper “Optimal Probabilistic Cache Stampede Prevention” proposes that each reader recomputes early with a probability based on time-to-expiry and recompute cost, so typically one request refreshes before expiry with no locks.',
      lesson: 'A little randomness spreads refreshes and avoids synchronised misses without coordination.',
    },
  ],
  interview: [
    {
      question: 'Compare LRU and LFU eviction.',
      difficulty: 'Junior/Mid',
      answer: [
        'LRU evicts the least recently accessed key — simple, adapts to changing popularity, but a large scan can flush the hot set. LFU evicts the least frequently accessed — protects consistently popular keys, resists scans, but reacts slower when popularity shifts (Redis LFU uses decaying counters to mitigate).',
      ],
      followUps: [{ q: 'How does Redis implement LRU efficiently?', a: 'Approximate LRU: it samples a few keys (maxmemory-samples) and evicts the best candidate, avoiding a full linked list.' }],
      redFlags: ['Not knowing eviction only happens at maxmemory.'],
    },
    {
      question: 'What is a cache stampede?',
      difficulty: 'Junior/Mid',
      answer: [
        'When a hot key expires or is evicted, many concurrent requests miss at once and all hit the backend to recompute the same value, potentially overloading it. The overload slows the recompute, keeping the key missing longer — a feedback loop.',
      ],
      followUps: [{ q: 'Is a cold cache after restart a stampede?', a: 'A related, broader herd problem — every key is missing at once; warm-up and rate limiting help.' }],
      redFlags: ['Thinking it only matters for very large systems.'],
    },
    {
      question: 'Implement stampede protection for a hot key in a distributed cache.',
      difficulty: 'Senior',
      answer: [
        'Store value with a soft expiry inside the payload and a longer hard TTL. On read: if fresh, return. If soft-expired, try `SET lock:key NX PX ttl`; the winner recomputes and writes the new value; losers return the stale value immediately. If the value is fully missing, losers wait briefly (polling/backoff) or return a fallback.',
        'Add TTL jitter, lock expiry to handle crashed holders, and metrics on lock contention.',
      ],
      followUps: [{ q: 'What if recompute takes longer than the lock TTL?', a: 'Another request may start a second rebuild; set the lock TTL above the p99 rebuild time or extend it while working.' }],
      redFlags: ['Lock without expiry (deadlock if the holder dies).'],
    },
    {
      question: 'Your cache shows a 60% hit ratio and constant evictions. What do you do?',
      difficulty: 'Senior',
      answer: [
        'Check whether the working set exceeds memory (evictions + low hit ratio → undersized), whether large/low-value items are crowding out others, whether keys lack TTLs, and whether access is scan-heavy (switch LRU → LFU). Options: scale memory/shards, compress values, cache smaller projections, separate caches by workload, tune TTLs, and stop caching low-reuse data.',
      ],
      followUps: [{ q: 'How do you estimate the right cache size?', a: 'Analyse key access distribution (e.g. from sampling) and simulate hit ratio versus size — the curve usually flattens after the hot set.' }],
      redFlags: ['Only lowering TTLs.'],
    },
    {
      question: 'A homepage aggregate is recomputed every 60 s and takes 2 s of DB time. At 50k req/s, design the caching so the DB never sees more than one recompute per interval.',
      difficulty: 'Staff',
      answer: [
        'Move recomputation off the request path: a background job (single leader via lock or scheduled job) recomputes every ~50 s and writes the value with a TTL well beyond the interval. Requests only read; if the value is missing (cold start), single-flight + serve-a-fallback prevents herds. Add an in-process cache (1–5 s TTL) per server to collapse 50k req/s into a few cache reads.',
        'Put the CDN in front with stale-while-revalidate for anonymous users. Monitor job freshness and alert if the value goes stale beyond a threshold.',
      ],
      followUps: [{ q: 'What if the background job fails?', a: 'Keep serving the last good value (long hard TTL) and alert; users see slightly old data instead of errors.' }],
      redFlags: ['Relying on request-time recomputation for a 2-second query at 50k req/s.'],
    },
  ],
};

export const module5Topics: Topic[] = [cacheAside, writePolicies, redisCluster, stampede];
