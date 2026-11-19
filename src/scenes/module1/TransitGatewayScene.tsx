import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink, type LinkStatus } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const R = 9;
const HUB: Vec3 = [0, Y, 0];

const SPOKES = [
  { name: 'Prod App', cidr: '10.0.0.0/16', color: C.server },
  { name: 'Prod Data', cidr: '10.1.0.0/16', color: C.db },
  { name: 'Shared Services', cidr: '10.2.0.0/16', color: C.gateway },
  { name: 'Dev', cidr: '10.3.0.0/16', color: C.miss },
  { name: 'Analytics', cidr: '10.4.0.0/16', color: C.edge },
  { name: 'On-Prem DC', cidr: '172.16.0.0/12', color: C.private },
];
const ONPREM = 5;
const DEV = 3;
const SHARED = 2;

const POS: Vec3[] = SPOKES.map((_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI * 2) / SPOKES.length;
  return [Math.cos(a) * R, Y, Math.sin(a) * R];
});

const FLOWS: [number, number][] = [
  [0, 1],
  [DEV, SHARED],
  [4, 1],
  [ONPREM, 0],
  [0, SHARED],
];

export function TransitGatewayScene() {
  const failure = useSystemStore((s) => s.failure);
  const variant = useSystemStore((s) => s.variant);
  const tgw = variant === 'tgw';

  const pairs: [number, number][] = [];
  for (let a = 0; a < SPOKES.length; a++) for (let b = a + 1; b < SPOKES.length; b++) pairs.push([a, b]);

  const peeringStatus = (a: number, b: number): LinkStatus => {
    const isDevShared = (a === SHARED && b === DEV) || (a === DEV && b === SHARED);
    return failure && isDevShared ? 'down' : 'active';
  };

  return (
    <group>
      {SPOKES.map((s, i) => (
        <CloudZoneBox
          key={s.name}
          position={[POS[i][0], 1.3, POS[i][2]]}
          size={[3.6, 2.4, 3.6]}
          color={i === ONPREM ? C.private : C.public}
          label={i === ONPREM ? 'On-prem' : `VPC · ${s.cidr}`}
          sublabel={i === ONPREM ? s.cidr : undefined}
          opacity={0.04}
        />
      ))}
      {SPOKES.map((s, i) => (
        <ServerNode
          key={s.name}
          id={`tgw-spoke-${i}`}
          kind={i === ONPREM ? 'router' : i === 1 ? 'database' : 'server'}
          position={POS[i]}
          label={s.name}
          sublabel={s.cidr}
          color={s.color}
          status={tgw && failure && i === SHARED ? 'degraded' : 'healthy'}
          description={
            i === ONPREM
              ? 'The corporate network. With peering, it needs a separate VPN to every VPC; with Transit Gateway it is one VPN/DX attachment that every VPC can reach (subject to route tables).'
              : `A VPC with a non-overlapping CIDR (${s.cidr}). Non-overlapping address space is a hard requirement for both VPC peering and Transit Gateway routing.`
          }
        />
      ))}

      {!tgw && (
        <>
          {pairs.map(([a, b]) => {
            const onprem = a === ONPREM || b === ONPREM;
            const st = peeringStatus(a, b);
            return (
              <NetworkLink
                key={`${a}-${b}`}
                from={POS[a]}
                to={POS[b]}
                arc={0.35}
                color={onprem ? C.vpn : C.public}
                dashed={onprem}
                width={1.1}
                status={st}
                label={st === 'down' ? 'peering deleted · no transit' : undefined}
              />
            );
          })}
          {FLOWS.map(([a, b], i) => (
            <PacketFlow
              key={`p${i}`}
              waypoints={[POS[a], POS[b], POS[a]]}
              arc={0.35}
              color={SPOKES[a].color}
              returnColor={C.response}
              active={!(failure && ((a === DEV && b === SHARED) || (a === SHARED && b === DEV)))}
              max={5}
              seed={i}
            />
          ))}
        </>
      )}

      {tgw && (
        <>
          <ServerNode id="tgw-hub" kind="hub" position={HUB} label="Transit Gateway" sublabel="regional router · route tables" color={C.hybrid} scale={1.5} description="A regional, horizontally-scaled router. Each VPC/VPN/DX attachment associates with a route table; propagation and static routes decide who can reach whom — transitive routing with central segmentation." />
          {SPOKES.map((s, i) => {
            const st: LinkStatus = failure && i === SHARED ? 'degraded' : 'active';
            return (
              <NetworkLink
                key={s.name}
                from={POS[i]}
                to={HUB}
                color={i === ONPREM ? C.private : C.hybrid}
                width={2.2}
                status={st}
                dashed={i === ONPREM || st === 'degraded'}
                label={st === 'degraded' ? 'AZ-a ENI down · AZ-b serving' : i === ONPREM ? 'VPN / DX attachment' : undefined}
              />
            );
          })}
          {FLOWS.map(([a, b], i) => (
            <PacketFlow key={`t${i}`} waypoints={[POS[a], HUB, POS[b], HUB, POS[a]]} color={SPOKES[a].color} returnColor={C.response} max={5} seed={i} />
          ))}
        </>
      )}
    </group>
  );
}
