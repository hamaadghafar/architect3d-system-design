import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const CLIENT: Vec3 = [-14, Y, 0];
const RESOLVER: Vec3 = [-7, Y, 0];
const WEB: Vec3 = [-10.5, Y, -6.5];
const ROOT: Vec3 = [2, Y, -6];
const TLD: Vec3 = [5.5, Y, 0];
const AUTH1: Vec3 = [2, Y, 6];
const AUTH2: Vec3 = [8, Y, 6];

export function DnsScene() {
  const cacheHit = useSystemStore((s) => s.cacheHit);
  const failure = useSystemStore((s) => s.failure);
  const AUTH = failure ? AUTH2 : AUTH1;

  return (
    <group>
      <CloudZoneBox position={[-10.5, 1.6, -1.5]} size={[9, 3.2, 13]} color={C.edge} label="Client side" sublabel="device · ISP / public resolver" />
      <CloudZoneBox position={[5, 1.6, 0]} size={[10.5, 3.2, 16]} color={C.hybrid} label="DNS hierarchy" sublabel="root → TLD → authoritative" />

      <ServerNode id="dns-client" kind="client" position={CLIENT} label="Browser + OS stub" sublabel="api.example.com ?" color={C.client} description="The browser checks its own cache, then the OS stub resolver (and /etc/hosts), then sends a recursive query — usually over UDP/53, or DoH/DoT — to its configured resolver." />
      <ServerNode
        id="dns-resolver"
        kind="dns"
        position={RESOLVER}
        label="Recursive resolver"
        sublabel={cacheHit ? 'cache HIT · TTL 247s left' : 'cache MISS · walking tree'}
        color={cacheHit ? C.response : C.miss}
        description="A caching resolver (ISP, 8.8.8.8, 1.1.1.1). On a miss it iteratively walks the hierarchy and caches each answer for its TTL, including referrals and negative answers (NXDOMAIN)."
      />
      <ServerNode id="dns-web" kind="server" position={WEB} label="api.example.com" sublabel="93.184.216.34" color={C.server} description="Once the name resolves, the client opens a TCP/QUIC connection to the returned IP. DNS is only the lookup — not on the data path." />
      <ServerNode id="dns-root" kind="dns" position={ROOT} label="Root servers ( . )" sublabel="13 identities · anycast" color={C.hybrid} description="13 named root server identities (a–m.root-servers.net) served by well over a thousand anycast instances. They answer with a referral to the TLD servers." />
      <ServerNode id="dns-tld" kind="dns" position={TLD} label=".com TLD" sublabel="Verisign" color={C.hybrid} description="TLD servers do not know the IP of api.example.com; they return a referral: the NS records (and glue) for example.com." />
      <ServerNode id="dns-auth1" kind="dns" position={AUTH1} label="ns1.example.com" sublabel="authoritative · Route 53" status={failure ? 'failed' : 'healthy'} color={C.gateway} description="The authoritative server holds the zone and returns the actual record (A/AAAA/CNAME), with a TTL chosen by the zone owner. Managed DNS can also do latency/geo/weighted routing here." />
      <ServerNode id="dns-auth2" kind="dns" position={AUTH2} label="ns2.example.com" sublabel="secondary provider" color={C.gateway} description="A second authoritative server — ideally on a different provider/network. Resolvers retry other NS records when one times out, so DNS availability is the union of all NS servers." />

      <NetworkLink from={CLIENT} to={RESOLVER} color={C.edge} label={cacheHit ? 'A? → cached answer' : 'A? api.example.com'} />
      <NetworkLink from={CLIENT} to={WEB} arc={0.4} color={C.server} label="HTTPS to 93.184.216.34" />
      <NetworkLink from={RESOLVER} to={ROOT} arc={0.6} color={C.hybrid} status={cacheHit ? 'idle' : 'active'} label={cacheHit ? undefined : 'referral → .com'} />
      <NetworkLink from={RESOLVER} to={TLD} arc={0.9} color={C.hybrid} status={cacheHit ? 'idle' : 'active'} label={cacheHit ? undefined : 'referral → ns1/ns2'} />
      <NetworkLink from={RESOLVER} to={AUTH1} arc={0.6} color={C.gateway} status={failure ? 'down' : cacheHit ? 'idle' : 'active'} label={failure ? 'timeout' : cacheHit ? undefined : 'A 93.184.216.34 TTL 300'} />
      <NetworkLink from={RESOLVER} to={AUTH2} arc={1.1} color={C.gateway} status={failure && !cacheHit ? 'active' : 'idle'} label={failure && !cacheHit ? 'retry → answer' : undefined} />

      {cacheHit ? (
        <PacketFlow key="hit" waypoints={[CLIENT, RESOLVER, CLIENT]} color={C.request} returnColor={C.response} max={6} speed={1.1} />
      ) : (
        <PacketFlow
          key={`miss-${failure}`}
          waypoints={[CLIENT, RESOLVER, ROOT, RESOLVER, TLD, RESOLVER, AUTH, RESOLVER, CLIENT]}
          arc={0.6}
          color={C.miss}
          returnColor={C.response}
          turnAt={6}
          max={6}
          speed={0.9}
        />
      )}
      {failure && !cacheHit && <PacketFlow waypoints={[RESOLVER, AUTH1]} arc={0.6} color={C.error} max={3} size={0.1} speed={0.6} />}
      <PacketFlow waypoints={[CLIENT, WEB, CLIENT]} arc={0.4} color={C.server} returnColor={C.response} max={5} seed={3} />
    </group>
  );
}
