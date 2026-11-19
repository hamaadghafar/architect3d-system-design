import type { Topic } from '../types';

/* Module 4 — Databases & Storage */

const sqlNoSql: Topic = {
  id: 'sql-vs-nosql',
  title: 'SQL vs. NoSQL',
  tagline: 'Relational flexibility and transactions, or partitioned scale and predictable key-based access — choose by access pattern, not fashion.',
  sceneId: 'sql-nosql',
  camera: { position: [0, 18, 23], target: [-1, 0.5, 0] },
  controls: {
    traffic: true,
    failureLabel: 'Primary / leader',
    variants: [
      { id: 'sql', label: 'SQL (relational)' },
      { id: 'nosql', label: 'NoSQL (partitioned KV)' },
    ],
    hint: 'Compare a relational primary with normalised tables and JOINs against a partitioned key-value store. Fail the primary/leader in each to compare blast radius.',
  },
  fundamentals: {
    what: '**SQL (relational) databases** — PostgreSQL, MySQL, SQL Server, Oracle — store data in tables with a fixed schema, enforce constraints, support JOINs and ad-hoc queries, and provide multi-row **ACID transactions**. **NoSQL** is a family: **key-value** (DynamoDB, Redis), **wide-column** (Cassandra, Bigtable), **document** (MongoDB), **graph** (Neo4j). Most distributed NoSQL stores partition data by a key across many nodes and optimise for predictable access by that key.',
    why: 'Relational databases make data correct and flexible to query, but scaling writes beyond one primary needs sharding, which removes many of their advantages. NoSQL stores were built (Dynamo, Bigtable) for massive scale and availability: data is partitioned from day one, so throughput grows by adding nodes — in exchange for designing around access patterns and accepting weaker query/transaction capabilities.',
    where: 'SQL: business systems of record, financial data, anything with complex relationships and evolving queries, most applications at moderate scale. NoSQL: very high write throughput, huge datasets with simple access (user sessions, carts, IoT time series, messages, feeds), flexible schemas, global low-latency tables.',
    how: [
      '**SQL request**: the query planner chooses indexes and join strategies, reads pages from the buffer pool or disk, and returns rows; writes go to the write-ahead log for durability before commit.',
      '**Transactions** use locks or MVCC to give isolation; multi-table updates commit atomically.',
      '**Scaling SQL**: bigger instance → read replicas → caching → functional partitioning → sharding (application- or proxy-level, e.g. Vitess, Citus).',
      '**NoSQL request**: the partition key is hashed to find the owning partition and its replicas; the item is read/written there.',
      '**Replication** in NoSQL is per partition (leader-based or leaderless quorums with tunable consistency).',
      '**Data modelling** in NoSQL starts from queries: denormalise, pre-join, and create one table/index per access pattern (single-table design in DynamoDB).',
      'Both families converge: PostgreSQL has JSONB, NewSQL (Spanner, CockroachDB) offers SQL + horizontal scale, DynamoDB offers transactions.',
    ],
    bottlenecks: [
      { problem: 'Single-primary write throughput limit', solution: 'NoSQL partitions writes across many nodes; SQL needs sharding or NewSQL.' },
      { problem: 'Complex relationships and ad-hoc reporting', solution: 'SQL JOINs, constraints and query planners handle them natively.' },
      { problem: 'Schema rigidity during fast iteration', solution: 'Document stores and JSON columns allow flexible schemas.' },
      { problem: 'Predictable single-digit-ms latency at any scale', solution: 'Key-based NoSQL access with automatic partitioning.' },
    ],
    tradeoffs: [
      { aspect: 'Query flexibility', gain: 'SQL: any query, joins, aggregations.', cost: 'NoSQL: queries must follow designed keys/indexes; scans are expensive.' },
      { aspect: 'Consistency', gain: 'SQL: strong ACID transactions.', cost: 'NoSQL: often eventual or tunable consistency; limited multi-item transactions.' },
      { aspect: 'Scale', gain: 'NoSQL: horizontal scale built in.', cost: 'SQL: write scaling requires sharding effort.' },
      { aspect: 'Modelling', gain: 'SQL: normalised, avoids duplication.', cost: 'NoSQL: denormalisation duplicates data that must be kept in sync.' },
    ],
    keyNumbers: [
      { label: 'DynamoDB item max size', value: '400 KB' },
      { label: 'Key-value read latency', value: 'single-digit ms' },
      { label: 'Big relational instance', value: '~100k+ simple TPS' },
      { label: 'Typical NoSQL RF', value: '3' },
    ],
  },
  cloud: {
    public: {
      summary: 'Managed relational: RDS, Aurora, Cloud SQL, AlloyDB, Azure SQL. Managed NoSQL: DynamoDB, Bigtable, Firestore, Cosmos DB, Keyspaces. Globally distributed SQL: Spanner, Aurora DSQL, CockroachDB Cloud.',
      stack: ['Amazon RDS / Aurora', 'Amazon DynamoDB', 'Google Cloud Spanner', 'Azure Cosmos DB', 'MongoDB Atlas'],
      points: [
        'Managed services handle backups, patching, replicas and failover.',
        'DynamoDB on-demand mode removes capacity planning for spiky key-value workloads.',
        'Polyglot persistence: use more than one store, each for what it does best.',
      ],
    },
    private: {
      summary: 'Self-managed PostgreSQL/MySQL clusters (Patroni, Orchestrator), Oracle RAC, Cassandra/ScyllaDB, MongoDB replica sets — often on dedicated hardware with local NVMe for performance.',
      stack: ['PostgreSQL + Patroni', 'MySQL + Orchestrator / Vitess', 'Cassandra / ScyllaDB', 'MongoDB', 'Oracle RAC'],
      points: [
        'Operational expertise (backups, upgrades, failover drills) is the real cost of self-managed databases.',
        'Licence costs (Oracle, SQL Server) often drive placement decisions.',
      ],
    },
    hybrid: {
      summary: 'Common hybrid patterns: on-prem system-of-record SQL database with change data capture (Debezium, DMS) streaming into cloud NoSQL/analytics stores, or distributed SQL clusters spanning on-prem and cloud.',
      stack: ['Debezium / AWS DMS (CDC)', 'Kafka', 'CockroachDB / YugabyteDB multi-site', 'Read replicas in cloud'],
      points: [
        'CDC lets the cloud consume data without touching the on-prem write path.',
        'Avoid synchronous cross-site writes unless latency budgets allow.',
      ],
    },
  },
  examples: [
    {
      company: 'Amazon',
      headline: 'Dynamo: availability over consistency for the shopping cart',
      scale: '2007 SOSP paper → DynamoDB (2012)',
      detail: 'Amazon’s Dynamo paper described a key-value store using consistent hashing, replication and quorum reads/writes, designed so customers could always add items to their cart even during failures. Its ideas shaped Cassandra, Riak and the managed DynamoDB service.',
      lesson: 'Let the business requirement (always-writable cart) decide the consistency trade-off.',
    },
    {
      company: 'Discord',
      headline: 'Trillions of messages: MongoDB → Cassandra → ScyllaDB',
      scale: 'Trillions of stored messages',
      detail: 'Discord moved messages from MongoDB to Cassandra (2017), partitioned by channel and time bucket, and later to ScyllaDB to reduce tail latency and operational toil. Data access is almost always “recent messages for a channel”, a perfect fit for wide-column partitioning.',
      lesson: 'Model partitions around the dominant query and bound partition size (time buckets).',
    },
  ],
  interview: [
    {
      question: 'How do you decide between a relational database and a NoSQL database?',
      difficulty: 'Junior/Mid',
      answer: [
        'Start from data shape and access patterns. If data is relational, queries are varied or unknown, and correctness needs transactions — choose SQL. If access is by key with very high scale, predictable latency, flexible schema or global distribution needs — consider NoSQL.',
        'Default to a relational database unless a specific requirement rules it out; it covers most applications to substantial scale. Many systems use both.',
      ],
      followUps: [{ q: 'Is NoSQL “schemaless”?', a: 'Schema-on-read: the database does not enforce a schema, but the application still has one — and must handle old and new shapes.' }],
      redFlags: ['Choosing NoSQL “because it scales” without access-pattern analysis.'],
    },
    {
      question: 'What does ACID mean?',
      difficulty: 'Junior/Mid',
      answer: [
        '**Atomicity**: all or nothing. **Consistency**: transactions move the DB between valid states (constraints hold). **Isolation**: concurrent transactions behave as if serialised to a configured degree (read committed, repeatable read, serializable). **Durability**: committed data survives crashes (WAL, fsync, replication).',
        'Isolation levels matter in practice: lower levels allow anomalies like non-repeatable reads, phantoms or write skew.',
      ],
      followUps: [{ q: 'What is BASE?', a: 'Basically Available, Soft state, Eventually consistent — the availability-first philosophy of many NoSQL systems.' }],
      redFlags: ['Confusing the C in ACID with the C in CAP.'],
    },
    {
      question: 'Design a DynamoDB table for an e-commerce order system. What are the keys?',
      difficulty: 'Senior',
      answer: [
        'List access patterns first: get order by ID; list orders for a customer newest-first; get items of an order; list orders by status for operations. Single-table design: `PK = CUSTOMER#123`, `SK = ORDER#2024-05-01#987` lets one query return a customer’s orders sorted by date. Order items as `PK = ORDER#987`, `SK = ITEM#1..n`. A GSI with `GSI1PK = STATUS#SHIPPED`, `GSI1SK = date` serves operations queries (shard the status key if hot).',
        'Use conditional writes for invariants, transactions for multi-item updates, and streams to feed search/analytics.',
      ],
      followUps: [{ q: 'What is a hot partition and how do you avoid it?', a: 'One key receiving disproportionate traffic exceeds a partition’s throughput. Use high-cardinality keys, write sharding (suffixes), and caching.' }],
      redFlags: ['Designing the table before listing access patterns.'],
    },
    {
      question: 'Your PostgreSQL primary is at its write limit. What are your options in order?',
      difficulty: 'Senior',
      answer: [
        'Reduce writes first: batch them, remove unnecessary updates/indexes, move ephemeral data (sessions, counters) to Redis, and offload async work to queues. Scale up the instance and storage IOPS. Then partition functionally (separate databases per domain), and finally shard by a key (tenant/user) with Citus, application-level routing or a migration to a distributed SQL database.',
        'Each step increases complexity, so measure where write load comes from before choosing.',
      ],
      followUps: [{ q: 'Do read replicas help?', a: 'Not with write throughput — every replica must apply every write.' }],
      redFlags: ['Suggesting read replicas for a write bottleneck.'],
    },
    {
      question: 'When would you recommend a distributed SQL database (Spanner, CockroachDB) instead of sharding or NoSQL?',
      difficulty: 'Staff',
      answer: [
        'When you need horizontal write scale **and** strong consistency with SQL semantics — e.g. a global financial ledger, inventory across regions, multi-tenant SaaS outgrowing a single primary where cross-entity transactions are common.',
        'Trade-offs: higher write latency (consensus round trips, cross-region if replicas span regions), cost, different performance tuning (hot ranges, interleaving), and vendor/operational maturity. Validate with realistic load tests and compare with the operational cost of application-level sharding.',
      ],
      followUps: [{ q: 'How does Spanner provide external consistency?', a: 'TrueTime — GPS/atomic-clock-bounded time uncertainty — lets it assign commit timestamps and wait out the uncertainty interval.' }],
      redFlags: ['Ignoring latency costs of consensus.'],
    },
  ],
};

