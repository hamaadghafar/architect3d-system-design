import type { Topic } from '../types';

/* Module 6 — Asynchronous Messaging & Event Streaming */

const queue: Topic = {
  id: 'message-queues',
  title: 'Message Queues (SQS / RabbitMQ)',
  tagline: 'Put a durable buffer between producers and consumers so each side scales, fails and deploys independently.',
  sceneId: 'queue',
  camera: { position: [-2, 16, 21], target: [-2, 0.5, 0] },
  controls: {
    traffic: true,
    failureLabel: 'Worker 2',
    hint: 'Raise traffic above 65%: producers outpace the workers and the backlog grows, but nothing breaks. Fail worker 2 mid-job: its message reappears after the visibility timeout and is redelivered.',
  },
  fundamentals: {
    what: 'A **message queue** stores messages from **producers** until **consumers** retrieve and acknowledge them. Each message is typically processed by **one** consumer among a pool of **competing consumers**. Amazon **SQS** (fully managed, pull-based, visibility timeout), **RabbitMQ** (AMQP broker with exchanges, routing keys, acknowledgements) and Azure Service Bus are common implementations.',
    why: 'Synchronous calls couple availability and throughput: if the downstream is slow or down, the caller fails. A queue **decouples** them: producers respond immediately, spikes are **buffered** (load levelling), consumers scale independently, failed processing is **retried**, and deploys or outages on one side do not break the other.',
    where: 'Background jobs (emails, thumbnails, reports), order processing pipelines, smoothing writes to a database, integrating microservices, task distribution to worker fleets, buffering between systems with different speeds.',
    how: [
      'Producer sends a message (`SendMessage`); the queue stores it durably (replicated) and acknowledges.',
      'Consumers poll (`ReceiveMessage`, long polling) and get up to N messages.',
      'Received messages become **invisible** to other consumers for the **visibility timeout**.',
      'After successful processing, the consumer **deletes/acks** the message.',
      'If the consumer crashes or exceeds the timeout, the message becomes visible again and is **redelivered** → **at-least-once** delivery.',
      'After `maxReceiveCount` failures, a redrive policy moves it to a **dead-letter queue**.',
      'Scale consumers on queue depth / age of oldest message; FIFO queues add ordering per message group and deduplication.',
    ],
    bottlenecks: [
      { problem: 'Traffic spikes overwhelm downstream services', solution: 'The queue absorbs bursts; consumers process at a sustainable rate.' },
      { problem: 'Downstream outage fails user requests', solution: 'Producers keep enqueuing; work resumes when consumers recover.' },
      { problem: 'Slow work blocks request latency', solution: 'Respond immediately, process asynchronously.' },
      { problem: 'Uneven worker utilisation', solution: 'Competing consumers pull work as they become free.' },
    ],
    tradeoffs: [
      { aspect: 'Latency', gain: 'Fast producer responses.', cost: 'End-to-end completion is asynchronous — users need status polling/notifications.' },
      { aspect: 'Delivery semantics', gain: 'At-least-once is robust.', cost: 'Duplicates happen — consumers must be idempotent.' },
      { aspect: 'Ordering', gain: 'FIFO queues/groups can preserve order.', cost: 'Standard queues are best-effort ordered; strict ordering limits throughput.' },
      { aspect: 'Complexity', gain: 'Resilient, decoupled systems.', cost: 'More components, eventual consistency and harder debugging (tracing).' },
    ],
    keyNumbers: [
      { label: 'SQS max message size', value: '1 MiB (was 256 KB)' },
      { label: 'SQS default visibility timeout', value: '30 s' },
      { label: 'SQS max retention', value: '14 days' },
      { label: 'Delivery (standard)', value: 'at-least-once' },
    ],
  },
  cloud: {
    public: {
      summary: 'Amazon SQS (standard and FIFO), Amazon MQ (managed RabbitMQ/ActiveMQ), Google Cloud Tasks / Pub/Sub, Azure Service Bus and Storage Queues.',
      stack: ['Amazon SQS', 'Amazon MQ (RabbitMQ)', 'Azure Service Bus', 'Google Cloud Tasks', 'Lambda SQS triggers'],
      points: [
        'Use the S3 claim-check pattern for payloads above the size limit.',
        'Lambda event source mappings scale pollers with queue depth automatically.',
        'FIFO queues: ordering per MessageGroupId, deduplication window of 5 minutes.',
      ],
    },
    private: {
      summary: 'Self-hosted RabbitMQ (quorum queues for replication), ActiveMQ Artemis, IBM MQ, NATS JetStream, or Redis-based job queues (Sidekiq, BullMQ) for simpler needs.',
      stack: ['RabbitMQ quorum queues', 'ActiveMQ Artemis', 'IBM MQ', 'NATS JetStream', 'Sidekiq / BullMQ'],
      points: [
        'RabbitMQ quorum queues use Raft for durable, replicated queues.',
        'Monitor memory/disk alarms — brokers apply backpressure when full.',
      ],
    },
    hybrid: {
      summary: 'Queues bridge on-prem and cloud asynchronously: an on-prem system enqueues work that cloud workers process (or vice versa), tolerating WAN outages by buffering.',
      stack: ['IBM MQ ↔ Amazon MQ bridges', 'SQS via Direct Connect / VPC endpoints', 'Shovel / Federation (RabbitMQ)'],
      points: [
        'Buffering across the WAN turns link outages into delays instead of failures.',
        'Size retention to cover the longest expected outage.',
      ],
    },
  },
  examples: [
    {
      company: 'Amazon',
      headline: 'SQS — one of the first AWS services',
      scale: 'Launched in 2004 (beta), GA 2006',
      detail: 'SQS was among AWS’s earliest services because decoupling with queues was central to how Amazon built its own service-oriented architecture: services communicate asynchronously so failures and load spikes stay contained.',
      lesson: 'Asynchronous boundaries are a fundamental building block of resilient service architectures.',
    },
    {
      company: 'E-commerce checkout',
      headline: 'Accept the order now, fulfil it asynchronously',
      scale: 'Typical pattern under peak load',
      detail: 'During peak sales, retailers commonly accept orders quickly and enqueue fulfilment steps (payment capture, inventory reservation, emails, warehouse notification) so slow downstream systems do not block customers at checkout.',
      lesson: 'Keep the synchronous path minimal; push everything that can wait onto queues.',
    },
  ],
  interview: [
    {
      question: 'Why use a message queue instead of a direct synchronous call?',
      difficulty: 'Junior/Mid',
      answer: [
        'Decoupling: the producer does not depend on the consumer being up or fast. Load levelling: bursts are buffered. Independent scaling and deploys, retries on failure, and faster user-facing responses for work that can be done later.',
        'Use synchronous calls when the caller needs the result immediately to continue.',
      ],
      followUps: [{ q: 'What is the downside?', a: 'Eventual completion, duplicate handling, harder debugging and more infrastructure.' }],
      redFlags: ['Putting a queue in front of operations that need an immediate answer.'],
    },
    {
      question: 'What is the visibility timeout, and what happens if processing takes longer?',
      difficulty: 'Junior/Mid',
      answer: [
        'After a consumer receives a message, it is hidden from other consumers for the visibility timeout. If processing exceeds it without deleting the message, the message reappears and another consumer may process it concurrently — duplicates.',
        'Set the timeout above the p99 processing time, extend it via heartbeat (`ChangeMessageVisibility`) for long jobs, and make processing idempotent.',
      ],
      followUps: [{ q: 'How does RabbitMQ differ?', a: 'Unacked messages are redelivered when the consumer’s channel/connection closes, rather than on a timer (plus optional consumer timeouts).' }],
      redFlags: ['Not knowing duplicates are possible.'],
    },
    {
      question: 'How do you make a consumer idempotent?',
      difficulty: 'Senior',
      answer: [
        'Give each message a unique ID (or business key). Before applying effects, record the ID in a deduplication store within the same transaction as the effect (e.g. a processed_messages table with a unique constraint), or use conditional writes/upserts so reapplying has no effect. For external side effects (emails, payments), pass idempotency keys to the downstream API.',
      ],
      followUps: [{ q: 'Why not rely on FIFO deduplication?', a: 'It only deduplicates sends within a short window — not redeliveries after consumer failure or duplicates from upstream retries.' }],
      redFlags: ['“Exactly-once delivery solves it.”'],
    },
    {
      question: 'Your queue’s age-of-oldest-message alarm fires. Walk through the investigation.',
      difficulty: 'Senior',
      answer: [
        'Determine whether producers increased, consumers decreased, or processing got slower: compare send rate vs. delete rate, consumer count/health, processing latency, error rates and DLQ inflow. A downstream dependency slowing down (DB, API rate limits) often slows consumers.',
        'Mitigate: scale consumers (if the downstream can take it), fix poison messages blocking processing, prioritise critical messages via separate queues, and communicate delays. Long term, autoscale on backlog per consumer and set SLOs for queue age.',
      ],
      followUps: [{ q: 'When does scaling consumers make it worse?', a: 'When the bottleneck is downstream — more consumers increase pressure on an already saturated dependency.' }],
      redFlags: ['Only scaling consumers without checking downstream capacity.'],
    },
    {
      question: 'Design an order-processing pipeline that guarantees an order is never lost and never charged twice.',
      difficulty: 'Staff',
      answer: [
        'Persist the order in the database and write an event to an **outbox** table in the same transaction; a relay publishes outbox events to the queue (no dual-write gap). Consumers process steps idempotently: payment uses an idempotency key (order ID) with the payment provider; inventory reservation is a conditional update; each step records completion.',
        'Use DLQs with alarms, retries with backoff, and a saga/state machine (Step Functions or orchestrator) to track progress and compensate on failure (refund, release stock). Monitor end-to-end order age.',
      ],
      followUps: [{ q: 'What is the dual-write problem?', a: 'Writing to the DB and the queue separately can fail in between, leaving them inconsistent; the outbox makes it atomic.' }],
      redFlags: ['Publishing to the queue and writing the DB without the outbox pattern.'],
    },
  ],
};

