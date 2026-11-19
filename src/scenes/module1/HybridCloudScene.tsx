import type { Vec3 } from '../../types';
import { effectiveLink, linkStatus } from '../sceneLogic';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const PII: Vec3 = [-12, Y, -3.2];
const ERP: Vec3 = [-12, Y, 3.2];
const CGW: Vec3 = [-5, Y, 0];
const INET: Vec3 = [0, Y + 2.2, 3.6];
const DXLOC: Vec3 = [0, Y, -3.6];
const TGW: Vec3 = [5, Y, 0];
const BURST: Vec3[] = [
  [9, Y, -3.6],
  [9, Y, 0],
  [9, Y, 3.6],
];
const LAKE: Vec3 = [12.8, Y, 0];

export function HybridCloudScene() {
  const failure = useSystemStore((s) => s.failure);
  const linkMode = useSystemStore((s) => s.linkMode);
  const active = effectiveLink(linkMode, failure);
  const via: Vec3[] = active === 'vpn' ? [INET] : [DXLOC];
  const flowColor = active === 'vpn' ? C.vpn : C.dx;
  const linkSpeed = active === 'vpn' ? 0.7 : 1.35;
  const jitter = active === 'vpn' ? 0.55 : 0;
  const back = [...via].reverse();

  return (
    <group>
      <CloudZoneBox position={[-9.3, 2, 0]} size={[9.4, 4, 11.5]} color={C.private} label="On-Prem DC (Private)" sublabel="Systems of record · data residency" />
      <CloudZoneBox position={[9.1, 2, 0]} size={[10, 4, 11.5]} color={C.public} label="AWS VPC · eu-central-1" sublabel="Elastic burst compute + analytics" />

      <ServerNode id="hy-pii" kind="database" position={PII} label="Customer PII DB" sublabel="must stay in-country" color={C.db} description="Regulated data (GDPR / banking secrecy) stays on owned hardware. The cloud only ever receives tokenised or aggregated data." />
      <ServerNode id="hy-erp" kind="server" position={ERP} label="ERP / Core apps" sublabel="steady-state load" color={C.private} description="Predictable, steady workloads run on already-paid-for on-prem capacity — this is where private cloud is cheapest." />
      <ServerNode id="hy-cgw" kind="router" position={CGW} label="Customer Gateway" sublabel="BGP ASN 65000" color={C.private} description="The on-prem edge router. It runs BGP with AWS over both the Direct Connect virtual interface and the IPsec VPN tunnels, preferring DX via local-preference / AS-path." />
      <ServerNode
        id="hy-inet"
        kind="internet"
        position={INET}
        label="Internet (IPsec VPN)"
        sublabel="encrypted · best-effort path"
        status={linkStatus('vpn', linkMode, failure) === 'down' ? 'failed' : linkStatus('vpn', linkMode, failure) === 'backup' ? 'standby' : 'healthy'}
        color={C.vpn}
        description="Site-to-Site VPN: two IPsec tunnels over the public Internet. Quick to set up and cheap, but throughput (~1.25 Gbps per tunnel) and latency vary with Internet conditions."
      />
      <ServerNode
        id="hy-dx"
        kind="router"
        position={DXLOC}
        label="Direct Connect location"
        sublabel="colo cross-connect · 10 Gbps"
        status={linkStatus('dx', linkMode, failure) === 'down' ? 'failed' : linkStatus('dx', linkMode, failure) === 'backup' ? 'standby' : 'healthy'}
        color={C.dx}
        description="AWS Direct Connect: a private fibre circuit from your router to AWS in a colocation facility. Consistent latency and 1/10/100 Gbps, but it takes weeks to provision and is not encrypted by default (use MACsec or IPsec over DX)."
      />
      <ServerNode id="hy-tgw" kind="hub" position={TGW} label="Transit Gateway" sublabel="VPN + DX attachments" color={C.hybrid} description="The cloud-side hub. Both the DX gateway and the VPN attach here; BGP decides which path is live, giving automatic failover." />
      {BURST.map((p, i) => (
        <ServerNode key={i} id={`hy-burst-${i}`} kind="server" position={p} label="Burst workers" sublabel={`Spot / ASG · ${i + 1}`} color={C.server} description="Elastic compute that scales out for peaks (month-end batch, Black-Friday traffic, ML training) and scales to zero afterwards — 'cloud bursting'." />
      ))}
      <ServerNode id="hy-lake" kind="storage" position={LAKE} label="S3 data lake" sublabel="tokenised data only" color={C.dx} description="Analytics data that is anonymised or tokenised before leaving the data centre, so residency rules are respected." />

      {/* links */}
      <NetworkLink from={PII} to={CGW} color={C.private} />
      <NetworkLink from={ERP} to={CGW} color={C.private} />
      <NetworkLink from={CGW} to={INET} color={C.vpn} dashed status={linkStatus('vpn', linkMode, failure)} label={linkStatus('vpn', linkMode, failure) === 'down' ? 'tunnels down' : 'IPsec tunnel'} />
      <NetworkLink from={INET} to={TGW} color={C.vpn} dashed status={linkStatus('vpn', linkMode, failure)} />
      <NetworkLink from={CGW} to={DXLOC} color={C.dx} width={3} status={linkStatus('dx', linkMode, failure)} label={linkStatus('dx', linkMode, failure) === 'down' ? 'fibre cut' : 'private VIF'} />
      <NetworkLink from={DXLOC} to={TGW} color={C.dx} width={3} status={linkStatus('dx', linkMode, failure)} />
      {BURST.map((p, i) => (
        <NetworkLink key={i} from={TGW} to={p} color={C.hybrid} />
      ))}
      {BURST.map((p, i) => (
        <NetworkLink key={`l${i}`} from={p} to={LAKE} color={C.dx} dashed />
      ))}

      {/* job dispatch: on-prem ERP → cloud burst workers → back */}
      {BURST.map((b, i) => (
        <PacketFlow
          key={`job-${active}-${i}`}
          waypoints={[ERP, CGW, ...via, TGW, b, TGW, ...back, CGW, ERP]}
          color={flowColor}
          returnColor={C.response}
          turnAt={4}
          speed={linkSpeed}
          jitter={jitter}
          max={5}
          seed={i}
        />
      ))}
      {/* tokenised lookups: cloud worker → on-prem PII service → back (data never leaves) */}
      <PacketFlow key={`pii-${active}`} waypoints={[BURST[1], TGW, ...via, CGW, PII, CGW, ...back, TGW, BURST[1]]} color={C.write} returnColor={C.miss} turnAt={4} speed={linkSpeed} jitter={jitter} max={5} size={0.11} seed={7} />
      {BURST.map((b, i) => (
        <PacketFlow key={`lake-${i}`} waypoints={[b, LAKE]} color={C.dx} max={3} size={0.09} speed={0.8} seed={i + 3} />
      ))}
    </group>
  );
}
