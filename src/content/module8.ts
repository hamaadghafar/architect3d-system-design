import type { Topic } from '../types';

/* Module 8 — End-to-End Real-World Architectures */

const urlShortener: Topic = {
  id: 'url-shortener',
  title: 'Design a URL Shortener',
  tagline: 'A deceptively simple system that exercises ID generation, read-heavy caching, sharded key-value storage and asynchronous analytics.',
  sceneId: 'url-shortener',
  camera: { position: [-3, 18, 22], target: [-3, 0.5, 0] },
  controls: {
    traffic: true,
    cache: true,
    failureLabel: 'Redis cache',
    variants: [
      { id: 'redirect', label: 'Redirect (read)' },
      { id: 'create', label: 'Create (write)' },
    ],
    hint: 'Redirect mode: toggle the cache HIT/MISS and fail Redis to see every redirect hit the KV store. Create mode: watch the ID generator → KV store → cache-warming write path.',
  },
  fundamentals: {
    what: 'A URL shortener (bit.ly, t.co, tinyurl) maps a short code (`sho.rt/x7Kp2Q`) to a long URL and redirects clients with HTTP **301/302**. Core requirements: create short links, redirect with very low latency and very high availability, optional custom aliases, expiry and click analytics.',
    why: 'It is the classic warm-up design question because it touches capacity estimation, unique ID generation, encoding, data modelling, caching of a skewed read workload, scaling a key-value store, and analytics pipelines — all in a small, well-understood domain.',
    where: 'Social platforms (link wrapping for safety and analytics), marketing campaigns, QR codes, SMS (character limits), and internal deep-link services.',
    how: [
      '**Estimate**: e.g. 100M new links/month (~40/s writes), 100:1 reads → ~4,000 redirects/s average, ~20k/s peak; 500 bytes/link × 6B links over 5 years ≈ 3 TB.',
      '**Code space**: base62 with 7 characters = 62⁷ ≈ 3.5 trillion codes — plenty.',
      '**ID generation**: each API node leases a block of numeric IDs from a central counter (DB sequence, ZooKeeper, or a Snowflake-style generator) and base62-encodes them — no collisions, no read-before-write. (Hashing the URL + collision checks is the alternative.)',
      '**Create**: validate URL (and scan for abuse), get ID → code, store `code → {long_url, owner, created, expiry}` in a KV store, optionally warm the cache, return the short URL.',
      '**Redirect**: `GET /code` → cache (Redis) → on miss KV store → return 301 (cacheable by browsers/CDN, fewer analytics) or 302 (every click observed).',
      '**Analytics**: emit click events asynchronously to Kafka; aggregate into counts by code/time/geo in a separate store.',
      '**Scale**: stateless API behind LB/CDN; KV store sharded by code; cache sized for the hot set (a small fraction of links gets most clicks).',
    ],
    bottlenecks: [
      { problem: 'Read-heavy, skewed traffic', solution: 'Redis cache (and CDN caching of redirects) absorbs hot links.' },
      { problem: 'Unique short codes at scale', solution: 'Range-leased counters + base62 encoding — no coordination per request.' },
      { problem: 'Billions of rows', solution: 'Horizontally scalable KV store sharded by code.' },
      { problem: 'Analytics slowing redirects', solution: 'Asynchronous click events via a stream.' },
    ],
    tradeoffs: [
      { aspect: '301 vs. 302', gain: '301: browsers/CDN cache, less load.', cost: 'Lose per-click analytics and cannot change the target easily; 302 keeps control.' },
      { aspect: 'Counter vs. hash IDs', gain: 'Counters: short, collision-free.', cost: 'Sequential codes are guessable (enumeration); add shuffling/encryption if needed.' },
      { aspect: 'Storage', gain: 'KV store: simple, scalable.', cost: 'Ad-hoc queries (all links by user) need secondary indexes.' },
      { aspect: 'Custom aliases', gain: 'User-friendly links.', cost: 'Need uniqueness checks and abuse/profanity filtering.' },
    ],
    keyNumbers: [
      { label: '62⁷ codes', value: '≈ 3.5 × 10¹²' },
      { label: 'Read : write', value: '~100 : 1' },
      { label: 'Redirect latency target', value: '< 10 ms (server)' },
      { label: '5-year storage (example)', value: '~3 TB' },
    ],
  },
  cloud: {
    public: {
      summary: 'Serverless-friendly: API Gateway/ALB + Lambda or containers, DynamoDB (code as partition key) with DAX or ElastiCache, CloudFront in front of redirects, Kinesis/Kafka → analytics (Athena/ClickHouse).',
      stack: ['CloudFront', 'API Gateway / ALB', 'DynamoDB + DAX', 'ElastiCache', 'Kinesis / MSK'],
      points: [
        'DynamoDB conditional writes enforce uniqueness of custom aliases.',
        'Global tables + edge caching give low-latency redirects worldwide.',
      ],
    },
    private: {
      summary: 'Stateless app servers behind NGINX/HAProxy, Cassandra or sharded MySQL for codes, Redis for caching, Kafka + ClickHouse for analytics, ZooKeeper/etcd for ID ranges.',
      stack: ['NGINX / HAProxy', 'Cassandra / Vitess', 'Redis', 'Kafka + ClickHouse', 'ZooKeeper'],
      points: [
        'Range leasing from ZooKeeper avoids a hot central counter.',
      ],
    },
    hybrid: {
      summary: 'Redirect serving at the edge/cloud for global latency, with link management and analytics possibly in a private environment for data-ownership reasons; CDN edge workers can even serve redirects from replicated KV stores.',
      stack: ['Edge KV (Workers KV / CloudFront KeyValueStore)', 'Async replication to edge', 'On-prem analytics'],
      points: [
        'Edge redirect serving removes the origin from the hot path entirely.',
      ],
    },
  },
  examples: [
    {
      company: 'Twitter / X (t.co)',
      headline: 'Wrapping every link',
      scale: 'Every link posted on the platform',
      detail: 'Twitter wraps links in t.co short URLs to measure clicks and to check destinations against lists of malicious sites before redirecting users.',
      lesson: 'Shorteners are also a security and analytics choke point — abuse detection belongs in the design.',
    },
    {
      company: 'Bitly',
      headline: 'Links as a product',
      scale: 'Billions of clicks per month',
      detail: 'Bitly built a business on short links with branded domains, analytics dashboards and link management — illustrating how the redirect path must stay fast while the analytics path does heavy lifting asynchronously.',
      lesson: 'Separate the latency-critical path from the data-heavy path.',
    },
  ],
  interview: [
    {
      question: 'Estimate the scale for a URL shortener with 100M new URLs per month.',
      difficulty: 'Junior/Mid',
      answer: [
        'Writes: 100M / (30×86,400) ≈ 40/s average; peak ~5× → 200/s. Reads at 100:1 → ~4,000/s average, ~20,000/s peak. Storage: 100M × 12 months × 5 years = 6B links × ~500 B ≈ 3 TB. Code length: 62⁷ ≈ 3.5T > 6B, so 7 base62 characters suffice.',
      ],
      followUps: [{ q: 'How much cache memory for the hot 20% of daily reads?', a: 'If ~350M redirects/day touch ~10M distinct links, caching the hot 20% (2M × 500 B) is ~1 GB — tiny.' }],
      redFlags: ['Skipping estimation entirely.'],
    },
    {
      question: 'How do you generate unique short codes?',
      difficulty: 'Junior/Mid',
      answer: [
        'Options: (1) counter-based IDs with base62 encoding — nodes lease ranges (e.g. 1M IDs) from a central store, so no collisions and no coordination per request; (2) hash the URL (MD5/SHA) and take 7 chars — needs collision handling and duplicates per URL; (3) random codes with uniqueness checks via conditional writes. I prefer range-leased counters, optionally shuffled to avoid guessable sequences.',
      ],
      followUps: [{ q: 'What happens if a node crashes with an unused range?', a: 'Those IDs are skipped — harmless given the huge code space.' }],
      redFlags: ['Single global auto-increment hit on every request.'],
    },
    {
      question: '301 or 302 redirect — which and why?',
      difficulty: 'Senior',
      answer: [
        '301 (permanent) lets browsers and CDNs cache the redirect, cutting load and latency, but you lose visibility of repeat clicks and cannot reliably change or disable the target. 302/307 (temporary) sends every click through your service — better analytics, editable links, abuse takedown — at higher load. Most commercial shorteners use 302 or 301 with short cache headers.',
      ],
      followUps: [{ q: 'How do you still reduce load with 302?', a: 'Cache code → URL at the edge/CDN worker level and log clicks asynchronously from the edge.' }],
      redFlags: ['Not knowing the analytics implication.'],
    },
    {
      question: 'How do you prevent abuse (phishing, malware, spam)?',
      difficulty: 'Senior',
      answer: [
        'Check destinations against threat intelligence (e.g. Safe Browsing lists) on create and periodically after; rate-limit creation per user/IP; require accounts for bulk creation; scan for patterns; allow fast takedown (302 makes disabling immediate); show interstitial warnings for suspicious links; monitor click anomalies.',
      ],
      followUps: [{ q: 'Why re-scan existing links?', a: 'Destinations can turn malicious after creation.' }],
      redFlags: ['No abuse considerations for a public shortener.'],
    },
    {
      question: 'Extend the design to serve 1M redirects/s globally with p99 < 50 ms end-to-end.',
      difficulty: 'Staff',
      answer: [
        'Push redirects to the edge: CDN/edge workers with a replicated edge KV of hot codes (or the full dataset if small enough), falling back to regional origin clusters (multi-region active-active, DynamoDB global tables or Cassandra multi-DC) with Redis caches. Anycast/latency routing to the nearest region. Clicks logged at the edge and shipped in batches to the analytics pipeline.',
        'Creation goes to a primary write path that assigns IDs per region (region-prefixed ranges to avoid cross-region coordination) and replicates out; edge caches pick up new codes on miss. Capacity-plan for celebrity links (hot keys) by caching at every layer.',
      ],
      followUps: [{ q: 'What about link edits/deletes?', a: 'Short edge TTLs plus purge events from the write path.' }],
      redFlags: ['All traffic to a single region.'],
    },
  ],
};

