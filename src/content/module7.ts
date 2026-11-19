import type { Topic } from '../types';

/* Module 7 — Reliability, Resilience & Observability */

const circuitBreaker: Topic = {
  id: 'circuit-breakers',
  title: 'Circuit Breakers',
  tagline: 'Stop calling a failing dependency, fail fast with a fallback, and probe carefully for recovery — before one slow service takes everything down.',
  sceneId: 'circuit-breaker',
  camera: { position: [-3, 16, 20], target: [-3, 0.5, 1] },
  controls: {
    traffic: true,
    failureLabel: 'Dependency B',
    failureStates: ['HANGING', 'healthy'],
    variants: [
      { id: 'breaker', label: 'With circuit breaker' },
      { id: 'none', label: 'No breaker' },
    ],
    hint: 'Make dependency B hang. Without a breaker, A’s threads pile up and checkout fails; with a breaker, the circuit opens, A falls back instantly and probes B every 30 s.',
  },
  fundamentals: {
    what: 'A **circuit breaker** wraps calls to a remote dependency and tracks failures/timeouts. **Closed**: calls pass through while failures are counted. **Open**: after the failure rate crosses a threshold, calls fail immediately (or return a **fallback**) without touching the dependency. **Half-open**: after a cool-down, a limited number of trial calls test recovery; success closes the circuit, failure reopens it.',
    why: 'In distributed systems a slow dependency is more dangerous than a dead one: callers wait on timeouts, threads and connections pile up, and the caller itself becomes unavailable — a **cascading failure**. Breakers bound that damage, give the struggling dependency room to recover instead of hammering it with retries, and enable graceful degradation.',
    where: 'Service-to-service calls in microservices, calls to third-party APIs (payments, maps, email), database or cache clients, API gateways and service meshes (outlier detection), mobile/web clients calling backends.',
    how: [
      'Wrap each dependency call with a **timeout** (always) and the breaker.',
      'In **closed** state, record outcomes over a sliding window (count- or time-based).',
      'When failure/slow-call rate ≥ threshold (e.g. 50% over ≥ 20 calls), trip to **open**.',
      'While open, return a fallback immediately: cached data, defaults, a degraded feature, or a fast error.',
      'After the wait duration, go **half-open** and allow a few probe calls.',
      'If probes succeed, **close**; otherwise **open** again (often with growing wait).',
      'Combine with **bulkheads** (separate pools per dependency), **retries with budgets** and **load shedding**; emit metrics on state transitions.',
    ],
    bottlenecks: [
      { problem: 'Threads/connections exhausted waiting on a slow dependency', solution: 'Fail fast while open; bounded timeouts.' },
      { problem: 'Retry storms keep a recovering service down', solution: 'Open circuit stops traffic, half-open probes gently.' },
      { problem: 'Non-critical feature failure breaks the whole page', solution: 'Fallbacks provide graceful degradation.' },
      { problem: 'Slow failure detection', solution: 'Sliding-window failure rates react within seconds.' },
    ],
    tradeoffs: [
      { aspect: 'Availability', gain: 'Caller stays healthy during dependency failures.', cost: 'Some requests fail fast that might have succeeded.' },
      { aspect: 'Tuning', gain: 'Configurable thresholds and windows.', cost: 'Poor thresholds cause flapping or late tripping.' },
      { aspect: 'Fallbacks', gain: 'Degraded but working features.', cost: 'Fallback paths are rarely exercised and can themselves be buggy.' },
      { aspect: 'Granularity', gain: 'Per-dependency or per-endpoint isolation.', cost: 'Too coarse trips healthy endpoints; too fine adds overhead.' },
    ],
    keyNumbers: [
      { label: 'Typical failure threshold', value: '50%' },
      { label: 'Minimum calls in window', value: '10–20' },
      { label: 'Open wait duration', value: '5–60 s' },
      { label: 'Half-open probe calls', value: '1–10' },
    ],
  },
  cloud: {
    public: {
      summary: 'Service meshes and proxies implement breaker-like behaviour: Envoy/Istio/App Mesh outlier detection and connection/request limits; API gateways with backend timeouts; SDK-level retries with adaptive modes.',
      stack: ['Envoy outlier detection', 'Istio DestinationRule circuit breaking', 'AWS SDK adaptive retry', 'Resilience4j / Polly in apps'],
      points: [
        'Mesh-level breakers protect without code changes but cannot provide domain fallbacks.',
        'Combine infrastructure limits with application fallbacks.',
      ],
    },
    private: {
      summary: 'Libraries in the application: Resilience4j (Java), Polly (.NET), gobreaker (Go), opossum (Node.js); Netflix Hystrix (now in maintenance) popularised the pattern.',
      stack: ['Resilience4j', 'Polly', 'gobreaker', 'opossum', 'Envoy / Linkerd'],
      points: [
        'Expose breaker state as metrics and alert on prolonged open circuits.',
        'Test fallbacks with fault injection (chaos experiments).',
      ],
    },
    hybrid: {
      summary: 'Calls across the WAN (cloud → on-prem systems) are prime breaker candidates: link degradation or on-prem maintenance should degrade cloud features, not take them down.',
      stack: ['Breakers on cross-site calls', 'Cached fallbacks of on-prem data', 'Async queues instead of sync calls'],
      points: [
        'Prefer asynchronous integration across sites; where sync is needed, add breakers and caches.',
      ],
    },
  },
  examples: [
    {
      company: 'Netflix',
      headline: 'Hystrix and graceful degradation',
      scale: 'Billions of dependency calls per day',
      detail: 'Netflix open-sourced Hystrix in 2012 to isolate calls to dependencies with thread-pool bulkheads, timeouts, circuit breakers and fallbacks (e.g. showing non-personalised rows when the recommendation service fails). It is now in maintenance mode, with Resilience4j and adaptive concurrency limits as successors.',
      lesson: 'Design every dependency call with a timeout, isolation and a fallback — degraded beats down.',
    },
    {
      company: 'Release It!',
      headline: 'Where the pattern was named',
      scale: 'Michael Nygard, 2007',
      detail: 'Nygard’s book “Release It!” described the circuit breaker, bulkhead and timeout stability patterns based on production failures where integration points caused cascading outages.',
      lesson: 'Integration points are the number-one killer of systems; protect every one.',
    },
  ],
  interview: [
    {
      question: 'Explain the three states of a circuit breaker.',
      difficulty: 'Junior/Mid',
      answer: [
        'Closed: calls pass, failures counted. Open: threshold exceeded, calls fail fast/fallback without hitting the dependency. Half-open: after a timeout, a few trial calls; success → closed, failure → open.',
      ],
      followUps: [{ q: 'Why not just use timeouts?', a: 'Timeouts bound each call but still send every request to the failing service and make every user wait the full timeout.' }],
      redFlags: ['Confusing circuit breakers with retries.'],
    },
    {
      question: 'What makes a good fallback?',
      difficulty: 'Junior/Mid',
      answer: [
        'Something that keeps the user journey working: cached or default data (popular items instead of personalised), hiding a non-essential widget, queueing the request for later, or a clear fast error for critical paths. The fallback must be cheap and must not depend on the same failing system.',
      ],
      followUps: [{ q: 'When is there no acceptable fallback?', a: 'For critical operations like charging a card — fail fast with a clear error and retry later.' }],
      redFlags: ['A fallback that calls another overloaded dependency.'],
    },
    {
      question: 'How do circuit breakers, retries and timeouts interact? What can go wrong?',
      difficulty: 'Senior',
      answer: [
        'Order: timeout per attempt → limited retries with exponential backoff and jitter → breaker around the whole thing. Pitfalls: retries at every layer multiply load (3 layers × 3 retries = 27 calls); retry timeouts exceeding the caller’s timeout; breakers counting retries as separate failures and tripping too eagerly; or breakers not counting timeouts as failures.',
        'Use retry budgets (e.g. retries ≤ 10% of traffic), retry only idempotent operations, and keep total time within the upstream deadline (deadline propagation).',
      ],
      followUps: [{ q: 'What is a retry storm?', a: 'Synchronised retries from many clients amplify load on a struggling service, preventing recovery.' }],
      redFlags: ['Unlimited retries without jitter.'],
    },
    {
      question: 'What is the bulkhead pattern and how does it complement circuit breakers?',
      difficulty: 'Senior',
      answer: [
        'Bulkheads partition resources (thread pools, connection pools, concurrency limits) per dependency or per workload, so one slow dependency can only exhaust its own compartment. Breakers decide when to stop calling; bulkheads limit how much damage occurs before the breaker trips.',
      ],
      followUps: [{ q: 'Example?', a: 'Separate HTTP client pools for payments and recommendations; recommendation slowness cannot starve payment calls.' }],
      redFlags: ['One shared pool for all outbound calls.'],
    },
    {
      question: 'Design resilience for a checkout service with 8 downstream dependencies of varying criticality.',
      difficulty: 'Staff',
      answer: [
        'Classify dependencies: critical (payment, inventory, pricing) vs. optional (recommendations, reviews, loyalty points display). Optional ones get aggressive timeouts, breakers and fallbacks (hide or cache). Critical ones get bulkheads, idempotent retries with budgets, breakers that fail fast with clear errors, and async alternatives where possible (queue loyalty points accrual).',
        'Set a total latency budget with deadline propagation; parallelise independent calls. Validate with fault-injection tests and game days, and monitor breaker states, fallback rates and SLOs per dependency.',
      ],
      followUps: [{ q: 'How do you test fallbacks?', a: 'Chaos experiments that inject latency/errors per dependency in staging and carefully in production.' }],
      redFlags: ['Same timeout and handling for every dependency.'],
    },
  ],
};

