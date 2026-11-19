import { useSyncExternalStore } from 'react';

/**
 * Minimal history-API router (no extra dependency).
 *   /                                  → home (curriculum grid)
 *   /topics/:moduleId/:topicId         → reading view
 *   /topics/:moduleId/:topicId/lab     → full-screen 3D lab
 */
export type Route =
  | { name: 'home' }
  | { name: 'topic'; moduleId: string; topicId: string }
  | { name: 'lab'; moduleId: string; topicId: string };

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Reading position per path, so "Back to Reading" returns to the same spot. */
const scrollMemory = new Map<string, number>();

function restoreScroll(path: string) {
  const y = scrollMemory.get(path) ?? 0;
  // wait for the page to render before scrolling
  requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior })));
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    notify();
    restoreScroll(window.location.pathname);
  });
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const from = window.location.pathname;
  if (to === from) return;
  scrollMemory.set(from, window.scrollY);
  window.history[opts.replace ? 'replaceState' : 'pushState'](null, '', to);
  notify();
  // Returning from a topic's 3D lab restores the reading position; anything else starts at the top.
  if (from.startsWith(`${to}/`)) restoreScroll(to);
  else {
    scrollMemory.delete(to);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }
}

export function usePathname() {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

export function matchRoute(pathname: string): Route {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'topics' && parts.length >= 3) {
    if (parts[3] === 'lab') return { name: 'lab', moduleId: parts[1], topicId: parts[2] };
    return { name: 'topic', moduleId: parts[1], topicId: parts[2] };
  }
  return { name: 'home' };
}

export const topicPath = (moduleId: string, topicId: string) => `/topics/${moduleId}/${topicId}`;
export const labPath = (moduleId: string, topicId: string) => `/topics/${moduleId}/${topicId}/lab`;
