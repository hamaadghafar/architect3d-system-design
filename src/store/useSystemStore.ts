import { create } from 'zustand';
import type { LinkMode, TabId, Vec3 } from '../types';
import type { NodeKind, NodeStatus } from '../components/three/ServerNode';
import { DEFAULT_TOPIC_ID, findTopic } from '../content/curriculum';

export interface SelectedNode {
  id: string;
  label: string;
  kind: NodeKind;
  status: NodeStatus;
  description: string;
  /** Secondary technical details (sublabel, status) shown in the inspector, not in 3D space. */
  specs: string[];
}

/**
 * Camera goal consumed by <CameraRig>. A new object (new nonce) = a new transition.
 * If `position` is omitted the rig keeps the current viewing direction and
 * moves to `distance` from the target. With `fit`, `position`/`target` only give
 * the viewing direction and the rig frames the whole registered topology.
 */
export interface CameraFocus {
  target: Vec3;
  position?: Vec3;
  distance?: number;
  fit?: boolean;
  nonce: number;
}

interface SystemState {
  moduleId: string;
  topicId: string;
  tab: TabId;
  sidebarOpen: boolean;

  // ---- simulation (UI → 3D). Read transiently inside useFrame via getState(). ----
  trafficRate: number; // 1..100
  failure: boolean;
  cacheHit: boolean;
  linkMode: LinkMode;
  variant: string;
  paused: boolean;

  selectedNode: SelectedNode | null;
  hoveredNode: SelectedNode | null;
  focus: CameraFocus;
  /** One-shot orbit request from the view buttons / keyboard. */
  cameraNudge: CameraNudge | null;
  autoRotate: boolean;
  infoOpen: boolean;

  setTopic: (topicId: string) => void;
  setTab: (tab: TabId) => void;
  toggleSidebar: () => void;
  setTrafficRate: (rate: number) => void;
  toggleFailure: () => void;
  toggleCache: () => void;
  setLinkMode: (mode: LinkMode) => void;
  setVariant: (variant: string) => void;
  togglePaused: () => void;
  selectNode: (node: SelectedNode, position: Vec3) => void;
  /** Pass `null` + the id leaving hover; ignored if another node is hovered by then. */
  setHoveredNode: (node: SelectedNode | null, leavingId?: string) => void;
  clearSelection: () => void;
  resetCamera: () => void;
  resetSimulation: () => void;
  nudgeCamera: (yaw: number, pitch: number, zoom?: number) => void;
  /** Re-frame the whole topology from a preset direction. */
  setViewPreset: (preset: ViewPreset) => void;
  toggleAutoRotate: () => void;
  toggleInfo: () => void;
}

export type ViewPreset = 'top' | 'front' | 'side' | 'below';

/** Viewing directions (camera offset from target) for each preset; small offsets avoid gimbal-lock at the poles. */
const PRESET_DIR: Record<ViewPreset, Vec3> = {
  top: [0, 1, 0.02],
  front: [0, 0.45, 1],
  side: [1, 0.45, 0],
  below: [0, -0.6, 1],
};

export interface CameraNudge {
  yaw: number;
  pitch: number;
  zoom: number;
  nonce: number;
}

let nonce = 0;

function topicDefaults(topicId: string) {
  const found = findTopic(topicId);
  if (!found) throw new Error(`Unknown topic ${topicId}`);
  const { module, topic } = found;
  return {
    moduleId: module.id,
    topicId: topic.id,
    variant: topic.controls.variants?.[0]?.id ?? 'default',
    failure: false,
    cacheHit: true,
    linkMode: 'dx' as LinkMode,
    selectedNode: null,
    hoveredNode: null,
    focus: { ...topic.camera, fit: true, nonce: ++nonce },
  };
}

/**
 * Initial state from the URL: the topic comes from `/topics/:moduleId/:topicId[/lab]`,
 * and optional query params pre-set the simulation:
 * `?failure=1&cache=0&link=vpn&variant=l7&rate=80`.
 */
function readUrl(): Partial<SystemState> {
  if (typeof window === 'undefined') return {};
  const parts = window.location.pathname.split('/').filter(Boolean);
  const topicId = parts[0] === 'topics' ? parts[2] : undefined;
  if (!topicId || !findTopic(topicId)) return {};
  const q = new URLSearchParams(window.location.search);
  const out: Partial<SystemState> = { ...topicDefaults(topicId) };
  if (q.has('failure')) out.failure = q.get('failure') === '1';
  if (q.has('cache')) out.cacheHit = q.get('cache') !== '0';
  if (q.get('link') === 'vpn' || q.get('link') === 'dx') out.linkMode = q.get('link') as LinkMode;
  if (q.get('variant')) out.variant = q.get('variant')!;
  if (q.get('rate')) out.trafficRate = Math.min(100, Math.max(1, Number(q.get('rate')) || 45));
  return out;
}

export const useSystemStore = create<SystemState>()((set, get) => ({
  ...topicDefaults(DEFAULT_TOPIC_ID),
  tab: 'fundamentals',
  sidebarOpen: true,
  trafficRate: 45,
  paused: false,
  cameraNudge: null,
  autoRotate: false,
  infoOpen: true,
  ...readUrl(),

  setTopic: (topicId) => {
    if (topicId === get().topicId || !findTopic(topicId)) return;
    set({ ...topicDefaults(topicId) });
  },
  setTab: (tab) => set({ tab }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setTrafficRate: (trafficRate) => set({ trafficRate: Math.min(100, Math.max(1, trafficRate)) }),
  toggleFailure: () => set((s) => ({ failure: !s.failure })),
  toggleCache: () => set((s) => ({ cacheHit: !s.cacheHit })),
  setLinkMode: (linkMode) => set({ linkMode }),
  setVariant: (variant) => set({ variant }),
  togglePaused: () => set((s) => ({ paused: !s.paused })),
  selectNode: (node, position) =>
    set({ selectedNode: node, focus: { target: position, distance: 13, nonce: ++nonce } }),
  setHoveredNode: (node, leavingId) => {
    if (node) set({ hoveredNode: node });
    else if (!leavingId || get().hoveredNode?.id === leavingId) set({ hoveredNode: null });
  },
  clearSelection: () => {
    if (get().selectedNode) set({ selectedNode: null });
  },
  resetCamera: () => {
    const found = findTopic(get().topicId);
    if (found) set({ selectedNode: null, focus: { ...found.topic.camera, fit: true, nonce: ++nonce } });
  },
  nudgeCamera: (yaw, pitch, zoom = 1) => set({ cameraNudge: { yaw, pitch, zoom, nonce: ++nonce } }),
  setViewPreset: (preset) => set({ autoRotate: false, focus: { target: [0, 0, 0], position: PRESET_DIR[preset], fit: true, nonce: ++nonce } }),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  toggleInfo: () => set((s) => ({ infoOpen: !s.infoOpen })),
  resetSimulation: () => {
    const { topicId } = get();
    set({ ...topicDefaults(topicId), trafficRate: 45, paused: false });
  },
}));

/** Convenience hook for the active topic + module. */
export function useActiveTopic() {
  const topicId = useSystemStore((s) => s.topicId);
  const found = findTopic(topicId);
  if (!found) throw new Error(`Unknown topic ${topicId}`);
  return found;
}