const tokenBucket: Topic = {
  id: 'token-bucket',
  title: 'Token Bucket Rate Limiting',
  tagline: 'Allow bursts up to the bucket size, enforce a steady average rate, and reject the rest — protecting services and sharing capacity fairly.',
  sceneId: 'token-bucket',
  camera: { position: [0, 11, 21], target: [0, 1.2, -0.5] },
  controls: {
    traffic: true,
    failureLabel: 'Traffic burst ×3',
    failureStates: ['BURST', 'steady'],
    hint: 'Watch tokens (gold) drip in at 4/s and get consumed by requests. Raise the traffic rate or trigger a burst: the bucket drains and the excess bounces back as 429s. The live counters show accepted vs. rejected.',
  },
  fundamentals: {
    what: 'A **token bucket** holds up to **capacity** tokens and is refilled at a fixed **rate** (tokens per second). Each request consumes one token (or a cost); if no token is available the request is **rejected** (HTTP 429) or delayed. Capacity defines the maximum **burst**; refill rate defines the sustained **average** rate. Related algorithms: **leaky bucket** (constant outflow), **fixed window** and **sliding window** counters.',
    why: 'Services have finite capacity and clients are not always well-behaved. Rate limiting protects backends from overload and abuse, enforces fairness and quotas between tenants (and pricing tiers), controls cost of expensive operations, and keeps latency stable for everyone. The token bucket is popular because it allows natural short bursts while enforcing long-term limits, and needs only two numbers of state per key.',
    where: 'Public APIs (per API key/user/IP), API gateways, login endpoints (brute-force protection), outbound calls to rate-limited third parties, background job throttling, network traffic shaping.',
    how: [
      'State per key: `tokens` and `last_refill_timestamp` (no timer needed — refill lazily).',
      'On request: `tokens = min(capacity, tokens + (now − last) × rate)`; `last = now`.',
      'If `tokens ≥ cost`: subtract and **allow**; else **reject** with `429` and `Retry-After` (time until enough tokens).',
      'In a distributed system, keep state in a shared store (Redis with an atomic Lua script) or use local buckets per node (limit ÷ N) for approximate, faster limiting.',
      'Return `RateLimit-*` headers so clients can back off proactively.',
      'Layer limits: per IP at the edge, per API key at the gateway, per tenant per endpoint, plus global concurrency limits/load shedding.',
    ],
    bottlenecks: [
      { problem: 'One client floods the service', solution: 'Per-client buckets cap their rate.' },
      { problem: 'Legitimate bursts rejected by strict per-second limits', solution: 'Bucket capacity allows bursts while bounding the average.' },
      { problem: 'Overload during traffic spikes', solution: 'Excess requests rejected cheaply before reaching the backend.' },
      { problem: 'Fair sharing across tenants/tiers', solution: 'Different capacity/rate per plan.' },
    ],
    tradeoffs: [
      { aspect: 'Accuracy vs. latency', gain: 'Central Redis state is accurate.', cost: 'Adds a network hop per request; local buckets are faster but approximate.' },
      { aspect: 'Burst size', gain: 'Large capacity tolerates bursty clients.', cost: 'Large bursts can still overload the backend momentarily.' },
      { aspect: 'Algorithm', gain: 'Token bucket: bursts + average.', cost: 'Fixed windows are simpler but allow 2× bursts at window edges; sliding logs are accurate but memory-heavy.' },
      { aspect: 'Failure mode', gain: 'Fail-open keeps service up if limiter store fails.', cost: 'Fail-open removes protection; fail-closed blocks everyone.' },
    ],
    keyNumbers: [
      { label: 'Scene: capacity / refill', value: '10 / 4 per s' },
      { label: 'Rate-limit status', value: 'HTTP 429' },
      { label: 'GitHub REST (authenticated)', value: '5,000 req/hour' },
      { label: 'State per key', value: '2 numbers' },
    ],
  },
  cloud: {
    public: {
      summary: 'Amazon API Gateway throttling (token bucket: rate + burst per account/stage/method/usage plan), AWS WAF rate-based rules, Cloudflare rate limiting, Google Cloud Armor, Azure API Management rate-limit policies.',
      stack: ['API Gateway throttling + usage plans', 'AWS WAF rate-based rules', 'Cloudflare Rate Limiting', 'Cloud Armor', 'Azure APIM'],
      points: [
        'Edge (WAF/CDN) limits stop abusive traffic before it reaches your region.',
        'Usage plans map API keys to quotas for different customer tiers.',
      ],
    },
    private: {
      summary: 'Gateway and proxy rate limiters (NGINX `limit_req` — leaky bucket, Envoy local and global rate limit service, Kong plugins) and application libraries (Bucket4j, Guava RateLimiter, golang.org/x/time/rate).',
      stack: ['NGINX limit_req', 'Envoy global rate limit service', 'Kong rate-limiting', 'Bucket4j', 'Redis + Lua'],
      points: [
        'Envoy supports both local (per instance) and global (Redis-backed service) limits.',
        'Choose fail-open or fail-closed explicitly per endpoint.',
      ],
    },
    hybrid: {
      summary: 'Apply limits at every trust boundary: at the cloud edge for public traffic and on calls into on-prem systems whose capacity is fixed and cannot auto-scale.',
      stack: ['Outbound limiters toward on-prem', 'Gateway quotas', 'Queue-based smoothing'],
      points: [
        'Fixed-capacity on-prem backends especially need protection from elastic cloud callers.',
      ],
    },
  },
  examples: [
    {
      company: 'Stripe',
      headline: 'Four layers of rate limiting and load shedding',
      scale: 'Public API for millions of businesses',
      detail: 'Stripe described a request rate limiter (token bucket per user in Redis), a concurrent-request limiter, and two load shedders (fleet usage and worker utilisation) that drop lower-priority traffic first when the system is stressed.',
      lesson: 'Rate limiting (per-client fairness) and load shedding (system protection) are complementary.',
    },
    {
      company: 'Shopify',
      headline: 'Leaky bucket and query cost limits',
      scale: 'APIs used by millions of merchants’ apps',
      detail: 'Shopify’s Admin APIs use a leaky-bucket model, and its GraphQL API limits by calculated query cost rather than request count, so expensive queries consume more of the budget.',
      lesson: 'Limit by cost, not just by request count, when request costs vary widely.',
    },
  ],
  interview: [
    {
      question: 'Explain the token bucket algorithm.',
      difficulty: 'Junior/Mid',
      answer: [
        'A bucket holds up to C tokens and refills at R tokens/second. Each request takes a token; if none are available the request is rejected or delayed. C sets the burst size, R the sustained average rate. Implementation stores tokens and last refill time and refills lazily on each request.',
      ],
      followUps: [{ q: 'Token bucket vs. leaky bucket?', a: 'Token bucket allows bursts up to capacity; leaky bucket enforces a smooth constant output rate (queueing or dropping excess).' }],
      redFlags: ['Using a timer thread per key to add tokens.'],
    },
    {
      question: 'What is wrong with a fixed-window counter?',
      difficulty: 'Junior/Mid',
      answer: [
        'With “100 requests per minute” windows, a client can send 100 at 12:00:59 and 100 at 12:01:00 — 200 in two seconds. Sliding window counters (weighted previous + current window) or token buckets smooth this.',
      ],
      followUps: [{ q: 'What is a sliding log?', a: 'Store timestamps of each request and count those within the window — exact but memory-hungry.' }],
      redFlags: ['Not knowing the boundary-burst problem.'],
    },
    {
      question: 'Design a distributed rate limiter for an API gateway fleet of 50 nodes.',
      difficulty: 'Senior',
      answer: [
        'Shared state in Redis Cluster keyed by client ID; an atomic Lua script performs refill + consume and returns allow/deny and remaining tokens. Place Redis in the same region/AZs; set tight timeouts; fail open with a local fallback limiter if Redis is unavailable. For extreme throughput, use local token leases (each node fetches batches of tokens) to reduce round trips at some accuracy cost.',
        'Return 429 + Retry-After + RateLimit headers; log and meter rejections per client.',
      ],
      followUps: [{ q: 'Why not divide the limit by 50 and keep it local?', a: 'Load across nodes is rarely even, so clients get inconsistent limits; acceptable only when approximate limits suffice.' }],
      redFlags: ['Non-atomic read-then-write against Redis.'],
    },
    {
      question: 'How do rate limiting and load shedding differ?',
      difficulty: 'Senior',
      answer: [
        'Rate limiting enforces per-client policy regardless of system health (fairness, quotas). Load shedding protects the system based on its current health (CPU, concurrency, queue length), dropping lower-priority work when overloaded even if clients are within quota. You need both.',
      ],
      followUps: [{ q: 'How do you prioritise during shedding?', a: 'Tag requests by criticality (e.g. checkout > browsing > analytics) and shed lowest first.' }],
      redFlags: ['Assuming rate limits alone prevent overload.'],
    },
    {
      question: 'Design multi-tier quotas for a SaaS API (free, pro, enterprise) including per-endpoint costs and monthly quotas.',
      difficulty: 'Staff',
      answer: [
        'Short-term limits: token bucket per API key per tier (capacity/rate from plan), with endpoint cost weights (search costs 5 tokens, read 1). Long-term quotas: monthly counters (approximate, aggregated asynchronously from usage events) with soft warnings and hard caps. Enterprise gets dedicated limits or reserved capacity.',
        'Store plan configuration centrally, cache it at gateways, and emit usage events to billing. Provide clear headers, dashboards and upgrade paths. Edge-level IP limits protect against unauthenticated abuse.',
      ],
      followUps: [{ q: 'Should monthly quotas be exact?', a: 'Usually near-exact is fine; reconcile with billing data and avoid synchronous global counters on every request.' }],
      redFlags: ['One global limit for all customers.'],
    },
  ],
};

