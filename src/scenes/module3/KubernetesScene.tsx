import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { CloudZoneBox } from '../../components/three/CloudZoneBox';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';
import { k8sReplicas } from '../sceneLogic';

const Y = 0.65;
const USER: Vec3 = [-15, Y, 2];
const INGRESS: Vec3 = [-9, Y, 2];
const NODE_X = [-2, 4.5, 11];
const SLOT_Z = [-0.4, 2.8, 6];
const API: Vec3 = [-2, Y, -6];
const ETCD: Vec3 = [-7, Y, -6];
const SCHED: Vec3 = [4, Y, -6];
const CTRL: Vec3 = [10, Y, -6];

export function KubernetesScene() {
  const failure = useSystemStore((s) => s.failure);
  const replicas = useSystemStore((s) => k8sReplicas(s.trafficRate));
  const liveNodes = failure ? [1, 2] : [0, 1, 2];
  const capacity = liveNodes.length * SLOT_Z.length;
  const running = Math.min(replicas, capacity);

  // Round-robin spread across schedulable nodes (topology spread).
  const pods = Array.from({ length: running }, (_, k) => {
    const node = liveNodes[k % liveNodes.length];
    const slot = Math.floor(k / liveNodes.length);
    return { k, node, pos: [NODE_X[node], Y, SLOT_Z[slot]] as Vec3 };
  });

  return (
    <group>
      <CloudZoneBox position={[1.5, 1.4, -6]} size={[21, 2.8, 3.4]} color={C.hybrid} label="Control plane" sublabel="managed by EKS / GKE / AKS" opacity={0.035} />
      {NODE_X.map((x, i) => (
        <CloudZoneBox
          key={x}
          position={[x, 1.4, 1.4]}
          size={[4.4, 2.8, 10.2]}
          color={failure && i === 0 ? C.error : C.public}
          label={`worker-node-${i + 1}${failure && i === 0 ? ' · NotReady' : ''}`}
          sublabel="kubelet · containerd · kube-proxy"
          dashed={failure && i === 0}
        />
      ))}

      <ServerNode id="k8s-user" kind="client" position={USER} label="Users" color={C.client} description="External traffic enters through a cloud load balancer created for the Ingress / Gateway." />
      <ServerNode id="k8s-ing" kind="gateway" position={INGRESS} label="Ingress → Service" sublabel="routes to ready pods" color={C.gateway} description="The Ingress controller routes HTTP to a Service; the Service load-balances across the Endpoints of all Ready pods, wherever they run." />
      <ServerNode id="k8s-api" kind="hub" position={API} label="kube-apiserver" sublabel="the only door to etcd" color={C.hybrid} description="Every component reads and writes desired state through the API server. kubectl, controllers, the scheduler and kubelets all talk to it." />
      <ServerNode id="k8s-etcd" kind="database" position={ETCD} label="etcd" sublabel="Raft · desired state" color={C.db} description="A strongly consistent key-value store (Raft) holding all cluster state. Losing etcd quorum freezes the control plane, though running pods keep running." />
      <ServerNode id="k8s-sched" kind="router" position={SCHED} label="scheduler" sublabel="binds pods → nodes" color={C.miss} description="Watches for unscheduled pods and picks a node by filtering (resources, taints, affinity) and scoring (spread, bin-packing)." />
      <ServerNode id="k8s-ctrl" kind="router" position={CTRL} label="controllers + HPA" sublabel={`Deployment replicas = ${replicas}`} color={C.gateway} description="Reconciliation loops: the Deployment/ReplicaSet controller keeps N pods alive; the Horizontal Pod Autoscaler changes N from CPU or custom metrics; the node controller evicts pods from NotReady nodes." />

      {NODE_X.map((x, i) => (
        <ServerNode key={x} id={`k8s-node-${i}`} kind="router" position={[x, Y, -3]} scale={0.6} label="kubelet" status={failure && i === 0 ? 'failed' : 'healthy'} color={C.public} description="The node agent: watches the API server for pods bound to its node, starts containers via the runtime, and reports status/heartbeats." />
      ))}
      {pods.map((p) => (
        <ServerNode key={`pod-${p.k}`} id={`k8s-pod-${p.k}`} kind="server" position={p.pos} scale={0.55} labelSize={16} label={`web-${p.k + 1}`} color={C.server} description="A pod: one or more containers sharing a network namespace. Pods are disposable — the controller recreates them elsewhere if their node dies." />
      ))}

      <NetworkLink from={USER} to={INGRESS} color={C.gateway} />
      <NetworkLink from={API} to={ETCD} color={C.db} />
      <NetworkLink from={SCHED} to={API} color={C.miss} dashed />
      <NetworkLink from={CTRL} to={SCHED} color={C.gateway} dashed />
      {NODE_X.map((x, i) => (
        <NetworkLink key={x} from={API} to={[x, Y, -3]} arc={0.8} color={C.hybrid} dashed status={failure && i === 0 ? 'down' : 'active'} label={failure && i === 0 ? 'heartbeat lost' : undefined} />
      ))}
      {pods.map((p) => (
        <NetworkLink key={`l${p.k}`} from={INGRESS} to={p.pos} color={C.gateway} width={1} />
      ))}

      {pods.map((p) => (
        <PacketFlow key={`f${p.k}-${p.node}`} waypoints={[USER, INGRESS, p.pos, INGRESS, USER]} color={C.request} returnColor={C.response} max={3} size={0.11} seed={p.k} />
      ))}
      <PacketFlow waypoints={[API, ETCD, API]} color={C.db} returnColor={C.response} max={3} size={0.09} />
      <PacketFlow waypoints={[CTRL, SCHED, API]} color={C.gateway} max={2} size={0.09} speed={0.6} />
    </group>
  );
}
