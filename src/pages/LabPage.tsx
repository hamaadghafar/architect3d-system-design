import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { useShallow } from 'zustand/react/shallow';
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Crosshair,
  Gauge,
  Info,
  MousePointerClick,
  RefreshCw,
  RotateCcw,
  TriangleAlert,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { ViewPreset } from '../store/useSystemStore';
import { SceneStage } from '../components/three/SceneStage';
import { SCENES } from '../scenes/registry';
import { useSystemStore } from '../store/useSystemStore';
import { topicRef } from '../content/navigation';
import { navigate, topicPath } from '../router';
import { Link } from '../components/Link';
import type { ControlConfig, Metric } from '../types';

const DEFAULT_SPREAD = 1.4;

const TONE: Record<NonNullable<Metric['tone']>, string> = {
  good: 'text-emerald-300',
  warn: 'text-amber-300',
  bad: 'text-rose-300',
  info: 'text-sky-300',
};

/* ---------- small dock widgets ---------- */

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center rounded-xl bg-slate-900/80 p-1 ring-1 ring-slate-700/80">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${value === o.id ? 'bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/50' : 'text-slate-400 hover:text-slate-100'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Architecture-mode control: whichever dimensions this topic has (variant, link type, cache state). */
function ModeControls({ c }: { c: ControlConfig }) {
  const s = useSystemStore(
    useShallow((st) => ({
      variant: st.variant,
      setVariant: st.setVariant,
      linkMode: st.linkMode,
      setLinkMode: st.setLinkMode,
      cacheHit: st.cacheHit,
      toggleCache: st.toggleCache,
    })),
  );
  const cache = c.cacheLabels ?? { label: 'Cache', on: 'HIT', off: 'MISS' };
  return (
    <>
      {c.variants && <Segmented value={s.variant} onChange={s.setVariant} options={c.variants} />}
      {c.link && (
        <Segmented
          value={s.linkMode}
          onChange={s.setLinkMode}
          options={[
            { id: 'dx', label: 'Direct Connect' },
            { id: 'vpn', label: 'Site-to-Site VPN' },
          ]}
        />
      )}
      {c.cache && (
        <Segmented
          value={s.cacheHit ? 'on' : 'off'}
          onChange={(v) => {
            if ((v === 'on') !== s.cacheHit) s.toggleCache();
          }}
          options={[
            { id: 'on', label: `${cache.label}: ${cache.on}` },
            { id: 'off', label: cache.off },
          ]}
        />
      )}
    </>
  );
}