const readReplicas: Topic = {
  id: 'read-replicas',
  title: 'Read Replicas',
  tagline: 'Copy the primary’s data to followers that serve reads — multiply read capacity, at the price of replication lag.',
  sceneId: 'read-replicas',
  camera: { position: [-2, 18, 23], target: [-2, 0.5, 1] },
  controls: {
    traffic: true,
    failureLabel: 'Primary',
    hint: 'Push traffic above 75% to see replication lag grow on the replicas. Fail the primary: replica 1 is promoted and the others re-point to it.',
  },
  fundamentals: {
    what: 'A **read replica** is a copy of a database that continuously applies changes from the **primary** (via the write-ahead log, binlog or storage-level replication) and serves **read-only** queries. Replication is usually **asynchronous**, so replicas lag the primary by milliseconds to seconds.',
    why: 'Most applications read far more than they write (10:1 to 100:1). Replicas scale read throughput horizontally, isolate heavy analytics/reporting queries from the primary, place data closer to users in other regions, and provide promotion candidates for disaster recovery.',
    where: 'Read-heavy web apps, reporting/BI queries, search indexing, cross-region read locality, warm standbys for DR. Not a solution for write bottlenecks.',
    how: [
      'The primary writes each change to its log (WAL / binlog) before committing.',
      'Replicas stream the log and replay it; managed services like Aurora share a storage layer, so replicas lag very little.',
      'The application (or a proxy/driver) routes **writes** to the primary endpoint and **reads** to the reader endpoint.',
      'Reads that must see the user’s own recent write (**read-your-writes**) go to the primary or wait until the replica has replayed that position.',
      'Monitor **replica lag**; remove lagging replicas from rotation.',
      'On primary failure, a replica can be **promoted**; with async replication, the last unreplicated writes are lost (RPO > 0).',
    ],
    bottlenecks: [
      { problem: 'Primary CPU saturated by reads', solution: 'Fan reads out to N replicas.' },
      { problem: 'Analytics queries slow down OLTP traffic', solution: 'Run them on a dedicated replica.' },
      { problem: 'Cross-region read latency', solution: 'Cross-region replicas serve local reads.' },
      { problem: 'Slow disaster recovery', solution: 'Promote a replica instead of restoring from backup.' },
    ],
    tradeoffs: [
      { aspect: 'Consistency', gain: 'Massive read scale.', cost: 'Stale reads due to lag; read-your-writes needs special handling.' },
      { aspect: 'Write scaling', gain: 'None needed for reads.', cost: 'Writes still limited to one primary; every replica replays every write.' },
      { aspect: 'Failover', gain: 'Replica promotion is fast.', cost: 'Async replication → possible data loss on promotion.' },
      { aspect: 'Cost', gain: 'Linear read capacity.', cost: 'Each replica is a full copy of storage and compute.' },
    ],
    keyNumbers: [
      { label: 'RDS MySQL/Postgres replicas', value: 'up to 15' },
      { label: 'Aurora replicas', value: 'up to 15' },
      { label: 'Typical async lag', value: 'ms – seconds' },
      { label: 'Common read:write ratio', value: '10:1 – 100:1' },
    ],
  },
  cloud: {
    public: {
      summary: 'RDS and Cloud SQL read replicas (same or cross-region), Aurora replicas on shared storage with a reader endpoint, Azure SQL readable secondaries. Proxies (RDS Proxy, ProxySQL) can route reads and writes.',
      stack: ['RDS read replicas', 'Aurora reader endpoint', 'Cloud SQL replicas', 'Azure SQL geo-replication', 'RDS Proxy'],
      points: [
        'Aurora replicas typically lag far less than log-shipping replicas because storage is shared.',
        'Cross-region replicas double as DR targets.',
      ],
    },
    private: {
      summary: 'PostgreSQL streaming replication, MySQL replication (with GTIDs), managed by Patroni or Orchestrator for failover, with HAProxy/ProxySQL/PgBouncer for routing.',
      stack: ['PostgreSQL streaming replication', 'MySQL GTID replication', 'Patroni', 'Orchestrator', 'ProxySQL / HAProxy'],
      points: [
        'Semi-synchronous replication reduces data loss at the cost of write latency.',
        'Automate failover carefully — split-brain is worse than downtime.',
      ],
    },
    hybrid: {
      summary: 'A classic hybrid move: keep the primary on-prem and run read replicas in the cloud (over Direct Connect) to serve cloud-hosted read traffic or analytics, or as a migration step before cutting over.',
      stack: ['Replicas over DX/VPN', 'AWS DMS', 'Cross-site Patroni', 'Logical replication'],
      points: [
        'WAN latency increases lag; size bandwidth for peak write volume.',
        'Promoting the cloud replica is a common cutover technique for migrations.',
      ],
    },
  },
  examples: [
    {
      company: 'GitHub',
      headline: 'A 43-second partition and a long recovery',
      scale: 'October 21, 2018 · ~24 hours of degraded service',
      detail: 'A brief network partition between GitHub’s US East data centre and its network hub caused its MySQL failover tooling to promote replicas in another region. Writes had landed in both places, so the databases diverged; GitHub chose to reconcile data carefully rather than lose writes, leading to a long recovery.',
      lesson: 'Automated failover with async replication can create divergent writes. Define failover policy around data integrity, not just uptime.',
    },
    {
      company: 'Read-heavy SaaS',
      headline: 'Reporting replicas',
      scale: 'Common pattern',
      detail: 'Many SaaS companies dedicate one replica to BI and reporting queries so that heavy, unpredictable analytical queries never compete with customer-facing traffic on the primary.',
      lesson: 'Replicas are also a workload-isolation tool, not just a scaling tool.',
    },
  ],
  interview: [
    {
      question: 'What are read replicas and when should you use them?',
      difficulty: 'Junior/Mid',
      answer: [
        'Copies of the primary that apply its changes and serve read-only queries. Use them when reads dominate and the primary is CPU/IO-bound on reads, to isolate reporting, for cross-region read locality, or as DR candidates.',
        'They do not increase write capacity, and reads may be slightly stale.',
      ],
      followUps: [{ q: 'How does the application know where to send queries?', a: 'Separate writer and reader endpoints/connection pools, a proxy that splits by statement type, or framework support (e.g. Rails multiple databases).' }],
      redFlags: ['Using replicas to fix write throughput.'],
    },
    {
      question: 'What is replication lag, and how can it cause bugs?',
      difficulty: 'Junior/Mid',
      answer: [
        'The delay between a write committing on the primary and becoming visible on a replica. Bugs: a user updates their profile and immediately sees the old value; an order is created and the confirmation page says “not found”; counters appear to go backwards across replicas.',
        'Mitigate with read-your-writes routing (primary for a short window after a user writes), monotonic reads (stick a session to one replica), or waiting for a replication position.',
      ],
      followUps: [{ q: 'What causes lag to spike?', a: 'Heavy write bursts, long-running transactions or DDL on the primary, under-sized replicas, or replicas busy with heavy queries.' }],
      redFlags: ['Assuming replicas are always up to date.'],
    },
    {
      question: 'How would you implement read-your-writes consistency with replicas?',
      difficulty: 'Senior',
      answer: [
        'Options: (1) after a write, route that user’s reads to the primary for N seconds (store a timestamp in the session/cookie); (2) record the primary’s log position (LSN/GTID) at commit and, for subsequent reads, use a replica only if it has replayed at least that position (otherwise wait briefly or use the primary); (3) route only specific “just-written” views to the primary.',
        'Option 2 is precise but needs driver/proxy support; option 1 is simple and usually good enough.',
      ],
      followUps: [{ q: 'Does this give global strong consistency?', a: 'No — only per-user guarantees. Other users can still see stale data.' }],
      redFlags: ['Sending all reads to the primary as the “fix”.'],
    },
    {
      question: 'Your primary fails. Walk through a safe failover with asynchronous replicas.',
      difficulty: 'Senior',
      answer: [
        'Detect failure reliably (multiple observers, avoid false positives). Fence the old primary so it cannot accept writes if it comes back (STONITH, revoke its endpoint/security group). Choose the most up-to-date replica (highest replayed position), promote it, re-point other replicas to it, update the writer endpoint/DNS, and let applications reconnect.',
        'Accept and quantify potential data loss (writes not yet replicated). Afterwards, rebuild the old primary as a replica rather than reintroducing it.',
      ],
      followUps: [{ q: 'Why is fencing essential?', a: 'Without it, a returning old primary can accept writes in parallel — split-brain with divergent data.' }],
      redFlags: ['No mention of fencing or data loss.'],
    },
    {
      question: 'Design database topology for a read-heavy global app with users in the US, EU and Asia.',
      difficulty: 'Staff',
      answer: [
        'Single-writer option: primary in one region with cross-region read replicas in the other two; reads local, writes travel to the primary (acceptable if writes are rare or latency-tolerant). Add caching at the edge for hot reads. For DR, promote a cross-region replica.',
        'If writes must be local too: partition users by home region (each region primary for its users) or adopt a multi-region database (Aurora Global Database for fast cross-region replication, DynamoDB global tables or Spanner for multi-region writes). Decide based on write latency needs, conflict tolerance and data-residency rules.',
      ],
      followUps: [{ q: 'How do you handle a user travelling abroad?', a: 'Their writes still go to their home region; reads can be served locally with read-your-writes protections.' }],
      redFlags: ['Synchronous cross-continent replication for every write without discussing latency.'],
    },
  ],
};

