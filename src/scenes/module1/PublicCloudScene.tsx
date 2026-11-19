import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const AZ_Z = [-4.2, 0, 4.2];
const USERS: Vec3[] = [
  [-15, Y, -3],
  [-15, Y, 0],
  [-15, Y, 3],
];
const INTERNET: Vec3 = [-11, Y + 0.4, 0];
const IGW: Vec3 = [-6.2, Y, 0];
const ALB: Vec3 = [-3, Y, 0];
const EC2: Vec3[] = AZ_Z.map((z) => [1.5, Y, z] as Vec3);
const DB: Vec3[] = AZ_Z.map((z) => [7, Y, z] as Vec3);
const S3: Vec3 = [11.6, Y, 0];

export function PublicCloudScene() {
  const failure = useSystemStore((s) => s.failure);
  const healthy = failure ? [1, 2] : [0, 1, 2];
  const primary = failure ? 1 : 0;

  const dbLabels = failure
    ? ['RDS (lost)', 'RDS Primary', 'Read Replica']
    : ['RDS Primary', 'RDS Standby', 'Read Replica'];

  return (
    <group>
      <CloudZoneBox position={[2.6, 2.1, 0]} size={[20.4, 4.2, 13.8]} color={C.public} label="AWS Region · us-east-1" sublabel="Public cloud · multi-tenant, pay-per-use" />
      {AZ_Z.map((z, i) => (
        <CloudZoneBox
          key={z}
          position={[4.3, 1.3, z]}
          size={[8.6, 2.4, 3.4]}
          color={failure && i === 0 ? C.error : '#0ea5e9'}
          label={`AZ us-east-1${'abc'[i]}${failure && i === 0 ? ' · OUTAGE' : ''}`}
          opacity={failure && i === 0 ? 0.08 : 0.03}
          dashed={failure && i === 0}
        />
      ))}

      {USERS.map((p, i) => (
        <ServerNode key={i} id={`pub-user-${i}`} kind="client" position={p} label={`Users ${['NA', 'EU', 'APAC'][i]}`} color={C.client} description="End users reach the application over the public Internet using the DNS name of the load balancer (or a CDN in front of it)." />
      ))}
      <ServerNode id="pub-internet" kind="internet" position={INTERNET} label="Public Internet" color={C.public} description="The shared public network. Traffic enters AWS at the nearest edge and rides the AWS backbone to the region." />
      <ServerNode id="pub-igw" kind="gateway" position={IGW} label="Internet Gateway" sublabel="VPC edge" color={C.gateway} description="A horizontally scaled, redundant VPC component that allows communication between the VPC and the Internet. Public subnets route 0.0.0.0/0 to it." />
      <ServerNode id="pub-alb" kind="loadbalancer" position={ALB} label="Application LB" sublabel="spans all AZs" color={C.edge} description="A managed L7 load balancer with nodes in every enabled AZ. Health checks remove failed targets automatically; cross-zone load balancing spreads requests evenly." />

      {EC2.map((p, i) => (
        <ServerNode
          key={i}
          id={`pub-ec2-${i}`}
          kind="server"
          position={p}
          label={`EC2 · ASG`}
          sublabel={`app tier · AZ ${'abc'[i]}`}
          status={failure && i === 0 ? 'failed' : 'healthy'}
          color={C.server}
          description="Stateless application servers in an Auto Scaling Group spread across AZs. If an AZ is lost the ASG re-balances capacity into the surviving AZs."
        />
      ))}
      {DB.map((p, i) => (
        <ServerNode
          key={i}
          id={`pub-db-${i}`}
          kind="database"
          position={p}
          label={dbLabels[i]}
          sublabel={i === 2 ? 'async replica' : i === primary ? 'writes + reads' : 'sync standby'}
          status={failure && i === 0 ? 'failed' : i === 1 && !failure ? 'standby' : 'healthy'}
          color={C.db}
          description={
            i === 2
              ? 'An asynchronous read replica in a third AZ that offloads read traffic. It can lag the primary by milliseconds to seconds.'
              : 'Amazon RDS Multi-AZ: the primary synchronously replicates every write to a standby in another AZ. On failure, RDS flips the DNS endpoint to the standby (typically 60–120 s).'
          }
        />
      ))}
      <ServerNode id="pub-s3" kind="storage" position={S3} label="Amazon S3" sublabel="regional · 11 nines durability" color={C.dx} description="Object storage replicated across ≥3 AZs. Used here for automated DB snapshots and static assets." />

      {/* links */}
      {USERS.map((p, i) => (
        <NetworkLink key={i} from={p} to={INTERNET} arc={0.4} color={C.public} />
      ))}
      <NetworkLink from={INTERNET} to={IGW} color={C.public} />
      <NetworkLink from={IGW} to={ALB} color={C.gateway} />
      {EC2.map((p, i) => (
        <NetworkLink key={i} from={ALB} to={p} color={C.edge} status={failure && i === 0 ? 'down' : 'active'} label={failure && i === 0 ? 'health check failed' : undefined} />
      ))}
      {EC2.map((p, i) => (
        <NetworkLink key={`db${i}`} from={p} to={DB[primary]} color={C.db} status={failure && i === 0 ? 'idle' : 'active'} />
      ))}
      <NetworkLink from={DB[0]} to={DB[1]} arc={0.5} color={C.replicate} dashed status={failure ? 'down' : 'active'} label={failure ? 'standby promoted' : 'sync replication'} />
      <NetworkLink from={DB[primary]} to={DB[2]} arc={0.7} color={C.replicate} dashed label="async replication" />
      <NetworkLink from={DB[primary]} to={S3} arc={0.8} color={C.dx} dashed label="snapshots" />

      {/* traffic: round trips per user, routed to a healthy AZ */}
      {USERS.map((u, i) => {
        const az = healthy[i % healthy.length];
        return (
          <PacketFlow
            key={`${i}-${az}-${primary}`}
            waypoints={[u, INTERNET, IGW, ALB, EC2[az], DB[primary], EC2[az], ALB, IGW, INTERNET, u]}
            color={C.request}
            returnColor={C.response}
            turnAt={5}
            max={8}
            seed={i}
          />
        );
      })}
      {!failure && <PacketFlow waypoints={[DB[0], DB[1]]} arc={0.5} color={C.replicate} max={5} size={0.09} speed={0.8} />}
      <PacketFlow key={`rep-${primary}`} waypoints={[DB[primary], DB[2]]} arc={0.7} color={C.replicate} max={4} size={0.09} speed={0.6} />
      <PacketFlow key={`snap-${primary}`} waypoints={[DB[primary], S3]} arc={0.8} color={C.dx} max={2} size={0.1} speed={0.5} />
    </group>
  );
}
