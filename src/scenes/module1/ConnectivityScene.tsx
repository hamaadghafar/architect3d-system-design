import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode, type NodeStatus } from '../../components/three/ServerNode';
import { NetworkLink, type LinkStatus } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';
import { connectivityState } from '../sceneLogic';

const Y = 0.65;
const DC: Vec3[] = [
  [-14, Y, -2.5],
  [-14, Y, 2.5],
];
const CGW: Vec3 = [-9, Y, 0];
const INET: Vec3 = [-2, Y + 1.6, 5.2];
const T: Vec3[] = [
  [4, Y, 3.2],
  [4, Y, 7],
];
const COLO: Vec3 = [-3.6, Y, -4.8];
const AWSDX: Vec3 = [0.6, Y, -4.8];
const DXGW: Vec3 = [5, Y, -4.8];
const TGW: Vec3 = [9, Y, 0];
const VPC: Vec3[] = [
  [14, Y, -2.5],
  [14, Y, 2.5],
];

const toNode = (s: LinkStatus): NodeStatus => (s === 'down' ? 'failed' : s === 'active' ? 'healthy' : 'standby');

export function ConnectivityScene() {
  const failure = useSystemStore((s) => s.failure);
  const linkMode = useSystemStore((s) => s.linkMode);
  const st = connectivityState(linkMode, failure);

  const route = (p: 't1' | 't2' | 'dx'): Vec3[] => (p === 'dx' ? [COLO, AWSDX, DXGW] : [INET, p === 't1' ? T[0] : T[1]]);

  return (
    <group>
      <CloudZoneBox position={[-12, 1.8, 0]} size={[7.4, 3.6, 9]} color={C.private} label="Corporate DC" sublabel="10.50.0.0/16" />
      <CloudZoneBox position={[-1.5, 1.4, -4.8]} size={[6.6, 2.8, 3]} color={C.dx} label="Colocation facility" sublabel="DX location · cross-connect" opacity={0.035} />
      <CloudZoneBox position={[11.5, 2, 0]} size={[9, 4, 13]} color={C.public} label="AWS Region" sublabel="TGW + VPCs 10.0.0.0/8" />

      {DC.map((p, i) => (
        <ServerNode key={i} id={`cx-dc-${i}`} kind="server" position={p} label={i === 0 ? 'Mainframe / core' : 'Data warehouse'} color={C.private} description="On-prem systems that need private, predictable connectivity to workloads running in AWS." />
      ))}
      <ServerNode id="cx-cgw" kind="router" position={CGW} label="Customer router" sublabel="BGP · ASN 65010" color={C.private} description="Terminates both IPsec tunnels and the DX private VIF. BGP advertises on-prem prefixes over each path; AWS prefers DX over VPN for the same prefix." />
      <ServerNode id="cx-inet" kind="internet" position={INET} label="Public Internet" sublabel="variable latency & jitter" status={st.t1 === 'backup' ? 'standby' : 'healthy'} color={C.vpn} description="VPN packets are encrypted (IPsec ESP) and encapsulated, then routed over the public Internet — path quality is outside your control." />
      <ServerNode id="cx-t1" kind="vpn" position={T[0]} label="VPN endpoint 1" sublabel="Tunnel 1 · AZ-a" status={toNode(st.t1)} color={C.vpn} description="Each AWS Site-to-Site VPN connection has two tunnels terminating on endpoints in different AZs, so AWS maintenance or an AZ issue only drops one tunnel." />
      <ServerNode id="cx-t2" kind="vpn" position={T[1]} label="VPN endpoint 2" sublabel="Tunnel 2 · AZ-b" status={toNode(st.t2)} color={C.vpn} description="The second tunnel. With a Transit Gateway both tunnels can be used simultaneously via ECMP for up to ~2× throughput." />
      <ServerNode id="cx-colo" kind="router" position={COLO} label="Your colo router" sublabel="LOA-CFA · port 10G" status={toNode(st.dx)} color={C.dx} description="Your (or your partner's) router in the colocation facility, connected to the AWS router with a physical fibre cross-connect." />
      <ServerNode id="cx-awsdx" kind="router" position={AWSDX} label="AWS DX router" sublabel="802.1Q VLAN · private VIF" status={toNode(st.dx)} color={C.dx} description="The AWS side of the cross-connect. Virtual interfaces (VIFs) are VLANs on this port: private VIF → VPCs, transit VIF → TGW, public VIF → AWS public services." />
      <ServerNode id="cx-dxgw" kind="hub" position={DXGW} label="DX Gateway" sublabel="global" status={toNode(st.dx)} color={C.dx} description="A global object that lets one DX connection reach Transit Gateways / VGWs in many regions." />
      <ServerNode id="cx-tgw" kind="hub" position={TGW} label="Transit Gateway" sublabel="route tables + BGP" color={C.hybrid} description="Learns on-prem routes from both DX and VPN attachments. With equal prefixes, the DX-learned route wins; if DX BGP drops, VPN routes take over within seconds (BFD speeds detection)." />
      {VPC.map((p, i) => (
        <ServerNode key={i} id={`cx-vpc-${i}`} kind="server" position={p} label={i === 0 ? 'Prod VPC app' : 'Analytics VPC'} color={C.server} description="Workloads in VPCs attached to the Transit Gateway." />
      ))}

      {DC.map((p, i) => (
        <NetworkLink key={i} from={p} to={CGW} color={C.private} />
      ))}
      <NetworkLink from={CGW} to={INET} color={C.vpn} dashed status={st.t1 === 'down' && st.t2 === 'down' ? 'down' : st.t2 === 'backup' ? 'backup' : 'active'} />
      <NetworkLink from={INET} to={T[0]} color={C.vpn} dashed status={st.t1} label={st.t1 === 'down' ? 'Tunnel 1 down (DPD)' : 'Tunnel 1'} />
      <NetworkLink from={INET} to={T[1]} color={C.vpn} dashed status={st.t2} label="Tunnel 2" />
      <NetworkLink from={T[0]} to={TGW} color={C.vpn} status={st.t1} dashed />
      <NetworkLink from={T[1]} to={TGW} color={C.vpn} status={st.t2} dashed />
      <NetworkLink from={CGW} to={COLO} color={C.dx} width={3} status={st.dx} label="dedicated circuit" />
      <NetworkLink from={COLO} to={AWSDX} color={C.dx} width={3} status={st.dx} label={st.dx === 'down' ? 'cross-connect down' : 'cross-connect'} />
      <NetworkLink from={AWSDX} to={DXGW} color={C.dx} width={3} status={st.dx} />
      <NetworkLink from={DXGW} to={TGW} color={C.dx} width={3} status={st.dx} label="transit VIF" />
      {VPC.map((p, i) => (
        <NetworkLink key={i} from={TGW} to={p} color={C.hybrid} />
      ))}

      {st.paths.map((p, pi) =>
        DC.map((src, i) => {
          const r = route(p);
          const isVpn = p !== 'dx';
          return (
            <PacketFlow
              key={`${p}-${i}-${linkMode}-${failure}`}
              waypoints={[src, CGW, ...r, TGW, VPC[i], TGW, ...[...r].reverse(), CGW, src]}
              turnAt={r.length + 3}
              color={isVpn ? C.vpn : C.dx}
              returnColor={C.response}
              speed={isVpn ? 0.7 : 1.4}
              jitter={isVpn ? 0.6 : 0}
              max={st.paths.length > 1 ? 4 : 6}
              seed={i + pi * 3}
            />
          );
        }),
      )}
    </group>
  );
}