const hashRing: Topic = {
  id: 'sharding-consistent-hashing',
  title: 'Sharding & Consistent Hashing Ring',
  tagline: 'Split data across many nodes so that adding or removing a node moves only a small fraction of keys.',
  sceneId: 'hash-ring',
  camera: { position: [0, 17, 18], target: [0, 0, 0] },
  controls: {
    traffic: true,
    failureLabel: 'Shard C',
    failureStates: ['REMOVED', 'present'],
    variants: [
      { id: 'ring', label: 'Consistent hashing' },
      { id: 'modulo', label: 'hash mod N' },
    ],
    hint: 'Remove shard C in ring mode: only its keys (amber) move to the next node clockwise. Switch to hash mod N and remove it again: most keys move.',
  },
  fundamentals: {
    what: '**Sharding** (horizontal partitioning) splits a dataset across multiple nodes by a **shard key**. **Consistent hashing** maps both nodes and keys onto the same circular hash space (the **ring**); each key belongs to the first node clockwise from its position. With **virtual nodes** (each physical node owning many points on the ring), load spreads evenly and a departing node’s keys are distributed among many neighbours.',
    why: 'Naive `hash(key) mod N` remaps almost every key when N changes — catastrophic for caches (mass misses) and databases (massive data movement). Consistent hashing remaps only about **1/N** of keys when a node is added or removed, making elastic scaling and failure handling practical.',
    where: 'Distributed caches (memcached clients, Redis client-side sharding), Dynamo-style databases (Cassandra, DynamoDB, Riak), CDNs and load balancers (Maglev hashing, rendezvous hashing), sharded message routing, and any system that maps keys to a changing set of servers.',
    how: [
      'Choose a **shard key** with high cardinality and even access (user_id, not country).',
      'Hash it (MurmurHash, MD5…) into a fixed space, e.g. 0 to 2³²−1, visualised as a ring.',
      'Place each node on the ring at one or many positions (tokens / virtual nodes).',
      'To locate a key: hash it and walk clockwise to the first node token — that node owns it; replicas are the next N−1 distinct nodes clockwise.',
      'Adding a node: it takes over only the keys between its token and its predecessor. Removing a node: only its keys move to the successor.',
      'Alternatives: **range sharding** (contiguous key ranges, good for range scans, needs rebalancing of hot ranges) and **directory/lookup-based** sharding (a mapping service).',
    ],
    bottlenecks: [
      { problem: 'One node cannot hold all data or handle all writes', solution: 'Partition data across many nodes by key.' },
      { problem: 'Resharding with mod-N moves nearly everything', solution: 'Consistent hashing moves only ~1/N of keys.' },
      { problem: 'Uneven load when nodes have few ring positions', solution: 'Virtual nodes smooth the distribution.' },
      { problem: 'Heterogeneous hardware', solution: 'Give bigger nodes more virtual nodes (weights).' },
    ],
    tradeoffs: [
      { aspect: 'Elasticity', gain: 'Minimal data movement on membership change.', cost: 'Needs consistent membership views across clients/nodes.' },
      { aspect: 'Query patterns', gain: 'Fast single-key lookups.', cost: 'Range queries and cross-shard joins/transactions become expensive or impossible.' },
      { aspect: 'Hot keys', gain: 'Spreads many keys evenly.', cost: 'A single celebrity key still lands on one node — needs replication/splitting.' },
      { aspect: 'Operations', gain: 'Scale by adding nodes.', cost: 'Rebalancing, repair and monitoring per shard add operational load.' },
    ],
    keyNumbers: [
      { label: 'Keys moved (consistent)', value: '≈ 1/N' },
      { label: 'Keys moved (mod N)', value: '≈ (N−1)/N' },
      { label: 'Cassandra vnodes / node', value: '16–256' },
      { label: 'Redis Cluster slots', value: '16,384' },
    ],
  },
  cloud: {
    public: {
      summary: 'Managed services hide the ring: DynamoDB partitions by key automatically, Bigtable/Spanner split ranges dynamically, ElastiCache/MemoryDB use Redis Cluster slots, Cosmos DB uses partition keys. You still choose a good key.',
      stack: ['DynamoDB partitions', 'Bigtable tablets', 'Spanner splits', 'ElastiCache Redis Cluster', 'Cosmos DB partition key'],
      points: [
        'Managed partitioning still suffers from hot partitions if the key is skewed.',
        'Adaptive capacity helps but does not fix a fundamentally bad key.',
      ],
    },
    private: {
      summary: 'Self-managed: Cassandra/ScyllaDB token rings with vnodes, Vitess (MySQL sharding with keyspace IDs), Citus (PostgreSQL), memcached client-side ketama hashing.',
      stack: ['Cassandra / ScyllaDB', 'Vitess', 'Citus', 'Ketama (memcached)', 'Ringpop'],
      points: [
        'Rebalancing large shards takes hours to days — plan capacity ahead.',
        'Automate repair/anti-entropy in leaderless rings.',
      ],
    },
    hybrid: {
      summary: 'Ring-based databases can place replicas across sites (Cassandra multi-datacenter with NetworkTopologyStrategy), keeping a full copy per site and using LOCAL_QUORUM for low-latency consistency.',
      stack: ['Cassandra multi-DC', 'Kafka partitions across sites', 'Geo-partitioned SQL'],
      points: [
        'Shard by geography to satisfy residency (EU users’ shards stay in EU).',
        'Cross-site rebalancing consumes WAN bandwidth — throttle it.',
      ],
    },
  },
  examples: [
    {
      company: 'Akamai',
      headline: 'Consistent hashing was born for web caching',
      scale: '1997 MIT paper (Karger et al.)',
      detail: 'Consistent hashing was introduced in a 1997 paper by Karger and colleagues at MIT to distribute web caching load across changing sets of servers; the research underpinned the founding of Akamai.',
      lesson: 'The technique was designed precisely for caches whose membership changes constantly.',
    },
    {
      company: 'Apache Cassandra',
      headline: 'Token ring with virtual nodes',
      scale: 'Clusters of hundreds of nodes',
      detail: 'Cassandra places each node at many token positions (vnodes); a key’s partition is hashed with Murmur3 onto the ring, and replicas are placed on the next distinct nodes (rack/DC-aware). Adding a node streams small ranges from many existing nodes.',
      lesson: 'Virtual nodes turn rebalancing into many small parallel transfers instead of one large hot spot.',
    },
  ],
  interview: [
    {
      question: 'Why is hash(key) mod N a problem when scaling a cache cluster?',
      difficulty: 'Junior/Mid',
      answer: [
        'Changing N changes the result for almost every key, so after adding or removing one server nearly all keys map elsewhere. The cache experiences a near-total miss storm and the database behind it gets hammered.',
        'Consistent hashing moves only about 1/N of keys, keeping most of the cache warm.',
      ],
      followUps: [{ q: 'What fraction moves when going from 4 to 5 nodes with consistent hashing?', a: 'About 1/5 of keys — those now owned by the new node.' }],
      redFlags: ['Not understanding why remapping matters.'],
    },
    {
      question: 'How does consistent hashing work, and why are virtual nodes needed?',
      difficulty: 'Junior/Mid',
      answer: [
        'Nodes and keys are hashed onto a ring; each key is owned by the first node clockwise. Adding/removing a node affects only its neighbour range.',
        'With one point per node, ranges are uneven and a removed node dumps all its load on a single successor. Virtual nodes (many points per node) even out ranges and spread a failed node’s load across many nodes; weights can reflect node capacity.',
      ],
      followUps: [{ q: 'What is rendezvous (HRW) hashing?', a: 'Each key picks the node with the highest hash(key, node) score — also minimal disruption, no ring structure needed, O(N) per lookup.' }],
      redFlags: ['Forgetting replica placement on the ring.'],
    },
    {
      question: 'How do you choose a shard key for a multi-tenant SaaS database?',
      difficulty: 'Senior',
      answer: [
        'Usually tenant_id: most queries are tenant-scoped, keeping each tenant’s data together allows joins and transactions within a shard, and tenants can be moved as units. Risks: very large tenants become hot shards — handle with dedicated shards for whales or a composite key (tenant_id + entity_id) for them.',
        'Evaluate cardinality, access skew, growth, cross-shard query needs, and the ability to rebalance. Keep a directory (tenant → shard) for flexible moves.',
      ],
      followUps: [{ q: 'Why use a directory instead of pure hashing?', a: 'It allows moving a specific tenant (e.g. a growing customer) to its own shard without rehashing others.' }],
      redFlags: ['Sharding by a low-cardinality or time-based key that creates hot spots.'],
    },
    {
      question: 'How would you handle a hot key that overwhelms one shard?',
      difficulty: 'Senior',
      answer: [
        'For reads: cache it (including local in-process caches with short TTLs), replicate it to multiple nodes and read from any. For writes: split the key (key#0..key#9, aggregate on read — e.g. sharded counters), batch writes, or route to a dedicated high-capacity node.',
        'Detect hot keys with per-key metrics/sampling so you can respond before an incident.',
      ],
      followUps: [{ q: 'Example?', a: 'A celebrity’s follower counter: write to 10 sub-counters chosen randomly and sum them on read.' }],
      redFlags: ['Adding more shards as the answer to a single hot key.'],
    },
    {
      question: 'Plan resharding a live database from 8 to 32 shards with zero downtime.',
      difficulty: 'Staff',
      answer: [
        'Use logical shards from the start (e.g. 1,024 virtual shards mapped to 8 physical) so resharding is moving virtual shards, not rehashing. Steps per moving shard: snapshot copy to the new node, stream changes (CDC/replication) until caught up, verify (checksums/row counts), briefly pause or double-write, flip the routing directory, then clean up.',
        'Do it gradually with throttling to protect production, monitor latency and errors, keep rollback by flipping routing back while the old copy remains. Automate with tooling (Vitess resharding workflows, Citus rebalancer).',
      ],
      followUps: [{ q: 'How do you avoid lost writes during the flip?', a: 'A short write freeze per shard, or dual-writes with idempotent reconciliation, plus verifying CDC caught up to the freeze point.' }],
      redFlags: ['Stop-the-world migration.', 'No verification step.'],
    },
  ],
};

