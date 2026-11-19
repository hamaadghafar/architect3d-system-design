import { rps, type SceneEntry } from '../../types';
import { C } from '../../three/palette';
import { UrlShortenerScene } from './UrlShortenerScene';
import { VideoStreamingScene } from './VideoStreamingScene';
import { RideMatchingScene } from './RideMatchingScene';
import { ChatScene } from './ChatScene';

export const MODULE8_SCENES = {
  'url-shortener': {
    Component: UrlShortenerScene,
    legend: [{ color: C.request, label: 'Redirect (hit)' }, { color: C.miss, label: 'Redirect (miss)' }, { color: C.write, label: 'Create' }, { color: C.replicate, label: 'Click events' }],
    metrics: (s) =>
      s.variant === 'redirect'
        ? [
            { label: 'Redirects', value: rps(s.trafficRate, 1000) },
            { label: 'Cache', value: s.failure ? 'DOWN → DB' : s.cacheHit ? 'HIT (~1 ms)' : 'MISS (~5–10 ms)', tone: s.failure ? 'bad' : s.cacheHit ? 'good' : 'warn' },
            { label: 'DB reads', value: s.failure || !s.cacheHit ? rps(s.trafficRate, 1000) : rps(s.trafficRate, 50), tone: s.failure ? 'bad' : 'good' },
            { label: 'Read : write', value: '~100 : 1', tone: 'info' },
            { label: 'Analytics', value: 'Async (Kafka)', tone: 'good' },
          ]
        : [
            { label: 'Creates', value: rps(s.trafficRate, 10) },
            { label: 'Code length', value: '7 chars base62 ≈ 3.5 × 10¹²', tone: 'info' },
            { label: 'Collisions', value: 'None (ID ranges)', tone: 'good' },
            { label: 'Storage / 5 yrs', value: '~ TBs (500 B × billions)', tone: 'info' },
            { label: 'Cache warm on create', value: s.failure ? 'Skipped (cache down)' : 'Yes', tone: s.failure ? 'warn' : 'good' },
          ],
    narrate: (s) => {
      if (s.variant === 'create') return 'Create: the API takes the next ID from its leased range, base62-encodes it into a short code, stores code → URL in the KV store and warms the cache. No collision checks are needed.';
      if (s.failure) return 'Redis is down: every redirect falls through to the KV store. It survives because single-key lookups scale horizontally — but latency and cost jump. Cache availability matters.';
      return s.cacheHit
        ? 'Redirect: GET /x7Kp2Q → Redis hit → 301/302 with the long URL in about a millisecond, while the click event is written asynchronously to Kafka.'
        : 'Redirect on a cold code: Redis misses, the API reads the KV store, returns the redirect and populates the cache for the next click.';
    },
  },
  'video-streaming': {
    Component: VideoStreamingScene,
    legend: [{ color: C.write, label: 'Upload' }, { color: C.miss, label: 'Encode / cache fill' }, { color: C.request, label: 'Segment request' }, { color: C.response, label: 'Segment bytes' }],
    metrics: (s) =>
      s.variant === 'upload'
        ? [
            { label: 'Encoders', value: s.failure ? '2 / 3 (Spot reclaimed)' : '3 / 3', tone: s.failure ? 'warn' : 'good' },
            { label: 'Ladder', value: '240p → 4K × codecs', tone: 'info' },
            { label: 'Parallelism', value: 'Per 10 s chunk', tone: 'good' },
            { label: 'Failed chunk', value: s.failure ? 'Retried on another worker' : '—', tone: s.failure ? 'warn' : 'good' },
            { label: 'Time to publish', value: 'minutes', tone: 'info' },
          ]
        : [
            { label: 'Concurrent streams', value: `${Math.round(s.trafficRate * 40).toLocaleString()}k`, tone: 'info' },
            { label: 'Edge hit ratio', value: s.cacheHit ? '~95%+' : 'cold (filling)', tone: s.cacheHit ? 'good' : 'warn' },
            { label: 'Origin egress', value: s.cacheHit ? 'Low' : 'High', tone: s.cacheHit ? 'good' : 'bad' },
            { label: 'Cache 1', value: s.failure ? 'Offline → viewers steered to cache 2' : 'Healthy', tone: s.failure ? 'warn' : 'good' },
            { label: 'Startup time', value: s.cacheHit ? '< 2 s' : '2–5 s', tone: s.cacheHit ? 'good' : 'warn' },
          ],
    narrate: (s) => {
      if (s.variant === 'upload')
        return s.failure
          ? 'A Spot instance was reclaimed mid-encode. Its chunk job times out and is retried on another worker — idempotent chunk jobs make cheap, interruptible compute safe.'
          : 'Upload: the master goes straight to object storage, is split into chunks, and a fleet of encoders produces the full bitrate ladder in parallel before packaging HLS/DASH segments.';
      return s.failure
        ? 'Cache 1 went offline. The steering service stops handing it out and players fail over to cache 2 on their next segment request — viewers barely notice thanks to their buffer.'
        : s.cacheHit
          ? 'Playback: the control plane returns ranked cache URLs; players fetch segments from a cache inside their ISP and adapt bitrate continuously.'
          : 'Cold title: segments are missing at the edge, so caches fill from the origin. Pre-positioning popular titles overnight avoids this at peak.';
    },
  },
  'ride-matching': {
    Component: RideMatchingScene,
    spread: 1,
    legend: [{ color: C.edge, label: 'Driver location ping' }, { color: C.write, label: 'Ride request' }, { color: C.response, label: 'Dispatch' }, { color: '#7c3aed', label: 'k-ring search area' }],
    metrics: (s) => [
      { label: 'Location updates', value: `${Math.round(s.trafficRate * 25).toLocaleString()}k / min`, tone: 'info' },
      { label: 'Search', value: 'Cell + k-ring(1) = 7 hexes', tone: 'info' },
      { label: 'Candidates found', value: '2 drivers → rank by ETA', tone: 'good' },
      { label: 'Ingest', value: s.failure ? 'location-svc 1 down → 2 serving' : '2 nodes healthy', tone: s.failure ? 'warn' : 'good' },
      { label: 'Match latency', value: '< 1 s target', tone: 'good' },
    ],
    narrate: (s) =>
      s.failure
        ? 'location-svc 1 failed; drivers’ pings are rebalanced to node 2. Because only the latest position matters, a few lost pings are harmless — the next one arrives in seconds.'
        : 'Drivers ping their position every few seconds into an in-memory geo index keyed by H3 cell. A ride request looks up the rider’s cell plus neighbours, ranks candidates by ETA, and offers the trip to the best driver.',
  },
  chat: {
    Component: ChatScene,
    legend: [{ color: C.write, label: 'Message' }, { color: C.response, label: 'Ack / receipt' }, { color: C.cache, label: 'Session lookup' }, { color: C.miss, label: 'Push notification' }],
    metrics: (s) => [
      { label: 'Messages', value: rps(s.trafficRate, 2000).replace('req', 'msg') },
      { label: 'Bob', value: s.failure ? 'Offline' : 'Online (gateway 2)', tone: s.failure ? 'warn' : 'good' },
      { label: 'Delivery path', value: s.failure ? 'Store → push → sync on open' : 'Pushed over WebSocket', tone: 'info' },
      { label: 'Ordering', value: 'Per-chat sequence id', tone: 'good' },
      { label: 'Guarantee', value: 'At-least-once + dedupe', tone: 'info' },
    ],
    narrate: (s) =>
      s.failure
        ? 'Bob is offline: the session registry has no live connection, so the message is persisted and a push notification is sent. When Bob opens the app it reconnects and syncs everything after his last seen sequence id.'
        : 'Alice → gateway 1 → chat service, which persists the message (sent ✓), finds Bob’s gateway in the session registry, and pushes it down his socket (delivered ✓✓).',
  },
} satisfies Record<string, SceneEntry>;
