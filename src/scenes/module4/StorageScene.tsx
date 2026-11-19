import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const AZ_Z = [-5, 0, 5];

function BlockView({ failure }: { failure: boolean }) {
  const EC2: Vec3 = [-4, Y, -5];
  const EBS: Vec3 = [2, Y, -5];
  const SNAP: Vec3 = [9, Y, 3];
  return (
    <group>
      <CloudZoneBox position={[-1, 1.5, -5]} size={[10, 3, 4]} color={failure ? C.error : C.public} label={`AZ a${failure ? ' · OUTAGE' : ''}`} sublabel="EBS volumes live in ONE AZ" dashed={failure} />
      <CloudZoneBox position={[-1, 1.5, 0]} size={[10, 3, 4]} color="#0ea5e9" label="AZ b" opacity={0.02} />
      <CloudZoneBox position={[-1, 1.5, 5]} size={[10, 3, 4]} color="#0ea5e9" label="AZ c" opacity={0.02} />
      <ServerNode id="st-ec2" kind="server" position={EC2} label="EC2 instance" sublabel="/dev/nvme1n1 → ext4" status={failure ? 'failed' : 'healthy'} color={C.server} description="The OS sees a raw block device and puts a filesystem or database files on it. Only this instance (normally) can attach it." />
      <ServerNode id="st-ebs" kind="storage" position={EBS} label="EBS volume (gp3)" sublabel="16k IOPS · sub-ms" status={failure ? 'failed' : 'healthy'} color={C.miss} description="Block storage: fixed-size volume of blocks addressed by offset, replicated within its AZ. Very low latency random reads/writes — ideal for databases and boot disks." />
      <ServerNode id="st-snap" kind="storage" position={SNAP} label="Snapshots → S3" sublabel="incremental · regional" color={C.dx} description="Point-in-time snapshots are stored in S3 (regional, multi-AZ). After an AZ loss you restore a new volume from the snapshot in another AZ — losing writes since the snapshot." />
      <NetworkLink from={EC2} to={EBS} color={C.miss} width={3} status={failure ? 'down' : 'active'} label="NVMe over Nitro" />
      <NetworkLink from={EBS} to={SNAP} arc={1} color={C.dx} dashed label="snapshot" />
      {!failure && <PacketFlow waypoints={[EC2, EBS, EC2]} color={C.miss} returnColor={C.response} max={10} speed={1.6} size={0.1} />}
      <PacketFlow waypoints={[EBS, SNAP]} arc={1} color={C.dx} max={2} size={0.1} speed={0.5} active={!failure} />
    </group>
  );
}

function ObjectView({ failure }: { failure: boolean }) {
  const CLIENTS: Vec3[] = [-6, -2, 2, 6].map((z) => [-13, Y, z] as Vec3);
  const API: Vec3 = [-5, Y, 0];
  const COPIES: Vec3[] = AZ_Z.map((z) => [5, Y, z] as Vec3);
  return (
    <group>
      <CloudZoneBox position={[5, 2, 0]} size={[8, 4, 15.5]} color={C.dx} label="S3 bucket · region" sublabel="objects = key + bytes + metadata" />
      {AZ_Z.map((z, i) => (
        <CloudZoneBox key={z} position={[5, 1.2, z]} size={[6.5, 2.2, 3.8]} color={failure && i === 0 ? C.error : '#0ea5e9'} label={`AZ ${'abc'[i]}`} opacity={0.02} dashed={failure && i === 0} />
      ))}
      {CLIENTS.map((p, i) => (
        <ServerNode key={i} id={`st-cl-${i}`} kind="client" position={p} scale={0.85} label={['Web app', 'Mobile', 'Spark job', 'CDN'][i]} color={C.client} description="Any number of clients, anywhere, access objects concurrently over HTTPS." />
      ))}
      <ServerNode id="st-api" kind="gateway" position={API} label="S3 API (HTTPS)" sublabel="PUT / GET / LIST" color={C.gateway} description="Object storage is accessed through an HTTP API by key — no filesystem semantics, whole-object writes, no in-place partial updates." />
      {COPIES.map((p, i) => (
        <ServerNode key={i} id={`st-copy-${i}`} kind="storage" position={p} label={`copy in AZ ${'abc'[i]}`} sublabel="erasure-coded" status={failure && i === 0 ? 'failed' : 'healthy'} color={C.dx} description="Data is redundantly stored across multiple AZs before a PUT is acknowledged, so an entire AZ can be lost without losing data or availability." />
      ))}
      {CLIENTS.map((p, i) => (
        <NetworkLink key={i} from={p} to={API} color={C.gateway} />
      ))}
      {COPIES.map((p, i) => (
        <NetworkLink key={i} from={API} to={p} color={C.dx} status={failure && i === 0 ? 'down' : 'active'} />
      ))}
      {CLIENTS.map((p, i) => {
        const copy = failure ? 1 + (i % 2) : i % 3;
        return <PacketFlow key={`${i}-${copy}`} waypoints={[p, API, COPIES[copy], API, p]} color={C.request} returnColor={C.response} max={4} speed={0.8} seed={i} />;
      })}
    </group>
  );
}

export function StorageScene() {
  const variant = useSystemStore((s) => s.variant);
  const failure = useSystemStore((s) => s.failure);
  return variant === 'block' ? <BlockView failure={failure} /> : <ObjectView failure={failure} />;
}
