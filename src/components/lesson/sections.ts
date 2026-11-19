/** The five lesson sections every topic page is organised into. */
export const SECTIONS = [
  { id: 'what-why', label: 'What & Why', blurb: 'Core concept, problems solved, trade-offs' },
  { id: 'where-how', label: 'Where & How', blurb: 'Architecture placement & request lifecycle' },
  { id: 'cloud-models', label: 'Cloud Models', blurb: 'Public vs. private vs. hybrid cloud' },
  { id: 'examples', label: 'Real-World Examples', blurb: 'Production case studies & lessons' },
  { id: 'interview', label: 'Interview Q&A', blurb: 'Questions, model answers, red flags' },
];

/** Smoothly scroll to a lesson section (offset for the sticky navbar + jump bar via scroll-mt). */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(null, '', `#${id}`);
}