const multiRegion: Topic = {
  id: 'multi-region-failover',
  title: 'Active-Active vs. Active-Passive Multi-Region',
  tagline: 'Survive the loss of an entire region — by serving from several at once, or by keeping a standby ready to take over.',
  sceneId: 'multi-region',
  camera: { position: [-2, 19, 22], target: [-2, 0.5, 0] },
  controls: {
    traffic: true,
    failureLabel: 'us-east-1 region',
    variants: [
      { id: 'aa', label: 'Active-active' },
      { id: 'ap', label: 'Active-passive' },
    ],
    hint: 'Compare active-active and active-passive, then fail us-east-1 in each mode. Watch traffic reroute and compare RTO and RPO in the telemetry.',
  },
  fundamentals: {
    what: '**Multi-region** architectures deploy a system in two or more geographic regions. **Active-passive**: one region serves all traffic while a standby region receives replicated data and is promoted on failure (variants: backup-restore, pilot light, warm standby, hot standby). **Active-active**: multiple regions serve traffic simultaneously, each able to take over the others’ load, with data replicated between them (often multi-writer).',
    why: 'Regions can fail or degrade (power, networking, control-plane bugs, large-scale provider events). For businesses whose downtime costs are high, single-region designs are a single point of failure. Multi-region also reduces latency for global users (active-active) and can satisfy data-residency needs.',
    where: 'Tier-0 consumer services (streaming, payments, messaging), global SaaS, regulated systems with strict RTO/RPO. Many systems choose active-passive for simplicity; active-active is chosen when latency or near-zero RTO justifies the data complexity.',
    how: [
      'Define targets: **RTO** (how fast to recover) and **RPO** (how much data loss is acceptable).',
      'Deploy identical stacks per region via infrastructure as code; keep configuration and secrets in sync.',
      '**Data**: active-passive uses one-way async replication (e.g. Aurora Global Database, cross-region replicas); active-active uses multi-writer stores (DynamoDB global tables, Spanner, Cassandra) or partitions users by home region.',
      '**Routing**: DNS (latency/failover records with health checks) or anycast front doors steer users; in active-active, users go to the nearest healthy region.',
      'On failure, health checks or an operator **evacuate** the region: traffic shifts; in active-passive the standby DB is promoted and the app tier scaled up.',
      'Practise regularly: game days and region-evacuation drills; verify capacity headroom in surviving regions.',
      'Fail back carefully after recovery, resynchronising data first.',
    ],
    bottlenecks: [
      { problem: 'Single region is a single point of failure', solution: 'A second region can take over.' },
      { problem: 'High latency for far-away users', solution: 'Active-active serves users from the nearest region.' },
      { problem: 'Slow manual disaster recovery', solution: 'Automated health-checked failover, practised regularly.' },
      { problem: 'Data loss on regional disaster', solution: 'Continuous cross-region replication bounds RPO.' },
    ],
    tradeoffs: [
      { aspect: 'RTO', gain: 'Active-active: seconds to a minute (just reroute).', cost: 'Active-passive: minutes to hours (promotion, scaling, DNS).' },
      { aspect: 'Data complexity', gain: 'Active-passive: single writer, no conflicts.', cost: 'Active-active: conflict resolution, idempotency, ordering across regions.' },
      { aspect: 'Cost', gain: 'Active-passive (pilot light/warm): cheaper standby.', cost: 'Active-active: ~2× capacity (each region must absorb the other’s load).' },
      { aspect: 'Confidence', gain: 'Active-active: failover path exercised daily.', cost: 'Active-passive: standby rots unless drilled.' },
    ],
    keyNumbers: [
      { label: 'Cross-region async lag', value: '~sub-second–seconds' },
      { label: 'Aurora Global DB lag (typ.)', value: '< 1 s' },
      { label: 'Active-active headroom', value: '≥ 50% per region (2 regions)' },
      { label: 'DNS failover', value: 'health check + TTL' },
    ],
  },
  cloud: {
    public: {
      summary: 'Building blocks: Route 53 health checks and failover/latency records, Global Accelerator, Route 53 Application Recovery Controller (routing controls, readiness checks), Aurora Global Database, DynamoDB global tables, S3 cross-region replication; GCP global load balancing and Spanner multi-region; Azure Front Door and Cosmos DB multi-region writes.',
      stack: ['Route 53 / Global Accelerator', 'Route 53 ARC', 'Aurora Global Database', 'DynamoDB global tables', 'Spanner / Cosmos DB'],
      points: [
        'Avoid depending on control-plane operations of the failed region during failover (static stability).',
        'Use routing controls you can flip even when a region’s APIs are impaired.',
      ],
    },
    private: {
      summary: 'Two or more owned data centres with storage/database replication (Oracle Data Guard, SQL Server AGs, Postgres streaming), global server load balancing (F5 GTM, NS1) and stretched or replicated application stacks.',
      stack: ['Oracle Data Guard', 'SQL Server Always On', 'F5 BIG-IP DNS (GSLB)', 'Storage array replication'],
      points: [
        'A second owned data centre is expensive — often the reason enterprises use the cloud as DR.',
        'Synchronous replication needs sites within ~100 km for acceptable latency.',
      ],
    },
    hybrid: {
      summary: 'Hybrid DR: on-prem primary with the cloud as warm-standby or pilot-light region (AWS Elastic Disaster Recovery, Azure Site Recovery), or active-active across an on-prem site and a cloud region with global load balancing.',
      stack: ['AWS Elastic Disaster Recovery', 'Azure Site Recovery', 'VMware Cloud DR', 'GSLB across sites'],
      points: [
        'Cloud DR turns a second data centre’s capex into mostly-idle opex.',
        'Test failover end-to-end, including identity, DNS and network dependencies.',
      ],
    },
  },
  examples: [
    {
      company: 'Netflix',
      headline: 'Active-active across AWS regions with regular evacuations',
      scale: 'Global streaming across multiple AWS regions',
      detail: 'Netflix runs active-active in several AWS regions with Zuul edge routing and Cassandra replication, and regularly practises region evacuations (Chaos Kong) to shift all traffic out of a region within minutes.',
      lesson: 'Failover you exercise regularly works; failover you have never tried usually does not.',
    },
    {
      company: 'AWS us-east-1',
      headline: 'Regional events happen',
      scale: 'e.g. December 2021 and October 2025 incidents',
      detail: 'Large us-east-1 incidents (such as the December 2021 internal-network event and the October 2025 DynamoDB DNS issue) affected many services that depended on a single region — and some that relied on that region’s control plane even when running elsewhere.',
      lesson: 'Single-region architectures inherit regional risk; also audit hidden dependencies on one region’s global services.',
    },
  ],
  interview: [
    {
      question: 'What is the difference between active-active and active-passive?',
      difficulty: 'Junior/Mid',
      answer: [
        'Active-passive: one region serves traffic; another holds replicated data and takes over on failure. Simpler, cheaper, slower recovery. Active-active: all regions serve traffic and can absorb each other’s load; faster failover and lower latency but complex data replication and higher cost.',
      ],
      followUps: [{ q: 'What are RTO and RPO?', a: 'RTO: maximum acceptable downtime. RPO: maximum acceptable data loss measured in time.' }],
      redFlags: ['Not mentioning data replication challenges.'],
    },
    {
      question: 'Describe the DR strategies from cheapest to most expensive.',
      difficulty: 'Junior/Mid',
      answer: [
        'Backup & restore (hours RTO, backups in another region) → pilot light (core data replicated, minimal infrastructure, scale up on failover) → warm standby (scaled-down full stack running) → multi-site active-active (full capacity everywhere, near-zero RTO). Cost and complexity increase as RTO/RPO shrink.',
      ],
      followUps: [{ q: 'How do you pick one?', a: 'From business impact: cost of downtime and data loss versus cost of the strategy.' }],
      redFlags: ['Choosing active-active by default for every system.'],
    },
    {
      question: 'What are the hardest problems in active-active, and how do you solve them?',
      difficulty: 'Senior',
      answer: [
        'Data: concurrent writes to the same item in two regions → conflicts. Solutions: route each user/entity to a home region (single writer per entity), use last-writer-wins where acceptable, CRDTs, or globally consistent databases with higher latency. Also: globally unique IDs, idempotency across regions, cache invalidation per region, and capacity headroom so one region can carry all traffic.',
      ],
      followUps: [{ q: 'Why is capacity headroom critical?', a: 'If each region runs at 80%, losing one sends 160% load to the survivor — failover causes a second outage.' }],
      redFlags: ['Ignoring write conflicts.'],
    },
    {
      question: 'Your active-passive failover took 3 hours instead of the planned 15 minutes. What probably went wrong?',
      difficulty: 'Senior',
      answer: [
        'Typical causes: never-tested runbooks, configuration drift in the standby, missing secrets/certificates, hidden dependencies on the failed region (IAM, DNS changes, CI/CD, monitoring), insufficient capacity or quotas in the standby region, manual decision delays, and DNS TTLs/caching. Database promotion and data verification can also take longer than expected.',
        'Fix with automation, regular drills, readiness checks, infrastructure as code for both regions and static stability (failover without control-plane dependencies).',
      ],
      followUps: [{ q: 'What is a readiness check?', a: 'Continuously verifying the standby has matching capacity, quotas, config and data freshness.' }],
      redFlags: ['Blaming only DNS.'],
    },
    {
      question: 'Design a multi-region architecture for a payments platform requiring RPO = 0 and RTO < 1 minute.',
      difficulty: 'Staff',
      answer: [
        'RPO = 0 requires synchronous replication of committed transactions across regions — e.g. a consensus-based database (Spanner, CockroachDB, Aurora DSQL-style) with replicas in ≥3 regions (majority quorum survives one region loss), accepting higher write latency. Alternatively, accept a tiny RPO for non-ledger data and keep only the ledger on the synchronous store.',
        'Stateless services active-active in all regions behind anycast/global load balancing with health-based routing; idempotency keys for all payment operations so client retries during failover are safe. Regular region-evacuation drills, capacity headroom, and dependency audits (HSMs, third-party payment networks reachable from each region).',
      ],
      followUps: [{ q: 'Why three regions and not two?', a: 'A two-region quorum cannot survive losing one region without risking split-brain; a third region (or witness) provides the majority.' }],
      redFlags: ['Claiming RPO = 0 with asynchronous replication.'],
    },
  ],
};

export const module7Topics: Topic[] = [circuitBreaker, tokenBucket, multiRegion];
