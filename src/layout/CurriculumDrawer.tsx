import { useEffect } from 'react';
import { BookOpen, X } from 'lucide-react';
import { CURRICULUM } from '../content/curriculum';
import { topicPath } from '../router';
import { Link } from '../components/Link';
import { MODULE_ICONS } from './moduleIcons';

/** Slide-over list of the full syllabus. Closed by default so it never steals reading width. */
export function CurriculumDrawer({ open, onClose, activeTopicId }: { open: boolean; onClose: () => void; activeTopicId?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} />
      <aside
        role="dialog"
        aria-label="All topics"
        className={`absolute inset-y-0 left-0 flex w-[400px] max-w-[92vw] flex-col border-r border-slate-800 bg-[#0B1120] shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 px-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <BookOpen size={17} className="text-cyan-300" /> All Topics
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-5">
          {CURRICULUM.map((m) => {
            const Icon = MODULE_ICONS[m.number];
            return (
              <div key={m.id} className="mb-6">
                <div className="mb-2 flex items-center gap-2.5 px-2">
                  <Icon size={15} className="text-cyan-300/80" />
                  <span className="font-mono text-[11px] text-slate-500">{String(m.number).padStart(2, '0')}</span>
                  <span className="text-[13px] font-semibold text-slate-200">{m.title}</span>
                </div>
                <ul className="space-y-0.5 border-l border-slate-800 pl-3 ml-[15px]">
                  {m.topics.map((t, i) => {
                    const active = t.id === activeTopicId;
                    return (
                      <li key={t.id}>
                        <Link
                          to={topicPath(m.id, t.id)}
                          onClick={onClose}
                          className={`flex gap-2.5 rounded-lg px-3 py-2 text-[14px] leading-snug transition-colors ${active ? 'bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-500/30' : 'text-slate-300 hover:bg-slate-800/70 hover:text-slate-100'}`}
                        >
                          <span className="mt-px font-mono text-[11px] text-slate-500">
                            {m.number}.{i + 1}
                          </span>
                          {t.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