const cap: Topic = {
  id: 'cap-theorem',
  title: 'CAP Theorem',
  tagline: 'When the network partitions, a distributed data store must choose: stay consistent or stay available.',
  sceneId: 'cap',
  camera: { position: [0, 16, 20], target: [0, 0.5, 0] },
  controls: {
    traffic: true,
    failureLabel: 'Network partition',
    failureStates: ['PARTITIONED', 'connected'],
    variants: [
      { id: 'cp', label: 'CP (consistency)' },
      { id: 'ap', label: 'AP (availability)' },
    ],
    hint: 'Cut the network between regions. In CP mode the minority side rejects writes; in AP mode both sides accept writes and diverge.',
  },
  fundamentals: {
    what: 'The **CAP theorem** (Brewer’s conjecture, proved by Gilbert and Lynch in 2002) states that a distributed data store cannot simultaneously guarantee **Consistency** (every read sees the latest write — linearizability), **Availability** (every request to a non-failing node gets a non-error response) and **Partition tolerance** (the system keeps operating despite dropped messages between nodes). Since partitions happen in real networks, the real choice is **C or A during a partition**.',
    why: 'It frames the unavoidable trade-off when replicas cannot talk: either refuse some requests to avoid conflicting data (CP), or accept them and reconcile later (AP). Understanding it prevents designs that silently promise both. **PACELC** extends it: if Partitioned choose A or C; Else choose Latency or Consistency — capturing the everyday latency cost of strong consistency.',
    where: 'CP-leaning systems: etcd, ZooKeeper, Consul, Spanner, HBase, most relational primaries with synchronous failover — used for coordination, locks, metadata, money. AP-leaning: Cassandra, DynamoDB (default eventually consistent reads), Riak, DNS, CDNs, shopping carts, social feeds. Many systems are tunable per request (quorum levels).',
    how: [
      'Replicas exchange writes over the network; a **partition** splits them into groups that cannot communicate.',
      '**CP behaviour**: only the side with a **majority quorum** (e.g. 2 of 3) may accept writes/linearizable reads; the minority returns errors or times out.',
      '**AP behaviour**: every side keeps serving; writes on both sides create **divergent versions**.',
      'When the partition heals, AP systems **reconcile**: last-writer-wins timestamps, vector clocks + application merge, or CRDTs that merge automatically.',
      '**Tunable consistency**: with N replicas, read quorum R and write quorum W, R + W > N gives overlap (strongly consistent reads in the absence of failures); lower values favour availability/latency.',
      'Without partitions, the trade-off becomes **latency vs. consistency** (PACELC): synchronous quorum writes are slower than local writes.',
    ],
    bottlenecks: [
      { problem: 'Conflicting writes during network splits (split-brain)', solution: 'CP: quorums and leader election prevent two writers.' },
      { problem: 'Total unavailability when a region is cut off', solution: 'AP: every replica keeps serving locally.' },
      { problem: 'Cross-region latency for every write', solution: 'AP/eventual consistency allows local writes with async replication.' },
      { problem: 'Divergent data after partitions', solution: 'Conflict resolution strategies (LWW, vector clocks, CRDTs).' },
    ],
    tradeoffs: [
      { aspect: 'CP', gain: 'No stale reads or conflicting writes.', cost: 'Minority partitions and leaderless periods are unavailable; higher write latency.' },
      { aspect: 'AP', gain: 'Always writable/readable, low latency.', cost: 'Stale reads, conflicts and reconciliation complexity.' },
      { aspect: 'Tunable quorums', gain: 'Choose per operation.', cost: 'Easy to misconfigure; guarantees are subtle under failures.' },
      { aspect: 'Business fit', gain: 'Match the data’s semantics (money vs. likes).', cost: 'Different parts of one system may need different choices.' },
    ],
    keyNumbers: [
      { label: 'Quorum of 3 replicas', value: '2' },
      { label: 'Strong quorum rule', value: 'R + W > N' },
      { label: 'CAP proof', value: '2002 (Gilbert & Lynch)' },
      { label: 'Cross-region RTT', value: '~60–150 ms' },
    ],
  },
  cloud: {
    public: {
      summary: 'Managed services expose the choice: DynamoDB eventually consistent vs. strongly consistent reads (and global tables with last-writer-wins), Cosmos DB’s five consistency levels, Spanner’s external consistency, S3’s strong read-after-write consistency.',
      stack: ['DynamoDB (consistent reads, global tables)', 'Azure Cosmos DB consistency levels', 'Google Spanner', 'Amazon S3 (strong consistency)'],
      points: [
        'DynamoDB global tables are multi-active with last-writer-wins conflict resolution.',
        'Cosmos DB offers Strong, Bounded Staleness, Session, Consistent Prefix and Eventual.',
      ],
    },
    private: {
      summary: 'Self-managed: ZooKeeper/etcd/Consul (CP coordination), Cassandra/ScyllaDB (tunable), PostgreSQL with synchronous replication (CP-leaning), Riak with CRDTs (AP).',
      stack: ['etcd / ZooKeeper (Raft/ZAB)', 'Cassandra consistency levels', 'Riak CRDTs', 'PostgreSQL synchronous_commit'],
      points: [
        'Place quorum members in at least three failure domains so one site loss keeps a majority.',
        'Two-site deployments cannot form a robust majority — add a tie-breaker witness.',
      ],
    },
    hybrid: {
      summary: 'Hybrid estates make partitions concrete: the WAN link between on-prem and cloud can fail. Decide per dataset which side keeps writing (CP: one authoritative side) or whether both can (AP with reconciliation).',
      stack: ['Witness node in third site', 'Cassandra multi-DC LOCAL_QUORUM', 'Event sourcing + reconciliation'],
      points: [
        'Two sites + a lightweight witness in a third (or cloud region) avoids split-brain.',
        'Design operations to be commutative/idempotent so AP reconciliation is simpler.',
      ],
    },
  },
  examples: [
    {
      company: 'GitHub',
      headline: 'When failover meets a partition',
      scale: 'October 2018 incident',
      detail: 'After a 43-second network partition, automated MySQL failover promoted primaries across regions while some writes had been accepted on the old side. GitHub prioritised data consistency and spent many hours reconciling instead of discarding writes — a real-world CAP trade-off.',
      lesson: 'Your failover tooling is an implicit CAP decision; make it explicit and test it.',
    },
    {
      company: 'Amazon',
      headline: 'AP shopping cart',
      scale: 'Dynamo design (2007)',
      detail: 'Amazon chose to keep the cart always writable, using versioned objects and merging divergent carts (union of items) on read. Occasionally a deleted item reappears — an acceptable cost for never refusing an “add to cart”.',
      lesson: 'AP works when the business can tolerate and merge conflicts.',
    },
  ],
  interview: [
    {
      question: 'Explain the CAP theorem in your own words.',
      difficulty: 'Junior/Mid',
      answer: [
        'In a distributed store, when a network partition prevents replicas from communicating, you must choose between consistency (refuse requests that cannot be served with the latest data) and availability (serve them anyway, risking stale or conflicting data). You cannot sacrifice partition tolerance in a real network.',
        'So “CA” systems only exist when there are no partitions — e.g. a single node.',
      ],
      followUps: [{ q: 'Is CAP’s consistency the same as ACID’s?', a: 'No. CAP C is linearizability across replicas; ACID C is about invariants/constraints within transactions.' }],
      redFlags: ['“Pick any two” without explaining partitions are unavoidable.'],
    },
    {
      question: 'Give examples of CP and AP systems and when you would use each.',
      difficulty: 'Junior/Mid',
      answer: [
        'CP: etcd, ZooKeeper, Spanner, a relational primary with synchronous failover — for locks, leader election, configuration, account balances. AP: Cassandra, DynamoDB eventual reads, DNS, CDNs — for carts, feeds, likes, telemetry, where availability beats perfect freshness.',
      ],
      followUps: [{ q: 'Can one application use both?', a: 'Yes — e.g. payments in a CP store and product views in an AP store.' }],
      redFlags: ['Classifying systems without mentioning tunable consistency.'],
    },
    {
      question: 'What is PACELC and why is it more useful day-to-day than CAP?',
      difficulty: 'Senior',
      answer: [
        'PACELC: if there is a Partition, choose Availability or Consistency; Else (normal operation) choose Latency or Consistency. Partitions are rare, but the latency cost of synchronous replication/quorums is paid on every request.',
        'Examples: DynamoDB/Cassandra are PA/EL (available, low latency by default); Spanner is PC/EC (consistent, pays latency).',
      ],
      followUps: [{ q: 'How does a quorum system trade latency?', a: 'Waiting for W acknowledgements makes the slowest of W replicas set the write latency; lowering W reduces latency but weakens guarantees.' }],
      redFlags: ['Thinking CAP choices only matter during outages.'],
    },
    {
      question: 'With N=3 replicas, what R and W would you choose and why?',
      difficulty: 'Senior',
      answer: [
        'R=2, W=2 (quorum) gives R+W>N, so reads overlap the latest write set — strong-ish consistency while tolerating one replica failure for both reads and writes. W=3/R=1 gives fast reads but writes fail if any replica is down. W=1/R=1 is fastest and most available but can return stale data.',
        'Caveats: sloppy quorums, hinted handoff and concurrent writes can still produce anomalies; true linearizability needs consensus or careful read-repair semantics.',
      ],
      followUps: [{ q: 'What does LOCAL_QUORUM do in Cassandra?', a: 'Requires a quorum only within the local data centre, avoiding cross-DC latency while keeping local consistency.' }],
      redFlags: ['Claiming R+W>N guarantees linearizability in all cases.'],
    },
    {
      question: 'Design a multi-region inventory system for flash sales that must never oversell.',
      difficulty: 'Staff',
      answer: [
        '“Never oversell” is a CP requirement for the stock decrement. Options: a single authoritative region/partition per SKU (writes route there; reads cached elsewhere), a globally consistent database (Spanner-style) accepting cross-region latency, or **escrow/allocation**: pre-split stock into per-region quotas that each region decrements locally (CP within region), rebalancing quotas asynchronously.',
        'During partitions, regions can sell only their remaining quota — availability degrades gracefully without overselling. Combine with reservations with TTL, idempotent order processing and a queue in front to smooth spikes.',
      ],
      followUps: [{ q: 'Why not AP with reconciliation?', a: 'Reconciliation after overselling means cancelling paid orders — the business explicitly forbids it.' }],
      redFlags: ['Eventually consistent counters for a hard invariant.'],
    },
  ],
};

