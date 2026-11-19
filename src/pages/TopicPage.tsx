import { useEffect } from 'react';
import { BookOpen, Box, Building2, CloudCog, GraduationCap, MousePointerClick, Workflow, type LucideIcon } from 'lucide-react';
import type { Topic } from '../types';
import { RichText } from '../components/ui/RichText';
import { Callout, Card, CloudGrid, ExampleCard, H3, InterviewList, JumpBar, P, PrevNext, Section } from '../components/lesson/Lesson';
import { SECTIONS, scrollToSection } from '../components/lesson/sections';
import { LaunchButton } from '../layout/TopNav';
import { moduleLevel, neighbours, topicRef } from '../content/navigation';

const SECTION_ICONS: Record<string, LucideIcon> = {
  'what-why': BookOpen,
  'where-how': Workflow,
  'cloud-models': CloudCog,
  examples: Building2,
  interview: GraduationCap,
};

/** Big, always-visible section buttons at the top of every topic. */
function SectionButtons({ interviewCount }: { interviewCount: number }) {
  return (
    <nav aria-label="Jump to section" className="mt-8">
      <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500">Jump to a section</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s, i) => {
          const Icon = SECTION_ICONS[s.id];
          return (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.id)}
              className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left transition-colors hover:border-cyan-500/50 hover:bg-slate-900"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/30">
                <Icon size={17} className="text-cyan-300" />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-slate-100 group-hover:text-cyan-100">
                  <span className="mr-1.5 font-mono text-[12px] text-slate-500">{i + 1}.</span>
                  {s.label}
                  {s.id === 'interview' && <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">{interviewCount}</span>}
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-slate-400">{s.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** First sentence of a paragraph (for the 2-sentence overview). */
function firstSentence(text: string) {
  const m = text.match(/^(.+?[.!?])(\s|$)/);
  return m ? m[1] : text;
}

function Hero({ topic, moduleId, moduleNumber, moduleTitle }: { topic: Topic; moduleId: string; moduleNumber: number; moduleTitle: string }) {
  const level = moduleLevel(moduleNumber);
  return (
    <header className="mx-auto max-w-[78ch] box-content px-6 pb-10 pt-12">
      <div className="text-[13px] font-semibold uppercase tracking-[0.18em] text-cyan-300/90">
        Module {moduleNumber} · {moduleTitle}
      </div>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-100 md:text-4xl">{topic.title}</h1>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ${level.cls}`}>{level.label}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 px-2.5 py-1 text-[12px] text-slate-300 ring-1 ring-slate-700">
          <GraduationCap size={13} /> {topic.interview.length} interview questions
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 px-2.5 py-1 text-[12px] text-slate-300 ring-1 ring-slate-700">
          <Box size={13} /> Interactive 3D model
        </span>
      </div>
      <p className="mt-6 text-[18px] leading-[1.8] text-slate-200">
        {topic.tagline} <RichText text={firstSentence(topic.fundamentals.what)} />
      </p>

      {/* 3D preview banner card */}
      <div className="relative mt-8 overflow-hidden rounded-2xl border border-cyan-500/25 bg-slate-900/80">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.07)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]" />
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 p-6 md:p-8">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Interactive 3D architecture lab</div>
            <p className="mt-3 text-[16px] leading-[1.75] text-slate-300">{topic.controls.hint}</p>
            <p className="mt-3 flex items-center gap-2 text-[13px] text-slate-500">
              <MousePointerClick size={14} /> Drag to orbit · scroll to zoom · hover or click any component to inspect it
            </p>
          </div>
          <div>
            <LaunchButton moduleId={moduleId} topicId={topic.id} size="lg" />
          </div>
        </div>
      </div>

      <SectionButtons interviewCount={topic.interview.length} />
    </header>
  );
}

export function TopicPage({ topicId }: { topicId: string }) {
  // Deep link: /topics/m1/x#interview opens straight at that section.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id && SECTIONS.some((s) => s.id === id)) requestAnimationFrame(() => scrollToSection(id));
  }, [topicId]);

  const ref = topicRef(topicId);
  if (!ref) return null;
  const { module, topic } = ref;
  const f = topic.fundamentals;
  const { prev, next } = neighbours(topicId);

  return (
    <main>
      <Hero topic={topic} moduleId={module.id} moduleNumber={module.number} moduleTitle={module.title} />
      <JumpBar />

      <Section id="what-why" eyebrow="Section 1" title="Core concept & engineering reasoning">
        <Card>
          <H3>What it is</H3>
          <P>{f.what}</P>
          <H3>Why it exists</H3>
          <P>{f.why}</P>
          <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
            {f.keyNumbers.map((k) => (
              <div key={k.label} className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                <div className="font-mono text-[15px] font-semibold text-cyan-200">{k.value}</div>
                <div className="mt-1 text-[12.5px] leading-snug text-slate-400">{k.label}</div>
              </div>
            ))}
          </div>
        </Card>

        <h3 className="mb-4 mt-10 text-xl font-semibold text-slate-100">The problems it solves</h3>
        <ul className="space-y-3">
          {f.bottlenecks.map((b) => (
            <li key={b.problem} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="text-[16.5px] font-semibold leading-[1.6] text-slate-100">
                <RichText text={b.problem} />
              </div>
              <div className="mt-1.5 text-[16.5px] leading-[1.75] text-slate-300">
                <span className="text-emerald-400">→ </span>
                <RichText text={b.solution} />
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-10">
          <Callout title="Engineering trade-offs">
            <ul className="space-y-5">
              {f.tradeoffs.map((t) => (
                <li key={t.aspect}>
                  <div className="text-[16.5px] font-semibold text-slate-100">{t.aspect}</div>
                  <div className="mt-1.5 text-[16px] leading-[1.75] text-slate-300">
                    <span className="font-medium text-emerald-300">You gain: </span>
                    <RichText text={t.gain} />
                  </div>
                  <div className="mt-1 text-[16px] leading-[1.75] text-slate-300">
                    <span className="font-medium text-rose-300">You pay: </span>
                    <RichText text={t.cost} />
                  </div>
                </li>
              ))}
            </ul>
          </Callout>
        </div>
      </Section>

      <Section id="where-how" eyebrow="Section 2" title="Architecture & request lifecycle">
        <Card>
          <H3>Where it fits</H3>
          <P>{f.where}</P>
        </Card>
        <h3 className="mb-6 mt-10 text-xl font-semibold text-slate-100">How a request flows, end to end</h3>
        <ol className="space-y-6">
          {f.how.map((step, i) => (
            <li key={i} className="flex gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cyan-500/10 font-mono text-[15px] font-bold text-cyan-300 ring-1 ring-cyan-500/40">{i + 1}</span>
              <p className="pt-1 text-[17px] leading-[1.8] text-slate-200">
                <RichText text={step} />
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="cloud-models" eyebrow="Section 3" title="Cloud infrastructure models: public vs. private vs. hybrid" wide>
        <CloudGrid topic={topic} />
      </Section>

      <Section id="examples" eyebrow="Section 4" title="Real-world production examples">
        <div className="space-y-6">
          {topic.examples.map((e) => (
            <ExampleCard key={e.company + e.headline} e={e} />
          ))}
        </div>
      </Section>

      <Section id="interview" eyebrow="Section 5" title="Top system design interview questions & answers">
        <p className="mb-6 text-[16px] leading-[1.75] text-slate-400">Each card shows only the question first — answer it in your head (or out loud) before expanding the model answer.</p>
        <InterviewList questions={topic.interview} />
      </Section>

      <PrevNext prev={prev} next={next} />
    </main>
  );
}
