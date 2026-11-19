import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const ALICE: Vec3 = [-12, Y, -3];
const BOB: Vec3 = [12, Y, 3];
const GW1: Vec3 = [-6, Y, -3];
const GW2: Vec3 = [6, Y, 3];
const CHAT: Vec3 = [0, Y, 0];
const STORE: Vec3 = [0, Y, -6.5];
const SESS: Vec3 = [-4, Y, 6];
const PUSH: Vec3 = [7, Y, -5.5];

export function ChatScene() {
  const offline = useSystemStore((s) => s.failure);

  return (
    <group>
      <ServerNode id="ch-alice" kind="client" position={ALICE} label="Alice" sublabel="sends “hi 👋”" color={C.client} description="Each client keeps one long-lived WebSocket (or MQTT) connection to a gateway for real-time, bidirectional delivery." />
      <ServerNode id="ch-bob" kind="client" position={BOB} label="Bob" sublabel={offline ? 'offline (app closed)' : 'online'} status={offline ? 'idle' : 'healthy'} color={C.client} description="The recipient. Online: message pushed down his open socket. Offline: stored, then a push notification wakes his device." />
      <ServerNode id="ch-gw1" kind="gateway" position={GW1} label="WS gateway 1" sublabel="~100k+ connections" color={C.gateway} description="Connection servers hold sockets, handle heartbeats and fan messages to/from the chat service. Scale horizontally; connections are sticky to one gateway." />
      <ServerNode id="ch-gw2" kind="gateway" position={GW2} label="WS gateway 2" status={offline ? 'idle' : 'healthy'} color={C.gateway} description="Bob’s gateway. The chat service finds it through the session registry." />
      <ServerNode id="ch-chat" kind="hub" position={CHAT} scale={1.3} label="Chat service" sublabel="assign seq id · persist · route" color={C.hybrid} description="Assigns a per-conversation sequence number (ordering), persists the message, then routes it to the recipient’s gateway or to the push pipeline." />
      <ServerNode id="ch-store" kind="database" position={STORE} scale={1.2} label="Message store" sublabel="Cassandra · partition = chat_id" color={C.db} description="Write-heavy, append-only storage partitioned by conversation and clustered by sequence/time — efficient 'last N messages' queries and sync on reconnect." />
      <ServerNode id="ch-sess" kind="cache" position={SESS} label="Session registry" sublabel={offline ? 'bob → offline' : 'bob → gateway-2'} color={C.cache} description="Redis map of user → gateway connection(s), with TTL refreshed by heartbeats. Also feeds presence (online / last seen)." />
      <ServerNode id="ch-push" kind="router" position={PUSH} label="Push service" sublabel="APNs / FCM" status={offline ? 'healthy' : 'idle'} color={C.miss} description="When the recipient has no live connection, a push notification is sent through Apple/Google. The app then reconnects and syncs missed messages from the store." />

      <NetworkLink from={ALICE} to={GW1} color={C.gateway} width={3} label="WebSocket" />
      <NetworkLink from={BOB} to={GW2} color={C.gateway} width={3} status={offline ? 'idle' : 'active'} label={offline ? 'disconnected' : 'WebSocket'} />
      <NetworkLink from={GW1} to={CHAT} color={C.hybrid} />
      <NetworkLink from={CHAT} to={GW2} color={C.hybrid} status={offline ? 'idle' : 'active'} />
      <NetworkLink from={CHAT} to={STORE} color={C.db} label="INSERT" />
      <NetworkLink from={CHAT} to={SESS} color={C.cache} dashed label="lookup bob" />
      <NetworkLink from={CHAT} to={PUSH} color={C.miss} dashed status={offline ? 'active' : 'idle'} />
      <NetworkLink from={PUSH} to={BOB} arc={1.5} color={C.miss} dashed status={offline ? 'active' : 'idle'} label={offline ? 'push notification' : undefined} />

      <PacketFlow waypoints={[ALICE, GW1, CHAT, STORE, CHAT]} color={C.write} returnColor={C.response} turnAt={3} max={5} />
      <PacketFlow waypoints={[CHAT, SESS, CHAT]} color={C.cache} max={2} size={0.1} speed={0.8} />
      {!offline && <PacketFlow key="deliver" waypoints={[CHAT, GW2, BOB]} color={C.write} max={5} seed={2} />}
      {!offline && <PacketFlow key="ack" waypoints={[BOB, GW2, CHAT, GW1, ALICE]} color={C.response} max={3} size={0.1} seed={4} />}
      {offline && <PacketFlow key="push" waypoints={[CHAT, PUSH, BOB]} arc={0.8} color={C.miss} max={3} size={0.13} speed={0.7} />}
    </group>
  );
}