const kafka: Topic = {
  id: 'kafka',
  title: 'Kafka Partitions & Consumer Groups',
  tagline: 'A distributed, replicated, append-only log: ordered within a partition, scaled by partitions, replayable by any number of consumer groups.',
  sceneId: 'kafka',
  camera: { position: [-2, 19, 23], target: [-2, 0.5, 1] },
  controls: {
    traffic: true,
    failureLabel: 'Consumer A1',
    hint: 'Each partition (colour) is read by exactly one consumer in group A, while group B reads everything independently. Fail A1 and watch the group rebalance P1 onto A0.',
  },
  fundamentals: {
    what: '**Apache Kafka** stores streams of records in **topics**, split into **partitions** — ordered, append-only logs replicated across **brokers** (leader + followers, the in-sync replica set). **Producers** append records; the record key determines the partition. **Consumers** read sequentially and track **offsets**. A **consumer group** shares the work: each partition is assigned to exactly one consumer in the group, so parallelism is bounded by partition count. Different groups read independently.',
    why: 'Queues delete messages after consumption and do not scale ordered processing well. Kafka retains records (hours to forever), so multiple systems can consume the same stream at their own pace and **replay** history. Partitioning gives massive throughput with per-key ordering, making it the backbone for event-driven architectures, CDC and stream processing.',
    where: 'Event sourcing and microservice events, log/metrics pipelines, change data capture (Debezium), stream processing (Kafka Streams, Flink), activity tracking, feeding data lakes and search indexes.',
    how: [
      'Producer sends a record with key `customer_id`; the partitioner picks `hash(key) % partitions`, so a customer’s events stay ordered.',
      'The partition leader appends the record; followers replicate it; with `acks=all` the write is acknowledged once all in-sync replicas have it.',
      'Consumers in group A join via the group coordinator and receive partition assignments.',
      'Each consumer fetches batches from its partitions and periodically **commits offsets** (its position).',
      'If a consumer dies or a new one joins, the group **rebalances**; partitions move and resume from committed offsets.',
      'Records are retained by time/size, or compacted to the latest value per key (log compaction).',
      'Another group (analytics) consumes the same topic from its own offsets — fan-out without copying.',
    ],
    bottlenecks: [
      { problem: 'Message volume beyond a single broker/queue', solution: 'Partitions spread load across brokers; throughput scales horizontally.' },
      { problem: 'Need for ordered processing per entity', solution: 'Key-based partitioning keeps per-key order.' },
      { problem: 'Multiple consumers need the same events', solution: 'Independent consumer groups read the same log.' },
      { problem: 'Reprocessing after bugs or new features', solution: 'Replay from an earlier offset within retention.' },
    ],
    tradeoffs: [
      { aspect: 'Ordering', gain: 'Strict order within a partition.', cost: 'No global order across partitions.' },
      { aspect: 'Parallelism', gain: 'Scale with partitions.', cost: 'Consumers per group ≤ partitions; changing partition count remaps keys.' },
      { aspect: 'Operations', gain: 'Huge throughput, durable retention.', cost: 'Cluster ops (brokers, rebalancing, storage) are non-trivial; managed services help.' },
      { aspect: 'Semantics', gain: 'At-least-once by default; exactly-once within Kafka via transactions.', cost: 'End-to-end exactly-once needs idempotent sinks.' },
    ],
    keyNumbers: [
      { label: 'Typical replication factor', value: '3' },
      { label: 'Common min.insync.replicas', value: '2' },
      { label: 'Throughput per cluster', value: 'GB/s scale' },
      { label: 'Default retention', value: '7 days' },
    ],
  },
  cloud: {
    public: {
      summary: 'Amazon MSK (managed Kafka, also serverless), Confluent Cloud, Azure Event Hubs (Kafka-compatible API), Google Managed Service for Apache Kafka; Kinesis Data Streams and Pub/Sub are alternatives with similar partition/shard concepts.',
      stack: ['Amazon MSK', 'Confluent Cloud', 'Azure Event Hubs', 'Kinesis Data Streams', 'Google Pub/Sub'],
      points: [
        'Kinesis shards ≈ Kafka partitions (per-shard ordering and throughput limits).',
        'Tiered storage moves old segments to object storage for cheap long retention.',
      ],
    },
    private: {
      summary: 'Self-managed Apache Kafka (KRaft mode, no ZooKeeper in newer versions), Redpanda, or Apache Pulsar, with Kafka Connect for integrations and Schema Registry for contracts.',
      stack: ['Apache Kafka (KRaft)', 'Redpanda', 'Apache Pulsar', 'Kafka Connect', 'Schema Registry'],
      points: [
        'Spread replicas across racks (rack awareness).',
        'Monitor under-replicated partitions and consumer lag as key health signals.',
      ],
    },
    hybrid: {
      summary: 'Kafka is a common hybrid backbone: MirrorMaker 2 or Cluster Linking replicates topics between on-prem and cloud clusters, letting cloud services consume on-prem events (CDC) without touching source systems.',
      stack: ['MirrorMaker 2', 'Confluent Cluster Linking', 'Debezium CDC', 'Direct Connect'],
      points: [
        'Replicate asynchronously across sites; keep producers writing locally.',
        'Watch WAN bandwidth for high-volume topics.',
      ],
    },
  },
  examples: [
    {
      company: 'LinkedIn',
      headline: 'Where Kafka was born',
      scale: 'Trillions of messages per day',
      detail: 'Kafka was created at LinkedIn and open-sourced in 2011 to unify activity tracking, metrics and data pipelines. LinkedIn has reported processing several trillion messages per day across its Kafka deployment.',
      lesson: 'A durable log as the central data pipeline lets many systems share the same events.',
    },
    {
      company: 'Uber',
      headline: 'Kafka at the centre of real-time data',
      scale: 'Trillions of messages per day',
      detail: 'Uber has described Kafka as the backbone for trip events, logs, surge pricing and analytics, with features like reliable reprocessing and dead-letter topics built on top for consumers.',
      lesson: 'At scale, consumer-side patterns (retries, DLQs, replay) matter as much as the broker.',
    },
  ],
  interview: [
    {
      question: 'What is a Kafka partition and why does it matter?',
      difficulty: 'Junior/Mid',
      answer: [
        'A partition is an ordered, append-only log; a topic is split into partitions spread across brokers. It is the unit of ordering (per partition), parallelism (one consumer per partition per group) and replication.',
      ],
      followUps: [{ q: 'How do you ensure all events for one user are ordered?', a: 'Use the user ID as the record key so they hash to the same partition.' }],
      redFlags: ['Expecting global ordering across a topic.'],
    },
    {
      question: 'Explain consumer groups.',
      difficulty: 'Junior/Mid',
      answer: [
        'Consumers sharing a group ID split the partitions — each partition goes to one consumer — so the group processes the topic once, in parallel. Different groups each receive all records independently. If a group has more consumers than partitions, the extras sit idle.',
      ],
      followUps: [{ q: 'What triggers a rebalance?', a: 'Consumers joining/leaving, missed heartbeats/poll timeouts, or partition count changes.' }],
      redFlags: ['Thinking adding consumers beyond partition count increases throughput.'],
    },
    {
      question: 'How do you choose the number of partitions?',
      difficulty: 'Senior',
      answer: [
        'From target throughput and consumer parallelism: partitions ≥ max(throughput ÷ per-partition producer throughput, throughput ÷ per-consumer throughput), with headroom for growth because increasing partitions later remaps keys (breaking per-key ordering during transition). Too many partitions increase metadata, open files, recovery time and end-to-end latency.',
      ],
      followUps: [{ q: 'Can you reduce partitions?', a: 'Not in place — you create a new topic and migrate.' }],
      redFlags: ['Choosing thousands of partitions “to be safe”.'],
    },
    {
      question: 'Explain at-least-once vs. exactly-once in Kafka.',
      difficulty: 'Senior',
      answer: [
        'At-least-once: process records, then commit offsets — a crash between them reprocesses records (duplicates). At-most-once: commit first — a crash loses records. Exactly-once in Kafka: idempotent producers plus transactions that atomically write outputs and commit offsets (read-process-write within Kafka). For external sinks, combine at-least-once with idempotent writes (upserts keyed by event ID).',
      ],
      followUps: [{ q: 'What does enable.idempotence do?', a: 'Prevents duplicate writes from producer retries using producer IDs and sequence numbers per partition.' }],
      redFlags: ['Claiming Kafka gives exactly-once to any external database automatically.'],
    },
    {
      question: 'Consumer lag on one partition keeps growing while others are fine. Diagnose and fix.',
      difficulty: 'Staff',
      answer: [
        'Likely a hot partition (skewed key — one big customer), a poison/slow record repeatedly failing on that partition, or the assigned consumer being unhealthy (GC, slow node). Check per-partition produce rate, key distribution, consumer processing time and errors.',
        'Fixes: better key choice or salting hot keys (accepting relaxed ordering for them), moving slow work to async sub-queues, a retry topic + DLQ so one bad record does not block the partition, and per-partition parallelism inside the consumer (process by key concurrently while preserving per-key order).',
      ],
      followUps: [{ q: 'Why does one bad record block a partition?', a: 'Offsets are sequential; a consumer cannot commit past a record it cannot process, so it retries in place unless you divert it.' }],
      redFlags: ['Adding consumers when the problem is a single partition.'],
    },
  ],
};