const storage: Topic = {
  id: 'object-vs-block-storage',
  title: 'Object vs. Block Storage',
  tagline: 'Raw low-latency blocks for one machine, or massively durable objects over HTTP for everyone — and file storage in between.',
  sceneId: 'storage',
  camera: { position: [-1, 18, 23], target: [-1, 0.5, 0] },
  controls: {
    traffic: true,
    failureLabel: 'AZ a outage',
    variants: [
      { id: 'block', label: 'Block (EBS)' },
      { id: 'object', label: 'Object (S3)' },
    ],
    hint: 'Fail AZ a in Block mode: the instance and its volume go down together. Switch to Object mode and fail it again: S3 keeps serving from the other AZs.',
  },
  fundamentals: {
    what: '**Block storage** (EBS, Persistent Disk, SAN LUNs, local NVMe) exposes a raw device of fixed-size blocks to one host, which formats it with a filesystem or uses it directly (databases). **Object storage** (S3, GCS, Azure Blob) stores immutable objects — bytes + metadata — in a flat namespace addressed by key over an HTTP API, replicated across devices and zones. **File storage** (EFS, NFS, SMB) sits between: a shared hierarchical filesystem mounted by many hosts.',
    why: 'Workloads have different needs. Databases and OSes need low-latency random reads/writes and in-place updates — block. Media, backups, logs and data lakes need near-infinite capacity, extreme durability, cheap storage tiers and access from anywhere — object. Shared files across many servers — file.',
    where: 'Block: boot volumes, relational/NoSQL database storage, Kafka logs, any low-latency random I/O. Object: images/video, static websites, backups/archives, data lakes (Parquet), ML datasets, logs. File: shared home directories, CMS uploads for legacy apps, lift-and-shift apps that expect POSIX.',
    how: [
      '**Block**: the instance attaches a volume (NVMe over the Nitro network for EBS); the OS issues block reads/writes; the volume is replicated within one AZ.',
      'Block volumes scale by size and provisioned IOPS/throughput; snapshots are incremental and stored in object storage.',
      '**Object**: clients `PUT`/`GET` whole objects via HTTPS (multipart upload for large files, byte-range GETs for partial reads).',
      'The service stores data redundantly (replication or erasure coding) across multiple AZs before acknowledging a PUT.',
      'Objects are immutable — updates replace the whole object (versioning keeps history); listing is by prefix.',
      'Lifecycle policies move objects to cheaper tiers (Infrequent Access, Glacier/Archive) and expire old data.',
      '**File**: NFS/SMB protocol mounts; the service handles locking and shared access across hosts.',
    ],
    bottlenecks: [
      { problem: 'Databases need sub-millisecond random I/O', solution: 'Block storage with provisioned IOPS or local NVMe.' },
      { problem: 'Petabytes of media and backups', solution: 'Object storage scales without capacity planning at low cost per GB.' },
      { problem: 'Data loss from disk/AZ failures', solution: 'Object storage stores redundantly across AZs (11 nines designed durability).' },
      { problem: 'Serving files to millions of users', solution: 'Object storage behind a CDN; no servers in the data path.' },
    ],
    tradeoffs: [
      { aspect: 'Latency', gain: 'Block: sub-ms random I/O.', cost: 'Object: tens of ms per request; not for transactional databases.' },
      { aspect: 'Durability & availability scope', gain: 'Object: multi-AZ by default.', cost: 'Block: single-AZ — snapshots needed for AZ-level recovery.' },
      { aspect: 'Sharing', gain: 'Object: unlimited concurrent clients.', cost: 'Block: usually one host at a time.' },
      { aspect: 'Semantics', gain: 'Block: in-place updates, POSIX via filesystem.', cost: 'Object: whole-object writes, no rename/append, eventual listing semantics in some systems.' },
      { aspect: 'Cost', gain: 'Object: cheapest per GB, archive tiers.', cost: 'Block: pay for provisioned size, used or not.' },
    ],
    keyNumbers: [
      { label: 'S3 designed durability', value: '99.999999999%' },
      { label: 'S3 max object size', value: '5 TB' },
      { label: 'EBS gp3 baseline', value: '3,000 IOPS' },
      { label: 'EBS io2 Block Express', value: 'up to 256k IOPS' },
    ],
  },
  cloud: {
    public: {
      summary: 'AWS: EBS (block), instance store (ephemeral NVMe), S3 (object), EFS/FSx (file). GCP: Persistent Disk/Hyperdisk, Cloud Storage, Filestore. Azure: Managed Disks, Blob Storage, Azure Files.',
      stack: ['Amazon EBS / instance store', 'Amazon S3 + Glacier', 'Amazon EFS / FSx', 'Google Cloud Storage', 'Azure Blob / Managed Disks'],
      points: [
        'Use S3 lifecycle rules to move cold data to cheaper classes automatically.',
        'Instance-store NVMe is fastest but lost on stop/termination — only for replicated or scratch data.',
        'S3 provides strong read-after-write consistency for all operations (since 2020).',
      ],
    },
    private: {
      summary: 'On-prem: SAN arrays (Fibre Channel/iSCSI) and Ceph RBD for block; Ceph RGW, MinIO, NetApp StorageGRID for S3-compatible object; NFS filers (NetApp, Isilon) for file.',
      stack: ['Ceph (RBD / RGW / CephFS)', 'MinIO', 'NetApp / Pure Storage', 'Dell PowerScale (Isilon)'],
      points: [
        'S3-compatible on-prem object storage lets applications use one API everywhere.',
        'Erasure coding reduces storage overhead versus 3× replication at the cost of CPU and rebuild time.',
      ],
    },
    hybrid: {
      summary: 'Hybrid storage patterns: backups and archives from on-prem to S3/Glacier, AWS Storage Gateway presenting cloud storage as on-prem file/volume/tape, DataSync for migrations, S3-compatible APIs on both sides.',
      stack: ['AWS Storage Gateway', 'AWS DataSync', 'Snowball (offline transfer)', 'MinIO + S3 replication'],
      points: [
        'Petabyte migrations are often faster with physical transfer devices than over the WAN.',
        'Keep residency in mind when replicating objects across regions.',
      ],
    },
  },
  examples: [
    {
      company: 'Amazon S3',
      headline: 'The storage substrate of the internet',
      scale: 'Hundreds of trillions of objects (as described by AWS)',
      detail: 'Launched in 2006, S3 stores objects redundantly across multiple AZs and is designed for 11 nines of durability. Many companies build data lakes, media pipelines and backups directly on it, decoupling storage from compute.',
      lesson: 'Separating storage (object) from compute lets each scale and be priced independently.',
    },
    {
      company: 'Netflix',
      headline: 'Object storage as the media and data backbone',
      scale: 'Huge media library and a large data lake',
      detail: 'Netflix keeps source media, encoded assets and its analytics data lake in S3, with compute clusters (encoding, Spark) reading and writing it, while databases run on block storage for low-latency access.',
      lesson: 'Use object storage for large, shared, durable data and block storage for latency-sensitive state.',
    },
  ],
  interview: [
    {
      question: 'Compare block, file and object storage.',
      difficulty: 'Junior/Mid',
      answer: [
        'Block: raw volume attached to one host, sub-ms random I/O, in-place updates — for databases and boot disks. File: shared POSIX filesystem over NFS/SMB for many hosts. Object: immutable objects by key over HTTP, huge scale, multi-AZ durability, cheap tiers — for media, backups and data lakes.',
      ],
      followUps: [{ q: 'Can you run a database on S3?', a: 'Not a transactional database directly — latency and whole-object semantics do not fit. Analytical engines (Athena, Spark, lakehouse formats like Iceberg) query data stored in S3.' }],
      redFlags: ['Suggesting object storage for low-latency random writes.'],
    },
    {
      question: 'How would you store and serve user-uploaded images for a social app?',
      difficulty: 'Junior/Mid',
      answer: [
        'Clients upload directly to object storage with presigned URLs; an event triggers processing (thumbnails, compression, moderation). Store metadata (owner, key, dimensions) in a database. Serve via CDN with long cache TTLs and versioned keys; keep the bucket private with CDN origin access control.',
      ],
      followUps: [{ q: 'Why not store images in the database?', a: 'It bloats the database, hurts backups/replication and is far more expensive per GB.' }],
      redFlags: ['Proxying uploads through app servers by default.'],
    },
    {
      question: 'An EBS-backed database lost its AZ. How do you recover, and how would you design to avoid long recovery?',
      difficulty: 'Senior',
      answer: [
        'EBS is AZ-scoped: restore the latest snapshot into a volume in another AZ (losing writes since the snapshot) and replay logs if available, or fail over to a replica in another AZ. To avoid it: run the database with a synchronous standby or replicas in other AZs (Multi-AZ), frequent snapshots, and continuous log archiving to S3 for point-in-time recovery.',
      ],
      followUps: [{ q: 'What determines RPO here?', a: 'Synchronous standby: ~0. Async replica: replication lag. Snapshots only: snapshot interval.' }],
      redFlags: ['Assuming EBS volumes survive AZ failures.'],
    },
    {
      question: 'How do you cut storage costs for a growing data lake?',
      difficulty: 'Senior',
      answer: [
        'Lifecycle policies to tiered storage (Standard → IA → Glacier) or Intelligent-Tiering; columnar compressed formats (Parquet/ORC) and partitioning to reduce scanned bytes; compaction of small files; expiring temporary and staging data; deduplication; and governance (tagging, owners) to delete orphaned datasets.',
        'Watch retrieval costs and minimum storage durations of cold tiers before moving data.',
      ],
      followUps: [{ q: 'Why are many small files bad?', a: 'Per-request overhead and metadata cost dominate; query engines spend more time listing/opening files than reading data.' }],
      redFlags: ['Moving frequently read data to archive tiers.'],
    },
    {
      question: 'Design storage for a video platform: raw uploads, transcoded outputs, thumbnails and metadata, at petabyte scale.',
      difficulty: 'Staff',
      answer: [
        'Raw masters in object storage (with lifecycle to a colder tier after encoding, kept for re-encoding); transcoded segments in a separate bucket optimised for CDN origin access (versioned keys, long TTLs); thumbnails similarly. Metadata (titles, ownership, rendition manifests, processing state) in a database — relational for catalogue, key-value for high-volume lookups.',
        'Encoders use local NVMe/instance store as scratch for speed. Cross-region replication for DR of critical assets, with residency rules respected. Cost controls: per-title retention policies, delete unused renditions, analyse egress (CDN offload).',
      ],
      followUps: [{ q: 'Where does the CDN fit?', a: 'In front of the segments bucket; the origin should only see cache fills.' }],
      redFlags: ['Storing videos on block volumes attached to web servers.'],
    },
  ],
};

export const module4Topics: Topic[] = [sqlNoSql, readReplicas, hashRing, cap, storage];
