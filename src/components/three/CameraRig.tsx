import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSystemStore, type CameraFocus, type CameraNudge } from '../../store/useSystemStore';
import { sceneBounds } from '../../three/layout';

const FILL = 0.75; // fraction of the viewport the topology should occupy

/**
 * Frame every registered scene point: keep the authored viewing direction, centre on the
 * bounding box, and iterate the distance until the projected extent fills ~75% of the view.
 */
function computeFit(fov: number, aspect: number, dirHint: THREE.Vector3) {
  const pts: THREE.Vector3[] = [];
  sceneBounds.forEach((list) => list.forEach((p) => pts.push(new THREE.Vector3(...p))));
  if (pts.length < 2) return null;
  const box = new THREE.Box3().setFromPoints(pts);
  const center = box.getCenter(new THREE.Vector3());
  const dir = dirHint.clone().normalize();
  const cam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
  const ndc = new THREE.Vector3();
  let dist = Math.max(box.getSize(new THREE.Vector3()).length(), 8);
  for (let i = 0; i < 5; i++) {
    cam.position.copy(center).addScaledVector(dir, dist);
    cam.lookAt(center);
    cam.updateMatrixWorld();
    let m = 0;
    for (const p of pts) {
      ndc.copy(p).project(cam);
      m = Math.max(m, Math.abs(ndc.x), Math.abs(ndc.y));
    }
    if (m <= 0) break;
    dist *= m / FILL;
  }
  return { position: center.clone().addScaledVector(dir, dist), target: center };
}

interface ControlsLike {
  target: THREE.Vector3;
  update: () => void;
  addEventListener: (type: 'start', fn: () => void) => void;
  removeEventListener: (type: 'start', fn: () => void) => void;
}

/**
 * Smoothly flies the camera + OrbitControls target to the latest focus in the store,
 * and applies orbit nudges (rotate left/right/up/down, zoom) from buttons or keys.
 * Subscribes to the store outside React's render cycle; all motion is ref mutation.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const goal = useRef({
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    active: false,
    pending: null as CameraFocus | null,
    waited: 0,
    nudge: null as CameraNudge | null,
  });
  const tmp = useRef({ offset: new THREE.Vector3(), sph: new THREE.Spherical() });

  useEffect(() => {
    goal.current.pending = useSystemStore.getState().focus;
    return useSystemStore.subscribe((s, prev) => {
      if (s.focus !== prev.focus) {
        goal.current.pending = s.focus;
        goal.current.waited = 0;
      }
      if (s.cameraNudge && s.cameraNudge !== prev.cameraNudge) goal.current.nudge = s.cameraNudge;
    });
  }, []);

  // User grabbing the camera cancels any in-flight transition.
  useEffect(() => {
    if (!controls) return;
    const stop = () => {
      goal.current.active = false;
    };
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener('start', stop);
  }, [controls]);

  useFrame((_, delta) => {
    if (!controls) return;
    const g = goal.current;
    // Fit requests wait a couple of frames so the newly mounted scene has registered its bounds.
    if (g.pending?.fit && g.waited < 2) {
      g.waited += 1;
    } else if (g.pending) {
      const f = g.pending;
      g.pending = null;
      g.waited = 0;
      g.target.set(...f.target);
      const persp = camera as THREE.PerspectiveCamera;
      const fit =
        f.fit && f.position
          ? computeFit(persp.fov ?? 45, size.width / Math.max(size.height, 1), new THREE.Vector3(...f.position).sub(new THREE.Vector3(...f.target)))
          : null;
      if (fit) {
        g.position.copy(fit.position);
        g.target.copy(fit.target);
      } else if (f.position) {
        // Topic views are authored for a ~1.3 aspect canvas; pull back on narrower canvases so the scene fits.
        const aspect = size.width / Math.max(size.height, 1);
        const fit = THREE.MathUtils.clamp(1.3 / aspect, 1, 1.8);
        g.position.set(...f.position).sub(g.target).multiplyScalar(fit).add(g.target);
      } else {
        const dir = camera.position.clone().sub(controls.target);
        if (dir.lengthSq() < 1e-6) dir.set(0, 0.6, 1);
        dir.normalize();
        dir.y = Math.max(dir.y, 0.35);
        g.position.copy(g.target).add(dir.normalize().multiplyScalar(f.distance ?? 11));
      }
      g.active = true;
    }
    if (g.nudge) {
      const n = g.nudge;
      g.nudge = null;
      // Start from wherever the camera is heading (or currently is).
      const base = g.active ? g.position : camera.position;
      const center = g.active ? g.target : controls.target;
      const { offset, sph } = tmp.current;
      offset.copy(base).sub(center);
      sph.setFromVector3(offset);
      sph.theta += n.yaw;
      sph.phi = THREE.MathUtils.clamp(sph.phi + n.pitch, 0.02, Math.PI - 0.02);
      sph.radius = THREE.MathUtils.clamp(sph.radius * n.zoom, 3, 90);
      offset.setFromSpherical(sph);
      g.target.copy(center);
      g.position.copy(center).add(offset);
      g.active = true;
    }
    if (!g.active) return;
    const k = 1 - Math.exp(-delta * 4);
    camera.position.lerp(g.position, k);
    controls.target.lerp(g.target, k);
    controls.update();
    if (camera.position.distanceToSquared(g.position) < 1e-3 && controls.target.distanceToSquared(g.target) < 1e-3) {
      g.active = false;
    }
  });

  return null;
}