const videoStreaming: Topic = {
  id: 'video-streaming',
  title: 'Design a Video Streaming Platform (Netflix)',
  tagline: 'Ingest and encode once into many renditions, then deliver adaptively from caches as close to viewers as possible.',
  sceneId: 'video-streaming',
  camera: { position: [-2, 18, 23], target: [-2, 0.5, 0] },
  controls: {
    traffic: true,
    cache: true,
    cacheLabels: { label: 'Edge cache', on: 'HIT', off: 'MISS' },
    failureLabel: 'Encoder / cache node',
    variants: [
      { id: 'upload', label: 'Upload & encode' },
      { id: 'playback', label: 'Playback' },
    ],
    hint: 'Upload mode: watch chunks fan out to the encoder fleet, then fail an encoder (a reclaimed Spot instance). Playback mode: toggle the edge cache and fail cache 1 to see steering move viewers.',
  },
  fundamentals: {
    what: 'A video-on-demand platform has two planes. The **control plane** (in the cloud) handles catalogue, accounts, recommendations, playback authorisation, DRM licences and **steering** (choosing which cache serves each viewer). The **data plane** delivers video bytes: masters are **encoded** into an adaptive bitrate ladder (multiple resolutions, bitrates and codecs), packaged as small **segments** (HLS/DASH), and served from **CDN caches** close to viewers.',
    why: 'Video dominates Internet traffic. Serving it from a central origin would be impossibly expensive and slow; quality must adapt to each viewer’s fluctuating bandwidth; and encoding is compute-heavy. The architecture optimises for bandwidth cost, startup time, rebuffering and encoding throughput.',
    where: 'VOD services (Netflix, Prime Video, Disney+), user-generated video (YouTube), e-learning, live streaming (with additional real-time constraints).',
    how: [
      '**Ingest**: creators upload masters directly to object storage via presigned multipart (resumable) uploads.',
      '**Encode**: split the video into chunks; a queue distributes chunk × rendition jobs to an elastic (often Spot) encoder fleet; outputs: bitrate ladder (240p→4K) in H.264/HEVC/AV1, audio tracks, subtitles.',
      '**Package & protect**: HLS/DASH segments (2–6 s) + manifests, encrypted with DRM (Widevine, FairPlay, PlayReady).',
      '**Distribute**: pre-position popular titles to edge caches during off-peak hours; long-tail titles fill on demand.',
      '**Play**: the client calls the playback API (auth, licence, ranked cache URLs), downloads the manifest, then segments; the ABR algorithm picks the bitrate for each segment based on throughput and buffer.',
      '**Observe**: client QoE telemetry (startup time, rebuffer ratio, bitrate, errors) feeds steering and encoding improvements.',
    ],
    bottlenecks: [
      { problem: 'Bandwidth cost and origin load', solution: 'Edge caches (ISP-embedded) serve most bytes; origin sees fills only.' },
      { problem: 'Varying viewer bandwidth', solution: 'Adaptive bitrate ladder switches quality per segment.' },
      { problem: 'Encoding time for long videos', solution: 'Chunk-parallel encoding across many workers.' },
      { problem: 'Peak-hour demand spikes', solution: 'Pre-positioning content off-peak; capacity in caches near users.' },
    ],
    tradeoffs: [
      { aspect: 'Encoding ladder', gain: 'More renditions → smoother adaptation, better quality per bandwidth.', cost: 'More compute and storage; per-title optimisation costs more upfront.' },
      { aspect: 'Segment length', gain: 'Longer: fewer requests, better compression.', cost: 'Slower adaptation and higher startup/live latency.' },
      { aspect: 'Own CDN vs. commercial', gain: 'Own (Open Connect): lower cost at huge scale, control.', cost: 'Massive upfront investment and ISP partnerships.' },
      { aspect: 'Codecs', gain: 'AV1/HEVC: big bandwidth savings.', cost: 'Device support and encoding cost.' },
    ],
    keyNumbers: [
      { label: 'Typical segment length', value: '2–6 s' },
      { label: 'Ladder size', value: '~6–12 renditions' },
      { label: 'YouTube upload rate', value: '500+ hours/min' },
      { label: 'Good rebuffer ratio', value: '< 0.5%' },
    ],
  },
  cloud: {
    public: {
      summary: 'AWS Elemental MediaConvert/MediaPackage, S3, CloudFront; Google Transcoder API + Media CDN; Azure Media services alternatives. Control plane on containers/serverless with DynamoDB/Cassandra for viewing state.',
      stack: ['S3 multipart upload', 'Elemental MediaConvert', 'MediaPackage', 'CloudFront / Media CDN', 'DRM providers'],
      points: [
        'Spot fleets cut encoding cost dramatically for idempotent chunk jobs.',
        'Origin shield + long TTLs keep origin egress low.',
      ],
    },
    private: {
      summary: 'At extreme scale companies build private CDNs: cache appliances embedded in ISP networks and at Internet exchanges (Netflix Open Connect, Google Global Cache), filled during off-peak windows.',
      stack: ['ISP-embedded caches', 'FFmpeg / custom encoders', 'NGINX-based segment servers', 'BGP peering'],
      points: [
        'Hardware cache appliances with large NVMe/HDD capacity tuned for sequential reads.',
        'Peering agreements reduce transit costs for both sides.',
      ],
    },
    hybrid: {
      summary: 'The canonical hybrid: control plane in public cloud (elastic, managed services) and the data plane in a private, globally distributed cache network — exactly Netflix’s architecture.',
      stack: ['Cloud control plane', 'Private edge caches', 'Steering service', 'Multi-CDN'],
      points: [
        'Steering decides between own caches and commercial CDNs per viewer.',
        'Multi-CDN offers resilience and price leverage.',
      ],
    },
  },
  examples: [
    {
      company: 'Netflix',
      headline: 'Cloud control plane + Open Connect data plane',
      scale: 'Hundreds of millions of members',
      detail: 'Netflix runs its control plane on AWS and serves video from Open Connect Appliances embedded in ISPs and at exchange points, filled nightly with predicted popular content. It pioneered per-title (and later per-shot) encoding to optimise each title’s bitrate ladder.',
      lesson: 'Separate control and data planes, and push bytes as close to viewers as possible.',
    },
    {
      company: 'YouTube',
      headline: 'User-generated video at enormous ingest scale',
      scale: '500+ hours uploaded every minute',
      detail: 'YouTube must transcode an endless stream of uploads quickly, prioritising popular videos for more renditions and newer codecs, and serves through Google’s global edge and Google Global Cache nodes inside ISPs.',
      lesson: 'Encode adaptively: spend more compute on content that will be watched more.',
    },
  ],
  interview: [
    {
      question: 'What is adaptive bitrate streaming?',
      difficulty: 'Junior/Mid',
      answer: [
        'The video is encoded at multiple bitrates/resolutions and split into short segments; a manifest lists them. The player measures throughput and buffer level and chooses the quality for each next segment, switching up or down seamlessly — avoiding rebuffering on poor networks and giving high quality on good ones.',
      ],
      followUps: [{ q: 'HLS vs. DASH?', a: 'Both are HTTP segment-based ABR formats; HLS (Apple) is required for Apple devices, DASH is an open standard. CMAF lets both share segments.' }],
      redFlags: ['Streaming one large file over a single connection.'],
    },
    {
      question: 'Why do streaming services use CDNs or their own edge caches?',
      difficulty: 'Junior/Mid',
      answer: [
        'Bandwidth cost, latency and scale: serving terabits per second from a central origin is unaffordable and slow. Edge caches near viewers serve most bytes, reduce startup time and rebuffering, and offload the origin. Popular content can be pre-positioned.',
      ],
      followUps: [{ q: 'What is pre-positioning?', a: 'Pushing content predicted to be popular to caches during off-peak hours, before anyone requests it.' }],
      redFlags: ['Serving video from application servers.'],
    },
    {
      question: 'Design the encoding pipeline for 10,000 new videos per day.',
      difficulty: 'Senior',
      answer: [
        'Upload to object storage → event → workflow orchestrator (Step Functions/Temporal) per video: validate, split into chunks, enqueue chunk × rendition jobs, encode on an autoscaled Spot fleet (idempotent jobs, retries), assemble, package (HLS/DASH, DRM), generate thumbnails, QC checks, publish metadata. Track state per video; DLQ for failures.',
        'Prioritise jobs (premium/popular first), scale workers on queue backlog, and store masters for future re-encodes.',
      ],
      followUps: [{ q: 'Why chunk the video?', a: 'Parallelism: a 2-hour film encodes in minutes across many workers, and a failure only retries one chunk.' }],
      redFlags: ['Encoding whole videos serially on one machine.'],
    },
    {
      question: 'Rebuffering spikes for viewers on one ISP in the evening. How do you diagnose and fix it?',
      difficulty: 'Senior',
      answer: [
        'Use client QoE telemetry segmented by ISP, region, device and cache. Likely causes: embedded caches saturated (capacity or disk), missing content (fill misses at peak), congested peering/interconnect, or a steering bug. Fixes: add cache capacity or redirect overflow to other caches/CDNs, improve pre-positioning for that region, upgrade interconnect, tune ABR to be more conservative under congestion.',
      ],
      followUps: [{ q: 'Which metrics matter most?', a: 'Startup time, rebuffer ratio, average bitrate, playback failures — measured on the client.' }],
      redFlags: ['Only looking at server-side metrics.'],
    },
    {
      question: 'Design a streaming platform for 100M subscribers end to end.',
      difficulty: 'Staff',
      answer: [
        'Control plane (multi-region active-active in cloud): accounts, catalogue, recommendations, playback API (auth, entitlement, DRM licence, steering), viewing history (Cassandra/DynamoDB), search. Data plane: encoding pipeline → origin storage → multi-tier edge (own ISP caches + commercial CDNs) with steering choosing the best cache per session.',
        'Estimate: peak concurrency ~10–15% of subscribers ≈ 10–15M streams × ~5 Mbps ≈ 50–75 Tbps at peak — only possible with deep edge distribution. Resilience: regional failover for the control plane, players fail over between caches, graceful degradation (cached recommendations). Observability: QoE pipeline feeding steering and encoding decisions.',
      ],
      followUps: [{ q: 'What happens if the recommendation service fails?', a: 'Fallback to cached/popular rows so playback is unaffected — degrade non-critical features first.' }],
      redFlags: ['No bandwidth estimate.', 'Mixing control and data planes.'],
    },
  ],
};

