import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, CircleHelp, Flag, MessageSquareQuote } from 'lucide-react';
import type { CloudModel, Difficulty, InterviewQuestion, RealWorldExample, Topic } from '../../types';
import { RichText } from '../ui/RichText';
import { topicPath } from '../../router';
import { Link } from '../Link';
import { SECTIONS, scrollToSection } from './sections';
import type { TopicRef } from '../../content/navigation';

/* ---------- Typography primitives ---------- */

export const P = ({ children }: { children: string }) => (
  <p className="mb-5 text-[17px] leading-[1.8] text-slate-200">
    <RichText text={children} />
  </p>
);

export const H3 = ({ children }: { children: ReactNode }) => <h3 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-[0.14em] text-cyan-300/90 first:mt-0">{children}</h3>;

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 ${className}`}>{children}</div>
);

export function Section({ id, eyebrow, title, wide = false, children }: { id: string; eyebrow: string; title: string; wide?: boolean; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32 border-t border-slate-800/80 py-10">
      <div className={`mx-auto px-6 ${wide ? 'max-w-6xl' : 'max-w-[78ch] box-content'}`}>
        <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</div>
        <h2 className="mb-6 text-2xl font-semibold text-slate-100">{title}</h2>
        {children}
      </div>
    </section>
  );
}

export function Callout({ title, children, tone = 'cyan' }: { title: string; children: ReactNode; tone?: 'cyan' | 'emerald' }) {
  const border = tone === 'cyan' ? 'border-cyan-500' : 'border-emerald-500';
  const head = tone === 'cyan' ? 'text-cyan-300' : 'text-emerald-300';
  return (
    <div className={`rounded-r-xl border-l-4 ${border} bg-slate-900/90 p-6`}>
      <div className={`mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] ${head}`}>{title}</div>
      {children}
    </div>
  );
}

/* ---------- Sticky section jump bar ---------- */

export function JumpBar() {
  const [active, setActive] = useState(SECTIONS[0].id);
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => Boolean(e));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-140px 0px -55% 0px' },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  return (
    <div className="sticky top-16 z-30 border-y border-slate-800/80 bg-[#0B1120]/90 backdrop-blur-md">
      <nav aria-label="Sections" className="mx-auto flex max-w-[78ch] box-content gap-1 overflow-x-auto px-6 py-2.5">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => {
              e.preventDefault();
              setActive(s.id);
              scrollToSection(s.id);
            }}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${active === s.id ? 'bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/40' : 'text-slate-400 hover:text-slate-100'}`}
          >
            {s.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

/* ---------- Section 3: cloud models ---------- */

const MODEL_META = {
  public: { title: 'Public Cloud', sub: 'AWS · GCP · Azure', accent: 'text-sky-300', ring: 'border-sky-500/30', chip: 'bg-sky-500/10 text-sky-200 ring-sky-500/25', dot: 'bg-sky-300' },
  private: { title: 'Private Cloud', sub: 'On-prem · OpenStack · VMware', accent: 'text-amber-300', ring: 'border-amber-500/30', chip: 'bg-amber-500/10 text-amber-200 ring-amber-500/25', dot: 'bg-amber-300' },
  hybrid: { title: 'Hybrid Cloud', sub: 'Direct Connect · VPN · Transit Gateway · residency', accent: 'text-violet-300', ring: 'border-violet-500/30', chip: 'bg-violet-500/10 text-violet-200 ring-violet-500/25', dot: 'bg-violet-300' },
} as const;

export function CloudGrid({ topic }: { topic: Topic }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {(Object.keys(MODEL_META) as (keyof typeof MODEL_META)[]).map((k) => {
        const meta = MODEL_META[k];
        const model: CloudModel = topic.cloud[k];
        return (
          <article key={k} className={`flex flex-col rounded-2xl border ${meta.ring} bg-slate-900/70 p-6`}>
            <h3 className={`text-xl font-semibold ${meta.accent}`}>{meta.title}</h3>
            <div className="mt-1 text-[13px] text-slate-400">{meta.sub}</div>
            <p className="mt-4 text-[16px] leading-[1.75] text-slate-200">
              <RichText text={model.summary} />
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {model.stack.map((s) => (
                <span key={s} className={`rounded-md px-2 py-1 font-mono text-[12px] ring-1 ${meta.chip}`}>
                  {s}
                </span>
              ))}
            </div>
            <ul className="mt-5 space-y-3 border-t border-slate-800 pt-5">
              {model.points.map((p, i) => (
                <li key={i} className="flex gap-3 text-[15.5px] leading-[1.7] text-slate-300">
                  <span className={`mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
                  <RichText text={p} />
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}

/* ---------- Section 4: real-world examples ---------- */

export function ExampleCard({ e }: { e: RealWorldExample }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-[14px] font-bold text-slate-100">{e.company}</span>
        <span className="font-mono text-[12.5px] text-cyan-300">{e.scale}</span>
      </div>
      <h3 className="mt-4 text-xl font-semibold leading-snug text-slate-100">{e.headline}</h3>
      <p className="mt-3 text-[17px] leading-[1.8] text-slate-200">
        <RichText text={e.detail} />
      </p>
      <div className="mt-5">
        <Callout title="Architectural lesson" tone="emerald">
          <p className="text-[16px] leading-[1.75] text-slate-200">
            <RichText text={e.lesson} />
          </p>
        </Callout>
      </div>
    </article>
  );
}

/* ---------- Section 5: interview accordion ---------- */

const DIFF_STYLE: Record<Difficulty, string> = {
  'Junior/Mid': 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  Senior: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  Staff: 'bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30',
};

function QuestionCard({ q, n }: { q: InterviewQuestion; n: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`overflow-hidden rounded-2xl border transition-colors ${open ? 'border-slate-700 bg-slate-900/80' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}`}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-start gap-4 p-5 text-left md:p-6">
        <span className="mt-1 font-mono text-[12px] text-slate-500">Q{n}</span>
        <span className="flex-1 text-[17px] font-medium leading-[1.6] text-slate-100">{q.question}</span>
        <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${DIFF_STYLE[q.difficulty]}`}>{q.difficulty}</span>
        <ChevronDown size={18} className={`mt-1 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {!open && <div className="-mt-2 px-6 pb-4 pl-[60px] text-[13px] text-slate-500">Think it through, then expand to compare with the model answer.</div>}
      {open && (
        <div className="space-y-7 border-t border-slate-800 px-5 pb-7 pt-6 md:px-8">
          <div>
            <H3>
              <span className="inline-flex items-center gap-2">
                <MessageSquareQuote size={15} /> Detailed reasoning
              </span>
            </H3>
            {q.answer.map((p, i) => (
              <P key={i}>{p}</P>
            ))}
          </div>
          <div>
            <H3>
              <span className="inline-flex items-center gap-2 text-violet-300">
                <CircleHelp size={15} /> Follow-up edge cases
              </span>
            </H3>
            <div className="space-y-4">
              {q.followUps.map((f, i) => (
                <div key={i} className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
                  <div className="text-[16px] font-semibold leading-[1.6] text-violet-100">
                    <RichText text={f.q} />
                  </div>
                  <p className="mt-2 text-[16px] leading-[1.75] text-slate-300">
                    <RichText text={f.a} />
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <H3>
              <span className="inline-flex items-center gap-2 text-rose-300">
                <Flag size={15} /> Interviewer red flags
              </span>
            </H3>
            <ul className="space-y-3">
              {q.redFlags.map((r, i) => (
                <li key={i} className="flex gap-3 text-[16.5px] leading-[1.75] text-slate-200">
                  <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                  <RichText text={r} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

const FILTERS: ('All' | Difficulty)[] = ['All', 'Junior/Mid', 'Senior', 'Staff'];

export function InterviewList({ questions }: { questions: InterviewQuestion[] }) {
  const [filter, setFilter] = useState<'All' | Difficulty>('All');
  const items = questions.map((q, i) => ({ q, n: i + 1 })).filter(({ q }) => filter === 'All' || q.difficulty === filter);
  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f === 'All' ? questions.length : questions.filter((q) => q.difficulty === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] ring-1 transition-colors ${filter === f ? 'bg-cyan-500/15 text-cyan-200 ring-cyan-500/40' : 'text-slate-400 ring-slate-700 hover:text-slate-100'}`}
            >
              {f} <span className="text-slate-500">{count}</span>
            </button>
          );
        })}
      </div>
      <div className="space-y-4">
        {items.map(({ q, n }) => (
          <QuestionCard key={`${filter}-${n}`} q={q} n={n} />
        ))}
      </div>
    </div>
  );
}

/* ---------- Previous / next ---------- */

export function PrevNext({ prev, next }: { prev?: TopicRef; next?: TopicRef }) {
  return (
    <div className="mx-auto grid max-w-[78ch] box-content grid-cols-1 gap-4 px-6 pb-20 pt-4 sm:grid-cols-2">
      {prev ? (
        <Link to={topicPath(prev.module.id, prev.topic.id)} className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition-colors hover:border-cyan-500/40">
          <div className="flex items-center gap-2 text-[13px] text-slate-400">
            <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-1" /> Previous topic
          </div>
          <div className="mt-2 text-[17px] font-semibold text-slate-100">{prev.topic.title}</div>
          <div className="mt-1 text-[13px] text-slate-500">Module {prev.module.number}</div>
        </Link>
      ) : (
        <div />
      )}
      {next && (
        <Link to={topicPath(next.module.id, next.topic.id)} className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-right transition-colors hover:border-cyan-500/40">
          <div className="flex items-center justify-end gap-2 text-[13px] text-slate-400">
            Next topic <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </div>
          <div className="mt-2 text-[17px] font-semibold text-slate-100">{next.topic.title}</div>
          <div className="mt-1 text-[13px] text-slate-500">Module {next.module.number}</div>
        </Link>
      )}
    </div>
  );
}
