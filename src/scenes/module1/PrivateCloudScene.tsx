import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode, type NodeStatus } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const USERS: Vec3[] = [
  [-15, Y, -3],
  [-15, Y, 3],
];
const FW: Vec3 = [-8.5, Y, 0];
const CORE: Vec3 = [-5.2, Y, 0];
const LB: Vec3 = [-1.8, Y, 0];
const HOSTS: Vec3[] = [
  [2.5, Y, -3.4],
  [5.5, Y, -3.4],
  [8.5, Y, -3.4],
];
const SAN: Vec3 = [4, Y, 3.6];
const DB: Vec3 = [9, Y, 3.6];

export function PrivateCloudScene() {
  const failure = useSystemStore((s) => s.failure);
  // Fixed capacity: re-render only when the load crosses the saturation threshold.
  const saturated = useSystemStore((s) => s.trafficRate >= 75);
  // With one host gone, N+1 headroom is consumed and the cluster saturates earlier.
  const strained = useSystemStore((s) => s.trafficRate >= 55);

  const live = failure ? [1, 2] : [0, 1, 2];
  const hostStatus = (i: number): NodeStatus => {
    if (failure && i === 0) return 'failed';
    if (saturated || (failure && strained)) return 'degraded';
    return 'healthy';
  };

  return (
    <group>
      <CloudZoneBox position={[0.6, 2.1, 0]} size={[21, 4.2, 13]} color={C.private} label="On-Prem Data Center · Frankfurt" sublabel="Private cloud · single tenant, owned hardware" />
      <CloudZoneBox position={[5.5, 1.3, -3.4]} size={[9.4, 2.4, 3.2]} color="#fbbf24" label="Compute cluster" sublabel="VMware vSphere HA / OpenStack Nova" opacity={0.03} />

      {USERS.map((p, i) => (
        <ServerNode key={i} id={`pri-user-${i}`} kind="client" position={p} label={i === 0 ? 'HQ employees' : 'Branch offices'} sublabel="via MPLS / SD-WAN" color={C.client} description="Internal users reach the private cloud over the corporate WAN. No public-Internet exposure is required for internal apps." />
      ))}
      <ServerNode id="pri-fw" kind="firewall" position={FW} label="Perimeter firewall" sublabel="Palo Alto / Fortinet" color={C.security} description="Stateful firewalls and IDS/IPS at the data-centre edge. In a private cloud you own (and patch, and scale) every security control yourself." />
      <ServerNode id="pri-core" kind="router" position={CORE} label="Core switch" sublabel="spine-leaf fabric" color={C.private} description="A spine-leaf network fabric (e.g. Cisco Nexus / Arista) gives every rack a predictable number of hops to every other rack." />
      <ServerNode id="pri-lb" kind="loadbalancer" position={LB} label="Hardware LB" sublabel="F5 BIG-IP pair" color={C.edge} description="An active/standby hardware load-balancer pair. Capacity is fixed at purchase time — no elastic scaling." />

      {HOSTS.map((p, i) => (
        <ServerNode
          key={i}
          id={`pri-host-${i}`}
          kind="server"
          position={p}
          label={`Hypervisor ${i + 1}`}
          sublabel={failure && i > 0 ? '+6 VMs restarted' : '12 VMs'}
          status={hostStatus(i)}
          color={C.private}
          description="Bare-metal hosts running a hypervisor (ESXi / KVM). The cluster is sized N+1: if one host fails, HA restarts its VMs on the survivors — as long as spare capacity exists."
        />
      ))}
      <ServerNode id="pri-san" kind="storage" position={SAN} label="Shared storage" sublabel="SAN / Ceph" color="#fbbf24" description="Shared block storage (Fibre-Channel SAN or a Ceph cluster). Because VM disks live here, not on the host, a VM can restart on any host." />
      <ServerNode id="pri-db" kind="database" position={DB} label="Oracle RAC" sublabel="regulated data" color={C.db} description="Systems of record that must stay on owned hardware for licensing, latency or regulatory reasons." />

      <NetworkLink from={USERS[0]} to={FW} arc={0.4} color={C.private} label="MPLS" />
      <NetworkLink from={USERS[1]} to={FW} arc={0.4} color={C.private} label="SD-WAN" />
      <NetworkLink from={FW} to={CORE} color={C.security} />
      <NetworkLink from={CORE} to={LB} color={C.private} />
      {HOSTS.map((p, i) => (
        <NetworkLink key={i} from={LB} to={p} color={C.edge} status={failure && i === 0 ? 'down' : saturated ? 'degraded' : 'active'} />
      ))}
      {HOSTS.map((p, i) => (
        <NetworkLink key={`s${i}`} from={p} to={SAN} color="#fbbf24" status={failure && i === 0 ? 'idle' : 'active'} dashed />
      ))}
      <NetworkLink from={SAN} to={DB} color={C.db} />

      {USERS.map((u, i) => (
        <PacketFlow key={`u${i}-${live.length}`} waypoints={[u, FW, CORE, LB, HOSTS[live[i % live.length]], SAN, HOSTS[live[i % live.length]], LB, CORE, FW, u]} color={C.request} returnColor={C.response} turnAt={5} max={8} seed={i} />
      ))}
      {live.map((h, i) => (
        <PacketFlow key={`h${h}`} waypoints={[LB, HOSTS[h], DB, HOSTS[h], LB]} color={C.write} returnColor={C.response} max={4} size={0.1} seed={i + 4} />
      ))}
      {failure && <PacketFlow waypoints={[HOSTS[0], HOSTS[1]]} arc={1} color={C.miss} max={4} size={0.11} speed={0.6} />}
    </group>
  );
}