const rideMatching: Topic = {
  id: 'ride-matching',
  title: 'Design Geospatial Ride-Matching (Uber)',
  tagline: 'Ingest millions of moving driver locations, index them spatially, and match riders to the best nearby driver in under a second.',
  sceneId: 'ride-matching',
  camera: { position: [0, 21, 18], target: [0, 0.5, 0] },
  controls: {
    traffic: true,
    failureLabel: 'location-svc 1',
    hint: 'Driver pings flow into the location service and geo index; the rider’s request searches its hexagon plus neighbours (purple k-ring) and dispatches the nearest driver. Fail location-svc 1 to see ingestion fail over.',
  },
  fundamentals: {
    what: 'A ride-hailing backend tracks **driver locations** in real time, accepts **ride requests**, finds **nearby available drivers**, ranks them by **ETA**, and **dispatches** an offer — while handling pricing (surge), trip state and payments. The core technical problem is a **geospatial index** over rapidly changing points: map positions to cells (**geohash**, **H3 hexagons**, S2 cells or quadtrees) and query a cell plus its neighbours.',
    why: 'Scanning all drivers per request is impossible at city/global scale; positions change every few seconds; matching quality (ETA, utilisation) drives the business. Spatial indexing turns “find drivers within 2 km” into a few key lookups, and in-memory storage handles the write rate.',
    where: 'Ride-hailing, food/grocery delivery dispatch, proximity search (nearby restaurants, friends), fleet tracking, logistics.',
    how: [
      'Driver apps send GPS pings every ~4 s (location, heading, status) over persistent connections.',
      'Location service validates and writes the latest position into an **in-memory geo index** keyed by cell (e.g. H3 resolution 8–9), removing the driver from the old cell; history goes to a stream for analytics/ETA training.',
      'Rider requests a trip; the matching service converts the rider location to a cell and queries the cell plus a **k-ring** of neighbours (expanding if too few drivers).',
      'Candidates are ranked by **road-network ETA** (routing engine), driver acceptance, vehicle type and fairness.',
      'An offer is sent to the best driver with a **lock/reservation** so they are not offered two trips; on timeout/decline, the next candidate is tried.',
      'Trip state machine (requested → accepted → arriving → in-progress → completed) is persisted; pricing/surge computed per cell from supply/demand.',
      'The geo index is **sharded by geography** (city/region), with replication for failover.',
    ],
    bottlenecks: [
      { problem: 'Millions of location writes per minute', solution: 'In-memory index, overwrite latest position, batch history to a stream.' },
      { problem: 'Nearest-driver search over a whole city', solution: 'Cell-based spatial index + k-ring lookup.' },
      { problem: 'Two riders matched to the same driver', solution: 'Atomic reservation/lock on the driver during the offer.' },
      { problem: 'Hot cities and events', solution: 'Shard by geography; split dense areas into finer cells/shards.' },
    ],
    tradeoffs: [
      { aspect: 'Cell size', gain: 'Small cells: precise candidate sets.', cost: 'More cells to query; more frequent cell changes for moving drivers.' },
      { aspect: 'Hexagons vs. squares', gain: 'H3 hexagons: uniform neighbour distances.', cost: 'Hierarchy is approximate (hexagons do not perfectly nest).' },
      { aspect: 'Ping frequency', gain: 'Frequent: fresher positions, better ETAs.', cost: 'More battery, bandwidth and write load.' },
      { aspect: 'Matching strategy', gain: 'Greedy nearest: fast.', cost: 'Batch/global matching gives better overall efficiency at the cost of a few seconds’ delay.' },
    ],
    keyNumbers: [
      { label: 'Driver ping interval', value: '~4 s' },
      { label: 'H3 res-9 hex edge', value: '~174 m' },
      { label: 'k-ring(1) cells', value: '7' },
      { label: 'Match latency target', value: '< 1 s' },
    ],
  },
  cloud: {
    public: {
      summary: 'Managed building blocks: ElastiCache/MemoryDB with GEO commands, DynamoDB for trip state, Kinesis/MSK for location streams, Amazon Location Service or own routing engine (OSRM/Valhalla) for ETAs, API Gateway WebSockets / IoT Core for device connections.',
      stack: ['Redis GEO (GEOADD / GEOSEARCH)', 'DynamoDB', 'Kinesis / MSK', 'Amazon Location Service', 'IoT Core / WebSockets'],
      points: [
        'Redis GEO uses geohash-encoded sorted sets for radius queries.',
        'Shard Redis by city to keep each index small and hot.',
      ],
    },
    private: {
      summary: 'Custom in-memory geo services with consistent-hashing-based sharding (Uber’s Ringpop), H3 indexes, Cassandra/Schemaless for trip data, Kafka for streams, OSRM/Valhalla routing clusters.',
      stack: ['H3 / S2 libraries', 'Ringpop-style sharding', 'Kafka', 'Cassandra', 'OSRM / Valhalla'],
      points: [
        'Gossip-based membership lets geo shards rebalance when nodes fail.',
      ],
    },
    hybrid: {
      summary: 'Ride-hailing companies have run hybrid estates (own data centres + cloud); latency-critical matching usually stays close to users per region while analytics and ML training run wherever compute is cheapest.',
      stack: ['Regional matching clusters', 'Cloud ML training', 'Cross-site Kafka replication'],
      points: [
        'Keep matching regional; global systems (accounts, payments) replicate across sites.',
      ],
    },
  },
  examples: [
    {
      company: 'Uber',
      headline: 'H3 hexagonal grid',
      scale: 'Open-sourced 2018',
      detail: 'Uber developed H3, a hierarchical hexagonal geospatial index, to bucket locations for supply/demand analysis, surge pricing and dispatch. Hexagons have uniform neighbour distances, simplifying k-ring searches and smoothing.',
      lesson: 'Choosing the right spatial index shape simplifies both queries and analytics.',
    },
    {
      company: 'Uber',
      headline: 'Ringpop for sharding real-time services',
      scale: 'Dispatch and location services',
      detail: 'Uber built Ringpop, combining consistent hashing with a SWIM gossip protocol, so stateful services could shard work (e.g. by geography) across nodes and rebalance automatically when nodes join or fail.',
      lesson: 'Stateful real-time services need application-level sharding and membership, not just load balancers.',
    },
  ],
  interview: [
    {
      question: 'How would you find nearby drivers efficiently?',
      difficulty: 'Junior/Mid',
      answer: [
        'Bucket positions into spatial cells (geohash, H3, S2, quadtree). Store cell → set of drivers in memory. For a rider, compute their cell and query it plus neighbouring cells (k-ring), expanding if too few results, then filter by exact distance and rank by ETA.',
      ],
      followUps: [{ q: 'Why not a SQL query with a distance formula?', a: 'It scans many rows per request and cannot keep up with constant location updates; a spatial index in memory makes it a few lookups.' }],
      redFlags: ['Computing distance to every driver.'],
    },
    {
      question: 'Geohash vs. H3 vs. quadtree?',
      difficulty: 'Junior/Mid',
      answer: [
        'Geohash: string prefixes of a Z-order grid — easy prefix queries but cells are rectangles with edge effects and neighbours can have different prefixes. Quadtree: adaptive subdivision (dense areas split more) — good for uneven density, in-memory structure. H3: hexagons with uniform neighbour distances and a resolution hierarchy — great for k-ring searches and aggregation.',
      ],
      followUps: [{ q: 'What is the geohash edge problem?', a: 'Two nearby points across a cell boundary can have very different hashes, so you must always query neighbouring cells.' }],
      redFlags: ['Querying only the rider’s exact cell.'],
    },
    {
      question: 'How do you handle 1M driver location updates per minute?',
      difficulty: 'Senior',
      answer: [
        'That is ~17k writes/s — fine for sharded in-memory stores. Keep only the latest position in the index (overwrite), shard by city/region, and write raw pings asynchronously to a stream for history and ML. Use persistent connections (WebSocket/MQTT/gRPC streams) to cut overhead, and drop or coalesce stale updates under load.',
      ],
      followUps: [{ q: 'What if a location node fails?', a: 'Replicas or rebuild from the next pings (positions refresh within seconds) — the index is soft state.' }],
      redFlags: ['Writing every ping synchronously to a relational database.'],
    },
    {
      question: 'How do you prevent a driver from being matched to two riders simultaneously?',
      difficulty: 'Senior',
      answer: [
        'Make dispatch an atomic reservation: when offering a trip, atomically set driver state from AVAILABLE to OFFERED (compare-and-set in Redis/DB, or ownership by a single shard that serialises decisions for that driver). The offer has a timeout; on decline/timeout the state returns to AVAILABLE. Idempotent accept handling guards against duplicate messages.',
      ],
      followUps: [{ q: 'Why route a driver’s decisions to one shard?', a: 'A single owner serialises state changes without distributed locks.' }],
      redFlags: ['Check-then-set without atomicity.'],
    },
    {
      question: 'Design the dispatch system for a global ride-hailing service.',
      difficulty: 'Staff',
      answer: [
        'Regional architecture: each region/city cluster runs location ingest, a sharded geo index (H3 cells → drivers), matching, ETA/routing and trip state, close to users. Global services: accounts, payments, pricing configuration, ML models. Kafka streams locations and trip events for surge pricing (supply/demand per cell), ETA training and analytics.',
        'Matching: candidate retrieval via k-ring, ranking by ETA and business rules, batch matching every few seconds in dense areas for global efficiency, atomic driver reservation. Resilience: shard failover via membership (gossip/consistent hashing), degraded modes (wider radius, simpler ranking), regional isolation so one city’s overload does not affect others.',
      ],
      followUps: [{ q: 'How does surge pricing fit in?', a: 'Aggregate open requests and available drivers per cell over short windows; compute multipliers per cell and smooth across neighbours.' }],
      redFlags: ['One global matching database.'],
    },
  ],
};

