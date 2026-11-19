import type { ReactNode } from 'react';
import { Grid, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { CameraRig } from './CameraRig';
import { useSystemStore } from '../../store/useSystemStore';
import { SpreadContext } from '../../three/layout';

/**
 * Shared environment: lights, floor grid, starfield, controls and the camera rig.
 * `spread` widens the horizontal spacing of every primitive in the scene.
 */
export function SceneStage({ children, spread = 1 }: { children: ReactNode; spread?: number }) {
  const autoRotate = useSystemStore((s) => s.autoRotate);
  return (
    <>
      <color attach="background" args={['#0B1120']} />
      <fog attach="fog" args={['#0B1120', 75, 190]} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#bae6fd', '#0b1220', 0.7]} />
      <directionalLight position={[10, 20, 12]} intensity={1.8} />
      <directionalLight position={[-12, 10, -10]} intensity={0.7} color="#c4b5fd" />
      <directionalLight position={[0, -12, 6]} intensity={0.45} color="#7dd3fc" />
      <pointLight position={[-14, 9, -6]} intensity={70} distance={50} color="#38bdf8" />
      <pointLight position={[14, 7, 9]} intensity={55} distance={50} color="#a855f7" />

      <Grid
        position={[0, 0, 0]}
        args={[160, 160]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#0f2a3d"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#1a5577"
        fadeDistance={130}
        fadeStrength={1.6}
        side={THREE.DoubleSide}
        infiniteGrid
      />
      <Stars radius={110} depth={50} count={2500} factor={3.5} saturation={0} fade speed={0.4} />

      {/* Full freedom: orbit 360° horizontally and from directly above to underneath. */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.8}
        minDistance={3}
        maxDistance={140}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
        autoRotate={autoRotate}
        autoRotateSpeed={0.9}
      />
      <CameraRig />
      <SpreadContext.Provider value={spread}>{children}</SpreadContext.Provider>
    </>
  );
}
