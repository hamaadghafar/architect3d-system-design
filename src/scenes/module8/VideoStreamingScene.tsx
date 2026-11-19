import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;

function UploadView({ failure }: { failure: boolean }) {
  const CREATOR: Vec3 = [-15, Y, 0];
  const UPLOAD: Vec3 = [-10, Y, 0];
  const RAW: Vec3 = [-5, Y, 0];
  const QUEUE: Vec3 = [-0.5, Y, 0];
  const WORKERS: Vec3[] = [-5, 0, 5].map((z) => [5, Y, z] as Vec3);
  const RENDITIONS: Vec3 = [11, Y, 0];
  const live = failure ? [0, 2] : [0, 1, 2];
  return (
    <group>
      <CloudZoneBox position={[5, 1.6, 0]} size={[4, 3.2, 14]} color={C.miss} label="Transcoding fleet" sublabel="Spot instances · chunk-parallel" />
      <ServerNode id="vs-creator" kind="client" position={CREATOR} label="Creator" sublabel="4K master, 8 GB" color={C.client} description="Uploads go straight to object storage using presigned, multipart (resumable) uploads — not through your app servers." />
      <ServerNode id="vs-upload" kind="gateway" position={UPLOAD} label="Upload service" sublabel="presigned URLs" color={C.gateway} description="Authorises the upload, creates the video record, hands out presigned multipart URLs." />
      <ServerNode id="vs-raw" kind="storage" position={RAW} label="S3: raw" sublabel="source of truth" color={C.dx} description="Original masters are kept so you can re-encode with better codecs later." />
      <ServerNode id="vs-queue" kind="storage" position={QUEUE} scale={0.8} label="Job queue" sublabel="split into 10 s chunks" color={C.replicate} description="The video is split into chunks; each chunk × rendition is an independent job, so a feature film encodes in minutes across many workers." />
      {WORKERS.map((p, i) => (
        <ServerNode key={i} id={`vs-w-${i}`} kind="server" position={p} label={`encoder ${i + 1}`} sublabel={failure && i === 1 ? 'Spot reclaimed' : 'H.264 / AV1 ladder'} status={failure && i === 1 ? 'failed' : 'healthy'} color={C.miss} description="Encodes chunks into a bitrate ladder (240p → 4K, several codecs). Jobs are idempotent: if a Spot worker disappears, its chunk is simply retried elsewhere." />
      ))}
      <ServerNode id="vs-rend" kind="storage" position={RENDITIONS} scale={1.1} label="S3: renditions" sublabel="HLS/DASH segments + manifests" color={C.dx} description="Packaged segments and manifests, ready to be pushed/pulled to the CDN." />
      <NetworkLink from={CREATOR} to={UPLOAD} color={C.gateway} />
      <NetworkLink from={UPLOAD} to={RAW} color={C.dx} label="multipart PUT" />
      <NetworkLink from={RAW} to={QUEUE} color={C.replicate} />
      {WORKERS.map((p, i) => (
        <NetworkLink key={i} from={QUEUE} to={p} color={C.miss} status={failure && i === 1 ? 'down' : 'active'} />
      ))}
      {WORKERS.map((p, i) => (
        <NetworkLink key={`r${i}`} from={p} to={RENDITIONS} color={C.dx} status={failure && i === 1 ? 'idle' : 'active'} />
      ))}
      <PacketFlow waypoints={[CREATOR, UPLOAD, RAW]} color={C.write} max={5} size={0.15} />
      <PacketFlow waypoints={[RAW, QUEUE]} color={C.replicate} max={4} />
      {live.map((w) => (
        <PacketFlow key={`w${w}-${failure}`} waypoints={[QUEUE, WORKERS[w], RENDITIONS]} color={C.miss} returnColor={C.dx} turnAt={1} max={4} seed={w} />
      ))}
      {failure && <PacketFlow key="retry" waypoints={[WORKERS[1], QUEUE]} arc={1} color={C.error} max={1} size={0.12} speed={0.4} />}
    </group>
  );
}

function PlaybackView({ failure, hit }: { failure: boolean; hit: boolean }) {
  const VIEWERS: Vec3[] = [-6, -2, 2, 6].map((z) => [-15, Y, z] as Vec3);
  const STEER: Vec3 = [-8, Y, -7];
  const EDGES: Vec3[] = [
    [-5, Y, -2.5],
    [-5, Y, 3.5],
  ];
  const ORIGIN: Vec3 = [9, Y, 0];
  const edgeFor = (v: number) => (failure ? 1 : v < 2 ? 0 : 1);
  return (
    <group>
      <CloudZoneBox position={[-5, 1.5, 0.5]} size={[3.6, 3, 11]} color={C.edge} label="ISP-embedded caches" sublabel="Open Connect-style" />
      {VIEWERS.map((p, i) => (
        <ServerNode key={i} id={`vs-v-${i}`} kind="client" position={p} scale={0.85} label={`Viewer ${i + 1}`} sublabel="ABR player" color={C.client} description="The player fetches a manifest, then requests segments, switching bitrate every few seconds based on measured throughput (adaptive bitrate)." />
      ))}
      <ServerNode id="vs-steer" kind="hub" position={STEER} label="Playback / steering API" sublabel="returns ranked cache URLs" color={C.gateway} description="Control plane (in the cloud): authorises playback, applies DRM licensing, and picks the best caches for this viewer and title." />
      {EDGES.map((p, i) => (
        <ServerNode
          key={i}
          id={`vs-e-${i}`}
          kind="cdn"
          position={p}
          label={`cache ${i + 1}`}
          sublabel={failure && i === 0 ? 'offline' : hit ? 'segment HIT' : 'MISS → fill'}
          status={failure && i === 0 ? 'failed' : 'healthy'}
          color={C.edge}
          description="Caches pre-filled overnight with titles predicted to be popular in this region. The vast majority of bytes are served from here."
        />
      ))}
      <ServerNode id="vs-origin" kind="storage" position={ORIGIN} scale={1.2} label="Origin (S3 renditions)" color={C.dx} description="Only cache fills and long-tail titles reach the origin." />
      {VIEWERS.map((p, i) => (
        <NetworkLink key={i} from={p} to={EDGES[edgeFor(i)]} color={C.edge} />
      ))}
      {VIEWERS.map((p, i) => (
        <NetworkLink key={`s${i}`} from={p} to={STEER} color={C.gateway} width={0.8} dashed />
      ))}
      {EDGES.map((p, i) => (
        <NetworkLink key={`o${i}`} from={p} to={ORIGIN} color={C.miss} dashed status={!hit && !(failure && i === 0) ? 'active' : 'backup'} />
      ))}
      {VIEWERS.map((p, i) => {
        const e = EDGES[edgeFor(i)];
        return hit ? (
          <PacketFlow key={`h${i}-${failure}`} waypoints={[p, e, p]} color={C.request} returnColor={C.response} max={7} speed={1.3} seed={i} />
        ) : (
          <PacketFlow key={`m${i}-${failure}`} waypoints={[p, e, ORIGIN, e, p]} color={C.miss} returnColor={C.response} max={5} seed={i} />
        );
      })}
      <PacketFlow waypoints={[VIEWERS[0], STEER, VIEWERS[0]]} color={C.gateway} returnColor={C.response} max={2} size={0.1} speed={0.7} />
    </group>
  );
}

export function VideoStreamingScene() {
  const variant = useSystemStore((s) => s.variant);
  const failure = useSystemStore((s) => s.failure);
  const hit = useSystemStore((s) => s.cacheHit);
  return variant === 'upload' ? <UploadView failure={failure} /> : <PlaybackView failure={failure} hit={hit} />;
}
