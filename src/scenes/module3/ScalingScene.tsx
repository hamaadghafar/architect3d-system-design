import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';
import { horizontalCount, verticalTier, VERTICAL_SIZES } from '../sceneLogic';

const Y = 0.65;
const CLIENTS: Vec3[] = [-4, 0, 4].map((z) => [-13, Y, z] as Vec3);
const LB: Vec3 = [-4.5, Y, 0];
const SLOTS_Z = [-6, -3, 0, 3, 6];

export function ScalingScene() {
  const variant = useSystemStore((s) => s.variant);
  const failure = useSystemStore((s) => s.failure);
  const tier = useSystemStore((s) => verticalTier(s.trafficRate));
  const ceiling = useSystemStore((s) => s.trafficRate >= 90);
  const count = useSystemStore((s) => horizontalCount(s.trafficRate));

  if (variant === 'vertical') {
    const SERVER: Vec3 = [3, Y + tier * 0.3, 0];
    return (
      <group>
        <CloudZoneBox position={[3, 2, 0]} size={[7, 4, 7]} color={C.private} label="Single machine" sublabel="scale UP: more CPU / RAM" />
        {CLIENTS.map((p, i) => (
          <ServerNode key={i} id={`sc-c-${i}`} kind="client" position={p} label={`Clients ${i + 1}`} color={C.client} description="Every request lands on the same single machine." />
        ))}
        <ServerNode
          id="sc-big"
          kind="server"
          position={SERVER}
          scale={1.2 + tier * 0.45}
          label={VERTICAL_SIZES[tier].name}
          sublabel={`${VERTICAL_SIZES[tier].vcpu} vCPU · ${VERTICAL_SIZES[tier].ram} RAM`}
          status={failure ? 'failed' : ceiling ? 'degraded' : 'healthy'}
          color={C.private}
          description="Vertical scaling replaces the machine with a bigger one. Simple — no code changes — but it needs a restart/migration, has a hard ceiling (the largest instance), and remains a single point of failure."
        />
        {CLIENTS.map((p, i) => (
          <NetworkLink key={i} from={p} to={SERVER} color={C.private} status={failure ? 'down' : 'active'} label={failure && i === 1 ? 'total outage' : undefined} />
        ))}
        {!failure &&
          CLIENTS.map((p, i) => (
            <PacketFlow key={`${i}-${tier}`} waypoints={[p, SERVER, p]} color={C.request} returnColor={ceiling ? C.miss : C.response} speed={ceiling ? 0.55 : 1} max={7} seed={i} />
          ))}
      </group>
    );
  }

  const servers: Vec3[] = SLOTS_Z.map((z) => [5, Y, z] as Vec3);
  const live = Array.from({ length: count }, (_, i) => i).filter((i) => !(failure && i === 0));

  return (
    <group>
      <CloudZoneBox position={[5, 1.6, 0]} size={[4, 3.2, 15]} color={C.public} label="Server pool" sublabel="scale OUT: add identical nodes" />
      {CLIENTS.map((p, i) => (
        <ServerNode key={i} id={`sc-c-${i}`} kind="client" position={p} label={`Clients ${i + 1}`} color={C.client} description="Clients hit one load balancer address; the pool behind it can grow or shrink." />
      ))}
      <ServerNode id="sc-lb" kind="loadbalancer" position={LB} label="Load balancer" sublabel={`${live.length} healthy targets`} color={C.edge} description="Horizontal scaling needs a load balancer and stateless servers so any node can serve any request." />
      {servers.map((p, i) => (
        <ServerNode
          key={i}
          id={`sc-s-${i}`}
          kind="server"
          position={p}
          label={`node-${i + 1}`}
          sublabel={i < count ? 'm5.large' : 'not provisioned'}
          status={i >= count ? 'idle' : failure && i === 0 ? 'failed' : 'healthy'}
          color={C.server}
          description="Commodity-sized nodes. Capacity grows linearly by adding nodes, and losing one only removes 1/N of capacity."
        />
      ))}
      {CLIENTS.map((p, i) => (
        <NetworkLink key={i} from={p} to={LB} color={C.edge} />
      ))}
      {servers.map((p, i) => (
        <NetworkLink key={i} from={LB} to={p} color={C.server} status={i >= count ? 'idle' : failure && i === 0 ? 'down' : 'active'} />
      ))}
      {live.map((s, k) => (
        <PacketFlow key={`${s}-${count}`} waypoints={[CLIENTS[k % 3], LB, servers[s], LB, CLIENTS[k % 3]]} color={C.request} returnColor={C.response} max={5} seed={k} />
      ))}
    </group>
  );
}
