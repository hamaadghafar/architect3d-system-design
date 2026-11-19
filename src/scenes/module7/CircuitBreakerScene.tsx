import type { Vec3 } from '../../types';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

const Y = 0.65;
const CLIENTS: Vec3[] = [-4, 0, 4].map((z) => [-14, Y, z] as Vec3);
const SVC_A: Vec3 = [-6, Y, 0];
const BREAKER: Vec3 = [0, Y, 0];
const SVC_B: Vec3 = [7, Y, 0];
const FALLBACK: Vec3 = [0, Y, 6];

export function CircuitBreakerScene() {
  const variant = useSystemStore((s) => s.variant);
  const down = useSystemStore((s) => s.failure);
  const hasBreaker = variant === 'breaker';
  const open = hasBreaker && down;
  const exhausted = !hasBreaker && down;

  return (
    <group>
      {CLIENTS.map((p, i) => (
        <ServerNode key={i} id={`cb-c-${i}`} kind="client" position={p} label={`Users ${i + 1}`} color={C.client} description="Users of the checkout page (service A)." />
      ))}
      <ServerNode
        id="cb-a"
        kind="server"
        position={SVC_A}
        scale={1.2}
        label="checkout-svc (A)"
        sublabel={exhausted ? 'all threads blocked on B' : 'thread pool 200'}
        status={exhausted ? 'failed' : open ? 'degraded' : 'healthy'}
        color={C.server}
        description="Service A calls B on every request. If B hangs and A waits, A’s threads/connections fill up and A fails too — a cascading failure."
      />
      <ServerNode
        id="cb-breaker"
        kind="vpn"
        position={BREAKER}
        scale={1.1}
        label={hasBreaker ? `Circuit breaker: ${open ? 'OPEN' : 'CLOSED'}` : 'No breaker'}
        sublabel={hasBreaker ? (open ? 'fail fast · probe in 30 s (half-open)' : 'errors < 50% threshold') : 'calls wait for timeout'}
        status={!hasBreaker ? 'idle' : open ? 'degraded' : 'healthy'}
        color={C.miss}
        description="A breaker counts failures/timeouts. CLOSED: calls pass through. OPEN (threshold exceeded): calls fail immediately with a fallback, giving B time to recover. HALF-OPEN: after a cool-down, a few trial calls decide whether to close again."
      />
      <ServerNode id="cb-b" kind="server" position={SVC_B} scale={1.2} label="recommendations-svc (B)" sublabel={down ? 'hanging · 30 s timeouts' : 'p99 40 ms'} status={down ? 'failed' : 'healthy'} color={C.hybrid} description="A non-critical dependency. When it is slow, the best thing callers can do is stop calling it for a while." />
      <ServerNode id="cb-fb" kind="cache" position={FALLBACK} label="Fallback" sublabel="cached / default recommendations" status={open ? 'healthy' : 'idle'} color={C.response} description="Graceful degradation: show popular items instead of personalised ones, so the page still works." />

      {CLIENTS.map((p, i) => (
        <NetworkLink key={i} from={p} to={SVC_A} color={C.edge} status={exhausted ? 'degraded' : 'active'} />
      ))}
      <NetworkLink from={SVC_A} to={BREAKER} color={C.miss} />
      <NetworkLink from={BREAKER} to={SVC_B} color={C.hybrid} status={open ? 'down' : down ? 'degraded' : 'active'} label={open ? 'short-circuited' : down ? 'waiting for timeout…' : undefined} />
      <NetworkLink from={BREAKER} to={FALLBACK} color={C.response} dashed status={open ? 'active' : 'idle'} />

      {CLIENTS.map((p, i) => (
        <PacketFlow key={`c${i}-${exhausted}`} waypoints={[p, SVC_A, p]} color={C.request} returnColor={exhausted ? C.error : C.response} speed={exhausted ? 0.25 : 1} max={5} seed={i} />
      ))}
      {!down && <PacketFlow key="ok" waypoints={[SVC_A, BREAKER, SVC_B, BREAKER, SVC_A]} color={C.request} returnColor={C.response} max={6} />}
      {exhausted && <PacketFlow key="hang" waypoints={[SVC_A, BREAKER, SVC_B, BREAKER, SVC_A]} color={C.request} returnColor={C.error} max={10} speed={0.2} />}
      {open && (
        <>
          <PacketFlow key="ff" waypoints={[SVC_A, BREAKER, FALLBACK, BREAKER, SVC_A]} color={C.request} returnColor={C.response} max={6} speed={1.3} />
          <PacketFlow key="probe" waypoints={[BREAKER, SVC_B, BREAKER]} color={C.miss} returnColor={C.error} max={1} size={0.1} speed={0.3} />
        </>
      )}
    </group>
  );
}
