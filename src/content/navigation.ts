import type { CurriculumModule, Topic } from '../types';
import { CURRICULUM } from './curriculum';

export interface TopicRef {
  module: CurriculumModule;
  topic: Topic;
  index: number;
}

/** Every topic in syllabus order — drives previous/next navigation. */
export const ALL_TOPICS: TopicRef[] = CURRICULUM.flatMap((module) => module.topics.map((topic) => ({ module, topic }))).map((r, index) => ({
  ...r,
  index,
}));

export function topicRef(topicId: string): TopicRef | undefined {
  return ALL_TOPICS.find((r) => r.topic.id === topicId);
}

export function neighbours(topicId: string) {
  const ref = topicRef(topicId);
  if (!ref) return { prev: undefined, next: undefined };
  return { prev: ALL_TOPICS[ref.index - 1], next: ALL_TOPICS[ref.index + 1] };
}

export const TOTAL_QUESTIONS = ALL_TOPICS.reduce((n, r) => n + r.topic.interview.length, 0);

/** Course level by module, shown as the difficulty badge on topic pages. */
export function moduleLevel(moduleNumber: number): { label: string; cls: string } {
  if (moduleNumber <= 2) return { label: 'Foundations', cls: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30' };
  if (moduleNumber <= 4) return { label: 'Intermediate', cls: 'bg-sky-500/10 text-sky-300 ring-sky-500/30' };
  if (moduleNumber <= 7) return { label: 'Advanced', cls: 'bg-amber-500/10 text-amber-300 ring-amber-500/30' };
  return { label: 'Case Study', cls: 'bg-fuchsia-500/10 text-fuchsia-300 ring-fuchsia-500/30' };
}