function InspectorPill() {
  const hovered = useSystemStore((s) => s.hoveredNode);
  const selected = useSystemStore((s) => s.selectedNode);
  const node = hovered ?? selected;
  if (!node) {
    return (
      <div className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-slate-900/80 px-3 py-2 text-[13px] text-slate-500 ring-1 ring-slate-700/80">
        <MousePointerClick size={14} /> Hover a component
      </div>
    );
  }
  const failed = node.status === 'failed';
  return (
    <div className="flex max-w-[360px] items-center gap-2 rounded-xl bg-slate-900/80 px-3 py-2 text-[13px] ring-1 ring-cyan-500/40">
      <span className={`h-2 w-2 shrink-0 rounded-full ${failed ? 'bg-rose-400' : node.status === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      <span className="shrink-0 font-semibold text-slate-100">{node.label}</span>
      {node.specs.length > 0 && <span className="truncate font-mono text-[12px] text-slate-400">{node.specs.join(' · ')}</span>}
    </div>
  );
}

/** Description card for a clicked node — appears above the dock, never over the scene centre. */
function SelectedCard() {
  const node = useSystemStore((s) => s.selectedNode);
  const clear = useSystemStore((s) => s.clearSelection);
  if (!node) return null;
  return (
    <div className="pointer-events-auto mx-auto mb-3 w-full max-w-xl rounded-2xl border border-cyan-500/30 bg-slate-950/85 p-4 shadow-2xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300/80">{node.kind}</div>
          <div className="text-[16px] font-semibold text-slate-100">{node.label}</div>
          {node.specs.length > 0 && <div className="mt-0.5 font-mono text-[12px] text-slate-400">{node.specs.join(' · ')}</div>}
        </div>
        <button onClick={clear} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200" aria-label="Close inspector">
          <X size={15} />
        </button>
      </div>
      <p className="mt-2 text-[14.5px] leading-[1.7] text-slate-300">{node.description}</p>
    </div>
  );
}

function TelemetryPanel({ sceneId, onClose }: { sceneId: keyof typeof SCENES; onClose: () => void }) {
  const entry = SCENES[sceneId];
  const sim = useSystemStore(
    useShallow((s) => ({ trafficRate: s.trafficRate, failure: s.failure, cacheHit: s.cacheHit, linkMode: s.linkMode, variant: s.variant })),
  );
  return (
    <div className="pointer-events-auto w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-700/80 bg-slate-950/85 p-4 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          <Activity size={14} className="text-cyan-300" /> Live telemetry
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200" aria-label="Close telemetry">
          <X size={14} />
        </button>
      </div>
      <p className="mt-3 text-[13.5px] leading-[1.65] text-slate-300">{entry.narrate(sim)}</p>
      <dl className="mt-3 space-y-1.5 border-t border-slate-800 pt-3">
        {entry.metrics(sim).map((m) => (
          <div key={m.label} className="flex items-baseline justify-between gap-3 text-[12.5px]">
            <dt className="text-slate-400">{m.label}</dt>
            <dd className={`text-right font-mono text-[12px] font-semibold ${m.tone ? TONE[m.tone] : 'text-slate-100'}`}>{m.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-800 pt-3">
        {entry.legend.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
            <span className="h-2 w-2 rounded-full" style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- rotation pad: up / down / left / right, zoom, presets ---------- */

/** A button that keeps nudging the camera while held (press-and-hold to rotate continuously). */
function HoldButton({ title, step, children, className = '' }: { title: string; step: () => void; children: ReactNode; className?: string }) {
  const timer = useRef<number | null>(null);
  const stop = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  return (
    <button
      title={title}
      aria-label={title}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        stop();
        step();
        timer.current = window.setInterval(step, 70);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          step();
        }
      }}
      className={`grid h-10 w-10 select-none place-items-center rounded-lg bg-slate-900/80 text-slate-200 ring-1 ring-slate-700/80 transition-colors hover:bg-slate-800 hover:text-cyan-200 active:bg-cyan-500/20 ${className}`}
    >
      {children}
    </button>
  );
}

const PRESETS: { id: ViewPreset; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'front', label: 'Front' },
  { id: 'side', label: 'Side' },
  { id: 'below', label: 'Below' },
];

function RotationPad() {
  const nudge = useSystemStore((s) => s.nudgeCamera);
  const autoRotate = useSystemStore((s) => s.autoRotate);
  const toggleAutoRotate = useSystemStore((s) => s.toggleAutoRotate);
  const setViewPreset = useSystemStore((s) => s.setViewPreset);
  const YAW = 0.12;
  const PITCH = 0.08;

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-2xl border border-slate-700/70 bg-slate-950/75 p-2.5 shadow-2xl backdrop-blur-md">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Rotate</div>
      <div className="grid grid-cols-3 gap-1.5">
        <span />
        <HoldButton title="Rotate up (view from above)" step={() => nudge(0, -PITCH)}>
          <ArrowUp size={17} />
        </HoldButton>
        <span />
        <HoldButton title="Rotate left" step={() => nudge(-YAW, 0)}>
          <ArrowLeft size={17} />
        </HoldButton>
        <button
          title="Auto-rotate"
          aria-label="Auto-rotate"
          aria-pressed={autoRotate}
          onClick={toggleAutoRotate}
          className={`grid h-10 w-10 place-items-center rounded-lg ring-1 transition-colors ${autoRotate ? 'bg-cyan-500/25 text-cyan-100 ring-cyan-400/60' : 'bg-slate-900/80 text-slate-300 ring-slate-700/80 hover:text-cyan-200'}`}
        >
          <RefreshCw size={16} className={autoRotate ? 'animate-spin [animation-duration:3s]' : ''} />
        </button>
        <HoldButton title="Rotate right" step={() => nudge(YAW, 0)}>
          <ArrowRight size={17} />
        </HoldButton>
        <span />
        <HoldButton title="Rotate down (view from below)" step={() => nudge(0, PITCH)}>
          <ArrowDown size={17} />
        </HoldButton>
        <span />
      </div>
      <div className="flex gap-1.5">
        <HoldButton title="Zoom in" step={() => nudge(0, 0, 0.94)}>
          <ZoomIn size={16} />
        </HoldButton>
        <HoldButton title="Zoom out" step={() => nudge(0, 0, 1.06)}>
          <ZoomOut size={16} />
        </HoldButton>
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">View</div>
      <div className="grid grid-cols-2 gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setViewPreset(p.id)}
            className="rounded-lg bg-slate-900/80 px-2 py-1.5 text-[12px] font-medium text-slate-300 ring-1 ring-slate-700/80 transition-colors hover:text-cyan-200 hover:ring-cyan-500/50"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export function LabPage({ moduleId, topicId }: { moduleId: string; topicId: string }) {
  const ref = topicRef(topicId);
  const [telemetry, setTelemetry] = useState(false);
  const s = useSystemStore(
    useShallow((st) => ({
      trafficRate: st.trafficRate,
      setTrafficRate: st.setTrafficRate,
      failure: st.failure,
      toggleFailure: st.toggleFailure,
      resetCamera: st.resetCamera,
      resetSimulation: st.resetSimulation,
      clearSelection: st.clearSelection,
    })),
  );

  // Lock page scroll; Esc returns to reading; arrow keys orbit, +/- zoom.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape') {
        navigate(topicPath(moduleId, topicId));
        return;
      }
      const map: Record<string, [number, number, number]> = {
        ArrowLeft: [-0.4, 0, 1],
        ArrowRight: [0.4, 0, 1],
        ArrowUp: [0, -0.25, 1],
        ArrowDown: [0, 0.25, 1],
        '+': [0, 0, 0.82],
        '=': [0, 0, 0.82],
        '-': [0, 0, 1.22],
      };
      const m = map[e.key];
      if (!m) return;
      e.preventDefault();
      useSystemStore.getState().nudgeCamera(...m);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [moduleId, topicId]);

  if (!ref) return null;
  const { topic, module } = ref;
  const entry = SCENES[topic.sceneId];
  const SceneComponent = entry.Component;
  const c = topic.controls;

  return (
    <div className="fixed inset-0 z-[60] h-screen w-screen bg-[#0B1120]">
      <Canvas camera={{ position: topic.camera.position, fov: 45, near: 0.1, far: 500 }} dpr={[1, 2]} gl={{ antialias: true, powerPreference: 'high-performance' }} onPointerMissed={s.clearSelection}>
        <Suspense fallback={null}>
          <SceneStage spread={entry.spread ?? DEFAULT_SPREAD}>
            <SceneComponent key={topic.id} />
          </SceneStage>
        </Suspense>
      </Canvas>

      {/* top-left: back to reading */}
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-3 md:left-6 md:top-6">
        <Link
          to={topicPath(module.id, topic.id)}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-xl bg-slate-950/80 px-4 py-2.5 text-[14px] font-semibold text-slate-100 ring-1 ring-slate-700 backdrop-blur-md transition hover:ring-cyan-400/60"
        >
          <ArrowLeft size={16} /> Back to Reading
        </Link>
        <div className="hidden rounded-xl bg-slate-950/60 px-3 py-2 backdrop-blur-md md:block">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300/80">Module {module.number} · 3D lab</div>
          <div className="text-[14px] font-semibold text-slate-100">{topic.title}</div>
        </div>
      </div>

      {/* top-right: telemetry on demand (closed by default) */}
      <div className="pointer-events-none absolute right-4 top-4 flex flex-col items-end gap-3 md:right-6 md:top-6">
        {!telemetry && (
          <button
            onClick={() => setTelemetry(true)}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-xl bg-slate-950/80 px-3.5 py-2.5 text-[13px] font-medium text-slate-300 ring-1 ring-slate-700 backdrop-blur-md hover:text-slate-100"
          >
            <Info size={15} /> Live telemetry
          </button>
        )}
        {telemetry && <TelemetryPanel sceneId={topic.sceneId} onClose={() => setTelemetry(false)} />}
      </div>

      {/* right edge: rotation pad (up / down / left / right, zoom, view presets) */}
      <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 sm:block md:right-6">
        <RotationPad />
      </div>

      {/* bottom: inspector card + slim control dock */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-4 md:pb-6">
        <SelectedCard />
        <div className="pointer-events-auto mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-700/70 bg-slate-950/75 p-2 shadow-2xl backdrop-blur-md">
          <ModeControls c={c} />
          {c.traffic && (
            <label className="flex items-center gap-2.5 rounded-xl bg-slate-900/80 px-3 py-2 ring-1 ring-slate-700/80" title="Traffic speed / request rate">
              <Gauge size={15} className="text-cyan-300" />
              <span className="whitespace-nowrap text-[13px] text-slate-400">Traffic</span>
              <input type="range" min={1} max={100} value={s.trafficRate} onChange={(e) => s.setTrafficRate(Number(e.target.value))} className="h-1 w-28 cursor-pointer accent-cyan-400 md:w-36" />
              <span className="w-9 text-right font-mono text-[12px] text-cyan-200">{s.trafficRate}%</span>
            </label>
          )}
          {c.failureLabel && (
            <button
              onClick={s.toggleFailure}
              title={c.failureLabel}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-[13px] font-semibold ring-1 transition-colors ${s.failure ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/50' : 'bg-rose-500/15 text-rose-200 ring-rose-500/50 hover:bg-rose-500/25'}`}
            >
              <TriangleAlert size={15} />
              {s.failure ? `Restore ${c.failureStates?.[1] ?? 'healthy'}` : `Simulate: ${c.failureLabel}`}
            </button>
          )}
          <button onClick={s.resetCamera} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-900/80 px-3 py-2 text-[13px] text-slate-300 ring-1 ring-slate-700/80 hover:text-slate-100" title="Reset camera">
            <Crosshair size={15} /> Reset camera
          </button>
          <button onClick={s.resetSimulation} className="rounded-xl bg-slate-900/80 p-2.5 text-slate-400 ring-1 ring-slate-700/80 hover:text-slate-100" title="Reset simulation">
            <RotateCcw size={14} />
          </button>
          <InspectorPill />
        </div>
      </div>
    </div>
  );
}
