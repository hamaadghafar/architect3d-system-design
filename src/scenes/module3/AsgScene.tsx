import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';
import { asgDesired } from '../sceneLogic';

const Y = 0.65;
const CLIENTS: Vec3[] = [-4, 0, 4].map((z) => [-13, Y, z] as Vec3);
const ALB: Vec3 = [-5, Y, 0];
const SLOTS: Vec3[] = [
  [3, Y, -4],
  [7, Y, -4],
  [3, Y, 0],
  [7, Y, 0],
  [3, Y, 4],
  [7, Y, 4],
];
const CW: Vec3 = [12, Y, -2.5];
const CTL: Vec3 = [12, Y, 2.5];

export function AsgScene() {
  const failure = useSystemStore((s) => s.failure);
  const desired = useSystemStore((s) => asgDesired(s.trafficRate));
  const live = SLOTS.map((_, i) => i).filter((i) => i < desired && !(failure && i === 0));

  return (
    <group>
      <CloudZoneBox position={[5, 1.6, 0]} size={[8, 3.2, 12]} color={C.public} label="Auto Scaling Group" sublabel={`min 2 · desired ${desired} · max 6`} />
      {CLIENTS.map((p, i) => (
        <ServerNode key={i} id={`asg-c-${i}`} kind="client" position={p} label={`Users ${i + 1}`} color={C.client} description="Demand rises and falls through the day; the ASG follows it." />
      ))}
      <ServerNode id="asg-alb" kind="loadbalancer" position={ALB} label="ALB" sublabel="registers new instances" color={C.edge} description="New instances register with the target group automatically once healthy; terminating ones are deregistered and drained." />
      {SLOTS.map((p, i) => {
        const active = i < desired;
        const replaced = failure && i === 0;
        return (
          <ServerNode
            key={i}
            id={`asg-i-${i}`}
            kind="server"
            position={p}
            label={active ? `i-0${i + 1}a` : 'capacity slot'}
            sublabel={replaced ? 'unhealthy → replacing' : active ? `AZ ${'abc'[i % 3]}` : 'scaled in'}
            status={replaced ? 'failed' : active ? 'healthy' : 'idle'}
            color={C.server}
            description="Instances launched from a launch template (AMI, instance type, user data). The ASG keeps the count at 'desired', replacing unhealthy instances and balancing across AZs."
          />
        );
      })}
      <ServerNode id="asg-cw" kind="hub" position={CW} label="CloudWatch" sublabel="avg CPU metric" color={C.miss} description="Instances publish metrics; target-tracking policies create alarms that fire when the metric drifts from the target (e.g. 50% average CPU)." />
      <ServerNode id="asg-ctl" kind="router" position={CTL} label="Scaling policy" sublabel="target tracking · CPU 50%" color={C.gateway} description="Computes the new desired capacity from the metric and asks the ASG to launch or terminate instances, respecting min/max and cooldown / warm-up periods." />

      {CLIENTS.map((p, i) => (
        <NetworkLink key={i} from={p} to={ALB} color={C.edge} />
      ))}
      {SLOTS.map((p, i) => (
        <NetworkLink key={i} from={ALB} to={p} color={C.server} status={i >= desired ? 'idle' : failure && i === 0 ? 'down' : 'active'} />
      ))}
      <NetworkLink from={CW} to={CTL} color={C.miss} dashed label="alarm" />
      <NetworkLink from={CTL} to={SLOTS[5]} arc={1} color={C.gateway} dashed label="launch / terminate" />

      {live.map((s, k) => (
        <PacketFlow key={`${s}-${desired}`} waypoints={[CLIENTS[k % 3], ALB, SLOTS[s], ALB, CLIENTS[k % 3]]} color={C.request} returnColor={C.response} max={5} seed={k} />
      ))}
      {live.map((s) => (
        <PacketFlow key={`m${s}`} waypoints={[SLOTS[s], CW]} arc={0.8} color={C.miss} max={1} size={0.08} speed={0.5} seed={s} />
      ))}
      <PacketFlow waypoints={[CW, CTL]} color={C.miss} max={2} size={0.09} speed={0.6} />
      {failure && <PacketFlow waypoints={[CTL, SLOTS[0]]} arc={1.2} color={C.gateway} max={3} size={0.11} speed={0.7} />}
    </group>
  );
}