const pubsub: Topic = {
  id: 'pub-sub',
  title: 'Pub/Sub',
  tagline: 'Publish an event once and let any number of independent subscribers react — without the publisher knowing who they are.',
  sceneId: 'pubsub',
  camera: { position: [-1, 16, 21], target: [-1, 0.5, 0] },
  controls: {
    traffic: true,
    failureLabel: 'inventory subscriber',
    hint: 'One OrderPlaced event fans out to three subscriptions. Fail the inventory subscriber: its queue buffers while email and analytics are unaffected.',
  },
  fundamentals: {
    what: '**Publish/subscribe** decouples senders from receivers: **publishers** send messages to a **topic**; the broker delivers a copy to every **subscription**. Subscribers can be push endpoints (HTTP, Lambda) or pull consumers, and may filter by attributes. A common durable pattern is **topic → queue per subscriber** (SNS → SQS) so each subscriber gets its own buffer and retry semantics.',
    why: 'In event-driven systems one business event (OrderPlaced) matters to many services. Calling each synchronously couples the publisher to all of them; adding a new consumer requires changing the publisher. Pub/sub lets services react independently, scale and fail independently, and be added without touching the publisher.',
    where: 'Domain events in microservices, notifications fan-out, cache invalidation broadcasts, real-time updates (WebSocket fan-out), IoT telemetry, integrating SaaS webhooks.',
    how: [
      'The publisher emits an event with a schema (e.g. CloudEvents) to the topic.',
      'The broker stores it durably and creates a delivery per subscription (with optional filter policies).',
      'Push subscriptions receive HTTP/Lambda invocations with retries; pull subscriptions read at their own pace.',
      'With SNS → SQS fan-out, each subscriber’s queue buffers events; a slow or failed subscriber only grows its own backlog.',
      'Subscribers process idempotently (delivery is at-least-once) and use DLQs for poison events.',
      'Schemas are versioned so publishers can evolve events without breaking subscribers.',
    ],
    bottlenecks: [
      { problem: 'Publisher coupled to every downstream consumer', solution: 'Publish once; consumers subscribe independently.' },
      { problem: 'One slow consumer delays all others', solution: 'Per-subscriber queues isolate pace and failures.' },
      { problem: 'Adding a new consumer needs publisher changes', solution: 'Add a subscription — no publisher deploy.' },
      { problem: 'Fan-out to thousands of endpoints', solution: 'Broker handles delivery and retries at scale.' },
    ],
    tradeoffs: [
      { aspect: 'Coupling', gain: 'Publisher unaware of subscribers.', cost: 'Harder to see who depends on an event — needs a catalogue/schema registry.' },
      { aspect: 'Consistency', gain: 'Asynchronous, scalable.', cost: 'Subscribers see changes eventually and possibly out of order.' },
      { aspect: 'Delivery', gain: 'Retries and durability.', cost: 'Duplicates — idempotent subscribers required.' },
      { aspect: 'Debugging', gain: 'Loose coupling.', cost: 'Distributed tracing needed to follow an event across subscribers.' },
    ],
    keyNumbers: [
      { label: 'SNS subscriptions per topic', value: 'up to 12.5M' },
      { label: 'Delivery semantics', value: 'at-least-once' },
      { label: 'Pub/Sub topic retention', value: 'up to 31 days' },
      { label: 'SNS FIFO dedup window', value: '5 min' },
    ],
  },
  cloud: {
    public: {
      summary: 'Amazon SNS (+ SQS fan-out), Amazon EventBridge (event bus with content-based routing and schema registry), Google Cloud Pub/Sub, Azure Event Grid / Service Bus topics.',
      stack: ['Amazon SNS + SQS', 'Amazon EventBridge', 'Google Cloud Pub/Sub', 'Azure Event Grid', 'Azure Service Bus topics'],
      points: [
        'EventBridge rules route events by content and can target many AWS services directly.',
        'SNS filter policies prevent subscribers receiving irrelevant events.',
      ],
    },
    private: {
      summary: 'RabbitMQ fanout/topic exchanges, Kafka topics with multiple consumer groups, NATS subjects, Redis Pub/Sub (non-durable) for ephemeral real-time signals.',
      stack: ['RabbitMQ topic exchanges', 'Kafka consumer groups', 'NATS / JetStream', 'Redis Pub/Sub (ephemeral)'],
      points: [
        'Redis Pub/Sub drops messages for disconnected subscribers — use Streams or Kafka for durability.',
        'Kafka gives pub/sub plus replay via independent consumer groups.',
      ],
    },
    hybrid: {
      summary: 'Event buses bridge environments: on-prem events published to cloud event buses (EventBridge, via Kafka connectors or APIs) let cloud services react without polling on-prem systems.',
      stack: ['Kafka → EventBridge connectors', 'Solace PubSub+ event mesh', 'MirrorMaker'],
      points: [
        'An “event mesh” spans sites so publishers and subscribers can live anywhere.',
        'Keep event contracts versioned across organisational boundaries.',
      ],
    },
  },
  examples: [
    {
      company: 'Netflix',
      headline: 'Keystone event pipeline',
      scale: 'Trillions of events per day',
      detail: 'Netflix’s Keystone pipeline ingests events published by services and routes them to many destinations — data lake, Elasticsearch, real-time stream processing — so producers publish once and consumers subscribe as needed.',
      lesson: 'Centralised event routing lets many teams consume data without coordinating with every producer.',
    },
    {
      company: 'AWS reference architecture',
      headline: 'SNS → SQS fan-out',
      scale: 'Common serverless/event-driven pattern',
      detail: 'Publishing to an SNS topic with an SQS queue per subscribing service gives durable, independently paced fan-out; each service owns its queue, retries and DLQ.',
      lesson: 'Combine pub/sub (fan-out) with queues (buffering) to get both decoupling and resilience.',
    },
  ],
  interview: [
    {
      question: 'What is the difference between a queue and pub/sub?',
      difficulty: 'Junior/Mid',
      answer: [
        'Queue: each message is consumed by one consumer among competitors — work distribution. Pub/sub: each message is delivered to every subscription — event broadcast. Combined: topic fans out to one queue per service, and each service has competing consumers on its queue.',
      ],
      followUps: [{ q: 'How does Kafka fit?', a: 'Within a consumer group it behaves like a queue; across groups it behaves like pub/sub.' }],
      redFlags: ['Treating the two as interchangeable.'],
    },
    {
      question: 'Why use SNS → SQS instead of having SNS push directly to services?',
      difficulty: 'Junior/Mid',
      answer: [
        'Queues give each subscriber durable buffering, its own pace, batch processing, visibility-timeout retries and a DLQ. Direct push depends on the endpoint being available and retries are limited; a down service may lose events after retry exhaustion.',
      ],
      followUps: [{ q: 'When is direct push fine?', a: 'For lightweight, highly available targets (Lambda) or best-effort notifications.' }],
      redFlags: ['No buffering for critical subscribers.'],
    },
    {
      question: 'How do you evolve event schemas without breaking subscribers?',
      difficulty: 'Senior',
      answer: [
        'Use a schema registry and compatibility rules: only add optional fields (backward compatible), never remove or change meanings of fields in place, version events (`OrderPlaced.v2`) for breaking changes and publish both during migration. Consumers ignore unknown fields (tolerant reader). Document ownership and consumers in an event catalogue.',
      ],
      followUps: [{ q: 'Fat events or thin events?', a: 'Fat events carry the state subscribers need (fewer callbacks, more coupling to the shape); thin events carry IDs (subscribers fetch details, more load on the source). Choose per use case.' }],
      redFlags: ['Changing field types in place.'],
    },
    {
      question: 'Subscribers receive events out of order. How do you handle it?',
      difficulty: 'Senior',
      answer: [
        'Include a monotonically increasing version or sequence per entity in each event; subscribers ignore events older than the version they already applied (conditional update). Alternatively use ordered channels (FIFO groups, Kafka partition by key) where per-entity ordering is required, or design commutative updates.',
      ],
      followUps: [{ q: 'What about a delete arriving before the create?', a: 'Keep tombstones with versions so the late create is recognised as stale.' }],
      redFlags: ['Assuming the broker preserves global order.'],
    },
    {
      question: 'Design an event-driven architecture for an e-commerce platform with 30 microservices.',
      difficulty: 'Staff',
      answer: [
        'Define domain events per bounded context (OrderPlaced, PaymentCaptured, ShipmentDispatched) owned by the producing service, published via the outbox pattern to a durable backbone (Kafka or EventBridge). Consumers subscribe via their own consumer groups/queues with DLQs. Use a schema registry with compatibility checks in CI, an event catalogue, and tracing propagation in event headers.',
        'Keep synchronous APIs for queries that need immediate answers; use sagas for multi-step workflows with compensations. Govern with naming conventions, retention policies and ownership, and measure end-to-end latency of key business flows.',
      ],
      followUps: [{ q: 'Choreography vs orchestration?', a: 'Choreography (services react to events) is loosely coupled but hard to follow for long flows; orchestration (a workflow engine) makes complex flows explicit. Mix them.' }],
      redFlags: ['Events without ownership, schemas or observability.'],
    },
  ],
};

