import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSystemStore } from '../../store/useSystemStore';
import { C } from '../../three/palette';
import { latLon } from '../../three/paths';
import { ANYCAST_CLIENTS as CLIENTS, FAILED_POP, GLOBE_CENTER, GLOBE_RADIUS as R, POPS, greatCircleKm, nearestPop } from '../sceneLogic';
import { ServerNode } from '../../components/three/ServerNode';
import { NetworkLink } from '../../components/three/NetworkLink';
import { PacketFlow } from '../../components/three/PacketFlow';

function Globe() {
  const wire = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (wire.current) wire.current.rotation.y += delta * 0.02;
  });
  return (
    <group position={GLOBE_CENTER}>
      <mesh raycast={() => null}>
        <sphereGeometry args={[R - 0.05, 64, 48]} />
        <meshStandardMaterial color="#07182b" emissive="#041222" roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh ref={wire} raycast={() => null}>
        <sphereGeometry args={[R, 36, 18]} />
        <meshBasicMaterial color="#1d4f73" wireframe transparent opacity={0.35} toneMapped={false} />
      </mesh>
      <mesh raycast={() => null} scale={1.06}>
        <sphereGeometry args={[R, 48, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.05} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function AnycastScene() {
  const failure = useSystemStore((s) => s.failure);
  const variant = useSystemStore((s) => s.variant);
  const unicast = variant === 'unicast';

  const popPos = useMemo(() => POPS.map((p) => latLon(p.lat, p.lon, R + 0.25, GLOBE_CENTER)), []);
  const clientPos = useMemo(() => CLIENTS.map((c) => latLon(c.lat, c.lon, R + 0.2, GLOBE_CENTER)), []);

  const assignment = CLIENTS.map((_, i) => (unicast ? 0 : nearestPop(i, failure ? FAILED_POP : null)));

  return (
    <group>
      <Globe />
      {POPS.map((p, i) => {
        const down = !unicast && failure && i === FAILED_POP;
        const unused = unicast && i !== 0;
        return (
          <ServerNode
            key={p.name}
            id={`any-pop-${i}`}
            kind="pop"
            position={popPos[i]}
            scale={0.55}
            labelSize={11}
            faceCenter={GLOBE_CENTER}
            label={`${p.name} PoP`}
            sublabel={unicast ? (i === 0 ? '203.0.113.10 (only origin)' : 'not announcing') : down ? 'BGP route withdrawn' : 'announces 1.1.1.0/24'}
            status={down ? 'failed' : unused ? 'idle' : 'healthy'}
            color={C.edge}
            description="An anycast point of presence. Every PoP announces the same IP prefix via BGP; Internet routers deliver each packet to the 'closest' announcement by BGP path selection. Withdraw the route and traffic shifts to the next-best PoP within seconds."
          />
        );
      })}
      {CLIENTS.map((c, i) => (
        <ServerNode key={c.name} id={`any-client-${i}`} kind="client" position={clientPos[i]} scale={0.42} labelSize={10} faceCenter={GLOBE_CENTER} label={c.name} color={C.client} description="A user resolving and connecting to the anycast IP. The client has no idea which PoP answers — routing alone decides." />
      ))}

      {CLIENTS.map((_, i) => {
        const pop = assignment[i];
        const km = greatCircleKm(i, pop);
        const arc = 0.35 + km / 9000;
        const rerouted = failure && !unicast && nearestPop(i, null) === FAILED_POP;
        return (
          <group key={`${i}-${pop}`}>
            <NetworkLink from={clientPos[i]} to={popPos[pop]} radial center={GLOBE_CENTER} arc={arc} color={rerouted ? C.miss : C.edge} dashed={rerouted} width={1.2} />
            <PacketFlow
              waypoints={[clientPos[i], popPos[pop], clientPos[i]]}
              radial
              center={GLOBE_CENTER}
              arc={arc}
              color={rerouted ? C.miss : C.request}
              returnColor={C.response}
              size={0.09}
              max={5}
              seed={i}
            />
          </group>
        );
      })}
    </group>
  );
}