const chat: Topic = {
  id: 'real-time-chat',
  title: 'Design Real-Time Chat (WhatsApp)',
  tagline: 'Persistent connections, ordered durable messages, presence and delivery receipts — for billions of users, online or offline.',
  sceneId: 'chat',
  camera: { position: [0, 19, 23], target: [0, 0.5, 0] },
  controls: {
    traffic: true,
    failureLabel: 'Bob goes offline',
    failureStates: ['OFFLINE', 'online'],
    hint: 'Online: Alice’s message is persisted and pushed to Bob’s gateway over WebSocket, with receipts flowing back. Take Bob offline: the message is stored and a push notification is sent instead.',
  },
  fundamentals: {
    what: 'A real-time chat system delivers messages between users (1:1 and groups) with low latency, guaranteed delivery, per-conversation ordering, receipts (sent ✓, delivered ✓✓, read), presence (online/last seen), media sharing, multi-device sync and often end-to-end encryption. Clients keep a **persistent connection** (WebSocket, MQTT, XMPP) to a **gateway**; a **chat service** persists and routes messages; a **session registry** tracks which gateway each user is connected to; **push notifications** reach offline users.',
    why: 'HTTP request/response polling is too slow and wasteful for real-time messaging at scale. Persistent connections allow servers to push instantly; durable storage guarantees no message is lost even when the recipient is offline; and the design must hold hundreds of millions of concurrent connections efficiently.',
    where: 'Messaging apps (WhatsApp, Messenger, Signal), team chat (Slack, Teams), in-app chat (marketplaces, support), gaming chat, live comments.',
    how: [
      'Client connects to a **WebSocket gateway** (via LB); the gateway authenticates and registers `user → gateway` in the **session registry** (Redis) with heartbeats.',
      'Alice sends a message with a client-generated ID (for deduplication) to her gateway.',
      'The **chat service** assigns a per-conversation **sequence number**, persists the message (Cassandra/HBase partitioned by conversation), and acks Alice (✓ sent).',
      'It looks up Bob in the session registry: if online, routes to Bob’s gateway, which pushes over his socket; Bob’s client acks (✓✓ delivered).',
      'If offline, the message waits in storage and a **push notification** (APNs/FCM) is sent; on reconnect, Bob syncs everything after his last acknowledged sequence number.',
      '**Groups**: fan out to members’ gateways (write-time fan-out for small groups; read-time for very large channels).',
      'Presence updates are published to interested contacts (rate-limited); media goes to object storage with links in messages; E2E encryption keeps servers blind to content.',
    ],
    bottlenecks: [
      { problem: 'Polling latency and overhead', solution: 'Persistent connections let servers push instantly.' },
      { problem: 'Hundreds of millions of concurrent connections', solution: 'Horizontally scaled gateways tuned for many idle sockets.' },
      { problem: 'Recipient offline', solution: 'Durable store + push notifications + sync on reconnect.' },
      { problem: 'Message ordering and duplicates', solution: 'Per-conversation sequence numbers + client message IDs.' },
    ],
    tradeoffs: [
      { aspect: 'Delivery semantics', gain: 'At-least-once with dedup = effectively once.', cost: 'Clients must handle retries and dedup by message ID.' },
      { aspect: 'Group fan-out', gain: 'Write-time fan-out: fast reads.', cost: 'Huge groups multiply writes; read-time fan-out scales better for large channels.' },
      { aspect: 'E2E encryption', gain: 'Privacy — servers cannot read messages.', cost: 'Server-side search, moderation and multi-device sync become harder.' },
      { aspect: 'Presence', gain: 'Rich UX.', cost: 'Presence updates can exceed message traffic — throttle and scope them.' },
    ],
    keyNumbers: [
      { label: 'WhatsApp connections/server (2012)', value: '~2M' },
      { label: 'Heartbeat interval (typ.)', value: '30–60 s' },
      { label: 'Delivery target', value: '< 200 ms online' },
      { label: 'Receipts', value: 'sent / delivered / read' },
    ],
  },
  cloud: {
    public: {
      summary: 'API Gateway WebSocket APIs or self-managed gateways on EC2/EKS behind NLBs, ElastiCache for sessions/presence, DynamoDB/Keyspaces for messages, SNS Mobile Push / FCM / APNs for notifications, S3 + CloudFront for media.',
      stack: ['NLB + WebSocket gateways', 'API Gateway WebSockets', 'ElastiCache', 'DynamoDB / Keyspaces', 'SNS Mobile Push'],
      points: [
        'NLBs handle millions of long-lived TCP connections with low overhead.',
        'Partition the message table by conversation ID with a sortable message ID.',
      ],
    },
    private: {
      summary: 'Erlang/Elixir (BEAM) or Go/Netty gateways tuned for massive connection counts, Cassandra/ScyllaDB for messages, Redis for sessions, Kafka for internal events.',
      stack: ['Erlang / Elixir (BEAM)', 'Netty / Go gateways', 'Cassandra / ScyllaDB', 'Redis', 'Kafka'],
      points: [
        'Kernel tuning (file descriptors, TCP buffers) matters for millions of sockets per host.',
      ],
    },
    hybrid: {
      summary: 'Global chat services place gateways near users (many regions/PoPs) while message storage is partitioned and replicated across regions; enterprises may keep message archives on-prem for compliance while using cloud gateways.',
      stack: ['Edge gateways', 'Cross-region replication', 'On-prem compliance archive'],
      points: [
        'Route users to the nearest gateway region; route messages between regions over the backbone.',
      ],
    },
  },
  examples: [
    {
      company: 'WhatsApp',
      headline: 'Erlang and extreme efficiency',
      scale: '~900M users with ~50 engineers (2015)',
      detail: 'WhatsApp built its servers on Erlang/FreeBSD, publicly reporting around 2 million concurrent TCP connections on a single server in 2012, and supported hundreds of millions of users with a remarkably small engineering team. It rolled out end-to-end encryption with the Signal protocol in 2016.',
      lesson: 'The right runtime and relentless simplicity let a small team serve a planet-scale messaging system.',
    },
    {
      company: 'Discord',
      headline: 'Elixir gateways and trillions of messages',
      scale: 'Trillions of stored messages',
      detail: 'Discord uses Elixir (BEAM) for real-time gateways and guild processes, and stores messages in ScyllaDB partitioned by channel and time bucket, with a data service layer that coalesces concurrent requests for the same hot channel.',
      lesson: 'Partition chat storage by conversation and protect hot conversations with request coalescing.',
    },
  ],
  interview: [
    {
      question: 'Why use WebSockets for chat instead of HTTP polling?',
      difficulty: 'Junior/Mid',
      answer: [
        'WebSockets keep a bidirectional connection open, so the server can push messages instantly with minimal overhead. Polling either adds latency (long intervals) or wastes resources (frequent empty requests). Long polling and SSE are alternatives, but WebSockets/MQTT are standard for chat.',
      ],
      followUps: [{ q: 'How do you load-balance WebSockets?', a: 'L4 (NLB) or L7 LBs with connection-level balancing; connections are sticky by nature, so use least-connections and graceful draining on deploys.' }],
      redFlags: ['Polling every second for millions of users.'],
    },
    {
      question: 'How do you guarantee message ordering and no duplicates?',
      difficulty: 'Junior/Mid',
      answer: [
        'The server assigns a monotonically increasing sequence number per conversation (single writer per conversation partition), and clients display by sequence. Clients attach a unique client message ID; the server deduplicates retries by that ID. Clients ack by sequence, so sync after reconnect fetches everything after the last acked number.',
      ],
      followUps: [{ q: 'Why not use timestamps?', a: 'Clock skew between devices/servers makes timestamps unreliable for ordering.' }],
      redFlags: ['Relying on client clocks for ordering.'],
    },
    {
      question: 'How does a message reach a user who is offline?',
      difficulty: 'Senior',
      answer: [
        'The message is persisted regardless. The session registry shows no active connection, so a push notification is sent via APNs/FCM (with minimal or encrypted content). When the user opens the app, it reconnects, registers its session and syncs messages after its last acknowledged sequence for each conversation; delivered receipts then flow back to senders.',
      ],
      followUps: [{ q: 'How do you handle multiple devices?', a: 'Track sessions per device; deliver to all; sync state (read markers) across devices.' }],
      redFlags: ['Dropping messages for offline users.'],
    },
    {
      question: 'How do you implement group chat for groups of 5 vs. 100,000 members?',
      difficulty: 'Senior',
      answer: [
        'Small groups: write-time fan-out — store once per conversation and push to each online member’s gateway. Huge channels: avoid per-member fan-out; members read from the channel’s log (read-time fan-out), with pushes only to active viewers and notifications batched/summarised. Rate-limit posting and presence for large groups.',
      ],
      followUps: [{ q: 'What becomes the bottleneck for huge groups?', a: 'Fan-out writes and notification storms; also hot partitions for the channel’s storage.' }],
      redFlags: ['Same fan-out strategy for every group size.'],
    },
    {
      question: 'Design WhatsApp-scale messaging: 2B users, 100B messages/day.',
      difficulty: 'Staff',
      answer: [
        'Estimates: 100B/day ≈ 1.2M msg/s average, several million at peak; hundreds of millions of concurrent connections → thousands of gateway servers. Architecture: regional gateway fleets (WebSocket/MQTT over TLS), session registry (sharded Redis), chat service partitioned by conversation ID (single writer → ordering), message store (Cassandra/ScyllaDB, TTL after delivery if storing only undelivered messages), push service, media service (object storage + CDN), presence service.',
        'E2E encryption via Signal protocol (key server for prekeys), multi-device sync, abuse/spam controls on metadata. Reliability: at-least-once with dedup, regional failover, backpressure. Observability on delivery latency percentiles and undelivered-message age.',
      ],
      followUps: [{ q: 'Store messages forever or only until delivered?', a: 'WhatsApp-style: store until delivered (clients keep history, backups optional); Slack/Discord-style: store forever for search and history. It drives storage cost massively.' }],
      redFlags: ['No connection-count estimate.', 'Ignoring offline delivery and ordering.'],
    },
  ],
};

export const module8Topics: Topic[] = [urlShortener, videoStreaming, rideMatching, chat];
