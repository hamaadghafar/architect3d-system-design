import { Box, ChevronRight, Menu } from 'lucide-react';
import { labPath, topicPath, type Route } from '../router';
import { Link } from '../components/Link';
import { topicRef } from '../content/navigation';

/** Glowing primary CTA used in the header and on every topic page. */
export function LaunchButton({ moduleId, topicId, size = 'md' }: { moduleId: string; topicId: string; size?: 'md' | 'lg' }) {
  const lg = size === 'lg';
  return (
    <Link
      to={labPath(moduleId, topicId)}
      className={`group inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 font-semibold text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.45)] ring-1 ring-cyan-300/60 transition hover:shadow-[0_0_36px_rgba(34,211,238,0.7)] hover:brightness-110 ${lg ? 'px-6 py-3.5 text-[16px]' : 'px-3.5 py-2 text-[13px]'}`}
    >
      <Box size={lg ? 20 : 16} className="transition-transform group-hover:rotate-12" />
      {lg ? 'Launch Interactive 3D Model (Full Screen)' : 'Launch Interactive 3D Model'}
    </Link>
  );
}

export function TopNav({ route, onOpenDrawer }: { route: Route; onOpenDrawer: () => void }) {
  const ref = route.name === 'topic' ? topicRef(route.topicId) : undefined;

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-slate-800/80 bg-[#0B1120]/85 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center gap-4 px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Architect3D home">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-500/30 to-violet-500/30 ring-1 ring-cyan-400/40">
            <Box size={16} className="text-cyan-300" />
          </span>
          <span className="text-[15px] font-bold tracking-tight text-slate-100">Architect3D</span>
        </Link>

        <button
          onClick={onOpenDrawer}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-700/80 px-3 py-1.5 text-[13px] font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
        >
          <Menu size={15} /> <span className="hidden sm:inline">Browse All Topics</span>
        </button>

        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-[13px] text-slate-400 lg:flex">
          <Link to="/" className="hover:text-slate-200">
            Home
          </Link>
          {ref && (
            <>
              <ChevronRight size={14} className="shrink-0 text-slate-600" />
              <Link to={topicPath(ref.module.id, ref.module.topics[0].id)} className="shrink-0 hover:text-slate-200">
                Module {ref.module.number}
              </Link>
              <ChevronRight size={14} className="shrink-0 text-slate-600" />
              <span className="truncate text-slate-200">{ref.topic.title}</span>
            </>
          )}
        </nav>

        <div className="ml-auto">{ref && <LaunchButton moduleId={ref.module.id} topicId={ref.topic.id} />}</div>
      </div>
    </header>
  );
}
