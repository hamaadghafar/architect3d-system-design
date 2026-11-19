import { ArrowRight, Box } from 'lucide-react';
import { CURRICULUM } from '../content/curriculum';
import { ALL_TOPICS, TOTAL_QUESTIONS, moduleLevel } from '../content/navigation';
import { topicPath } from '../router';
import { Link } from '../components/Link';
import { MODULE_ICONS } from '../layout/moduleIcons';

export function HomePage() {
  const first = ALL_TOPICS[0];
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-800/80">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.12),transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-24">
          <div className="text-[13px] font-semibold uppercase tracking-[0.2em] text-cyan-300/90">Interactive technical textbook</div>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-100 md:text-5xl md:leading-[1.1]">
            System design & cloud infrastructure, explained — then explored in 3D.
          </h1>
          <p className="mt-6 max-w-[68ch] text-[18px] leading-[1.8] text-slate-300">
            Read each topic in calm, structured sections — concepts, request lifecycles, public vs. private vs. hybrid cloud, production case studies and interview
            questions — and launch a full-screen interactive model whenever you want to see the architecture move.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to={topicPath(first.module.id, first.topic.id)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-3.5 text-[16px] font-semibold text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.45)] ring-1 ring-cyan-300/60 transition hover:brightness-110"
            >
              Start with Module 1 <ArrowRight size={18} />
            </Link>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-slate-400">
              <span>
                <b className="text-slate-100">{CURRICULUM.length}</b> modules
              </span>
              <span>
                <b className="text-slate-100">{ALL_TOPICS.length}</b> topics
              </span>
              <span>
                <b className="text-slate-100">{ALL_TOPICS.length}</b> interactive 3D models
              </span>
              <span>
                <b className="text-slate-100">{TOTAL_QUESTIONS}</b> interview questions
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum grid */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold text-slate-100">The curriculum</h2>
        <p className="mt-2 max-w-[70ch] text-[17px] leading-[1.8] text-slate-400">Eight modules, from where your system runs to complete real-world architectures. Pick any topic — each one stands on its own.</p>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {CURRICULUM.map((m) => {
            const Icon = MODULE_ICONS[m.number];
            const level = moduleLevel(m.number);
            return (
              <article key={m.id} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-6 transition-colors hover:border-slate-700 md:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/30">
                      <Icon size={20} className="text-cyan-300" />
                    </span>
                    <span className="font-mono text-[13px] text-slate-500">Module {String(m.number).padStart(2, '0')}</span>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${level.cls}`}>{level.label}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold leading-snug text-slate-100">{m.title}</h3>
                <p className="mt-2 text-[16px] leading-[1.7] text-slate-400">{m.description}</p>
                <ol className="mt-5 space-y-1 border-t border-slate-800 pt-4">
                  {m.topics.map((t, i) => (
                    <li key={t.id}>
                      <Link to={topicPath(m.id, t.id)} className="group flex items-center gap-3 rounded-lg px-2 py-2 text-[15.5px] text-slate-200 transition-colors hover:bg-slate-800/60">
                        <span className="w-7 font-mono text-[12px] text-slate-500">
                          {m.number}.{i + 1}
                        </span>
                        <span className="flex-1">{t.title}</span>
                        <Box size={14} className="text-slate-600 transition-colors group-hover:text-cyan-300" />
                      </Link>
                    </li>
                  ))}
                </ol>
                <Link to={topicPath(m.id, m.topics[0].id)} className="mt-5 inline-flex items-center gap-1.5 self-start text-[14px] font-semibold text-cyan-300 hover:text-cyan-200">
                  Start module <ArrowRight size={15} />
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