const dlq: Topic = {
  id: 'dead-letter-queues',
  title: 'Dead Letter Queues',
  tagline: 'Quarantine messages that keep failing so they stop blocking healthy traffic — then inspect, fix and redrive them.',
  sceneId: 'dlq',
  camera: { position: [0, 16, 21], target: [0, 0.5, 2] },
  controls: {
    traffic: true,
    failureLabel: 'Poison message',
    failureStates: ['INJECTED', 'none'],
    hint: 'Inject a poison message: it is retried 3 times, moved to the DLQ, and an alarm fires — while healthy messages keep flowing.',
  },
  fundamentals: {
    what: 'A **dead-letter queue (DLQ)** receives messages that could not be processed successfully after a configured number of attempts (`maxReceiveCount` in SQS), messages that expired, or that were rejected. It isolates **poison messages** — inputs that will always fail (malformed payload, schema mismatch, a bug triggered by specific data) — from the main flow.',
    why: 'Without a DLQ, a poison message is retried forever: it wastes consumer capacity, floods logs and alerts, and in ordered systems (FIFO queues, Kafka partitions) it **blocks every message behind it**. A DLQ bounds the damage, preserves the failed message for investigation, and lets the system keep processing healthy traffic.',
    where: 'Every production queue or subscription: SQS, SNS subscriptions, EventBridge targets, Lambda async invocations, RabbitMQ (dead-letter exchanges), Kafka consumers (retry and dead-letter topics, implemented in the consumer).',
    how: [
      'Configure a **redrive policy** on the source queue: target DLQ + `maxReceiveCount` (e.g. 3–5).',
      'Consumers process messages; on failure they do not delete the message (or explicitly nack it).',
      'Each redelivery increments the receive count; transient failures usually succeed on retry (with backoff/visibility delay).',
      'After exceeding `maxReceiveCount`, the broker moves the message to the DLQ.',
      '**Alarm** on DLQ depth > 0 (and on age); include the failure reason in logs/attributes.',
      'Investigate, fix the bug or data, then **redrive** messages back to the source queue (SQS supports DLQ redrive natively).',
      'For Kafka: on failure publish to a retry topic (with delay) and eventually to a DLT, then commit the offset so the partition moves on.',
    ],
    bottlenecks: [
      { problem: 'Poison messages retried forever', solution: 'Bounded retries, then quarantine.' },
      { problem: 'One bad record blocks an ordered queue/partition', solution: 'Divert it so subsequent messages proceed.' },
      { problem: 'Failed messages silently dropped', solution: 'DLQ preserves them for analysis and replay.' },
      { problem: 'Alert storms from repeated failures', solution: 'One DLQ alarm instead of endless retry errors.' },
    ],
    tradeoffs: [
      { aspect: 'Ordering', gain: 'Flow continues past a bad message.', cost: 'Later messages are processed before the dead-lettered one — may violate ordering assumptions.' },
      { aspect: 'Retry count', gain: 'Low count isolates poison fast.', cost: 'Too low dead-letters messages that hit only transient errors.' },
      { aspect: 'Operations', gain: 'Failures are visible and recoverable.', cost: 'Someone must own triage and redrive, or the DLQ becomes a graveyard.' },
      { aspect: 'Retention', gain: 'Time to investigate.', cost: 'DLQ retention must exceed the time to notice and fix (SQS max 14 days).' },
    ],
    keyNumbers: [
      { label: 'Typical maxReceiveCount', value: '3–5' },
      { label: 'SQS max retention', value: '14 days' },
      { label: 'Alarm threshold', value: 'DLQ depth > 0' },
      { label: 'Kafka built-in DLQ', value: 'none (consumer pattern)' },
    ],
  },
  cloud: {
    public: {
      summary: 'SQS redrive policies and native DLQ redrive, SNS subscription DLQs, EventBridge target DLQs, Lambda on-failure destinations; Google Pub/Sub dead-letter topics; Azure Service Bus built-in dead-letter subqueues.',
      stack: ['SQS redrive policy + DLQ redrive', 'Lambda destinations', 'EventBridge DLQ', 'Pub/Sub dead-letter topics', 'Service Bus DLQ'],
      points: [
        'Set the DLQ retention longer than the source queue’s.',
        'Lambda async invocations retry twice by default before the on-failure destination.',
      ],
    },
    private: {
      summary: 'RabbitMQ dead-letter exchanges (DLX) with `x-death` headers, Kafka retry/DLT topics (Spring Kafka, Kafka Connect errors.deadletterqueue), ActiveMQ DLQs.',
      stack: ['RabbitMQ DLX', 'Kafka retry & DLT topics', 'Kafka Connect DLQ', 'ActiveMQ DLQ'],
      points: [
        'Use delayed retry topics (5 s, 1 min, 10 min) before the DLT for transient errors.',
        'Store error metadata (exception, stack, attempt count) in headers.',
      ],
    },
    hybrid: {
      summary: 'Integration pipelines between on-prem and cloud are where malformed data often appears (different schema versions, encodings). DLQs at each boundary prevent one bad record from stalling cross-site synchronisation.',
      stack: ['DLQs at integration boundaries', 'Schema validation on ingest', 'Replay tooling'],
      points: [
        'Validate schemas at the edge and dead-letter invalid records immediately.',
      ],
    },
  },
  examples: [
    {
      company: 'Uber',
      headline: 'Reliable reprocessing and dead-letter queues with Kafka',
      scale: 'Engineering blog (2018)',
      detail: 'Uber described building retry topics with increasing delays and dead-letter topics for Kafka consumers, so failing messages are retried without blocking the main topic and eventually parked for manual intervention.',
      lesson: 'Kafka does not provide DLQs natively — build retry tiers and dead-letter topics into consumers.',
    },
    {
      company: 'AWS SQS',
      headline: 'Native DLQ redrive',
      scale: 'Feature launched 2021',
      detail: 'SQS added the ability to redrive messages from a DLQ back to the source queue from the console/API, closing the loop on the “fix then replay” workflow.',
      lesson: 'A DLQ is only half the pattern — you also need a safe way to replay after the fix.',
    },
  ],
  interview: [
    {
      question: 'What is a dead-letter queue and why do you need one?',
      difficulty: 'Junior/Mid',
      answer: [
        'A queue that receives messages that failed processing repeatedly. It stops poison messages from being retried forever, keeps healthy traffic flowing, and preserves failures for investigation and replay.',
      ],
      followUps: [{ q: 'What is a poison message?', a: 'A message that will fail every time regardless of retries — malformed data or one that triggers a bug.' }],
      redFlags: ['“We just log and drop failed messages.”'],
    },
    {
      question: 'How do you choose maxReceiveCount?',
      difficulty: 'Junior/Mid',
      answer: [
        'High enough to ride out transient failures (timeouts, throttling) with backoff — usually 3–5 — low enough to isolate poison messages quickly. Consider processing time × attempts × visibility timeout to estimate how long a poison message occupies the queue.',
      ],
      followUps: [{ q: 'Should transient errors count?', a: 'Ideally classify errors: retry transient ones with backoff; send permanent failures (validation) to the DLQ immediately.' }],
      redFlags: ['maxReceiveCount = 1 with no retry logic.'],
    },
    {
      question: 'How do you implement a DLQ for Kafka?',
      difficulty: 'Senior',
      answer: [
        'In the consumer: on failure, publish the record (with error metadata headers) to a retry topic and commit the original offset so the partition advances. Retry consumers process after a delay (separate topics for 1 min, 10 min…). After the final attempt, publish to a dead-letter topic. Preserve the key to keep per-key ordering where possible, or record that ordering may be broken.',
      ],
      followUps: [{ q: 'What about ordering for that key?', a: 'Later records for the same key may now be processed before the failed one; some systems pause the key (park subsequent records) until the failed one is resolved.' }],
      redFlags: ['Retrying in place forever, blocking the partition.'],
    },
    {
      question: 'Your DLQ suddenly has 50,000 messages. What do you do?',
      difficulty: 'Senior',
      answer: [
        'Treat it as an incident: sample messages and error metadata to find the common cause (bad deploy, schema change, downstream outage, expired credentials). If caused by a downstream outage, the messages are probably fine — redrive after recovery at a controlled rate. If caused by a bug, fix and deploy first, then redrive gradually while monitoring. Check whether ordering or business deadlines require special handling.',
      ],
      followUps: [{ q: 'Why redrive slowly?', a: 'Dumping 50k messages at once can overload consumers and downstream systems, causing a second incident.' }],
      redFlags: ['Purging the DLQ without analysis.'],
    },
    {
      question: 'Design failure handling for a payment-event consumer where every message matters.',
      difficulty: 'Staff',
      answer: [
        'Classify errors: transient (retry with exponential backoff and jitter), permanent data errors (DLQ immediately with reason), and downstream outages (circuit breaker pauses consumption rather than burning retries). Idempotent processing keyed by payment ID makes retries and redrives safe. DLQ alarms page on-call; a runbook and tooling allow inspection, editing (with audit) and controlled redrive.',
        'Track per-message state in a ledger so nothing can be silently lost; reconcile daily against the payment provider. Long retention on the DLQ and an archive of all events allow full replay.',
      ],
      followUps: [{ q: 'Why pause consumption on downstream outages?', a: 'Otherwise every message fails, exhausts retries and floods the DLQ even though the messages are valid.' }],
      redFlags: ['No idempotency for redrives.', 'No reconciliation.'],
    },
  ],
};

export const module6Topics: Topic[] = [queue, kafka, pubsub, dlq];
