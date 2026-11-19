import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { matchRoute, navigate, usePathname } from './router';
import { topicRef } from './content/navigation';
import { useSystemStore } from './store/useSystemStore';
import { TopNav } from './layout/TopNav';
import { CurriculumDrawer } from './layout/CurriculumDrawer';
import { HomePage } from './pages/HomePage';
import { TopicPage } from './pages/TopicPage';
import { LabPage } from './pages/LabPage';

export default function App() {
  const route = matchRoute(usePathname());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), [setDrawerOpen]);
  const topicId = route.name === 'home' ? undefined : route.topicId;
  const valid = topicId ? Boolean(topicRef(topicId)) : true;

  // The URL is the source of truth for which topic the simulation shows.
  useLayoutEffect(() => {
    if (topicId && valid) useSystemStore.getState().setTopic(topicId);
  }, [topicId, valid]);

  useEffect(() => {
    if (!valid) navigate('/', { replace: true });
  }, [valid]);

  // Keep the document title meaningful for tabs/bookmarks.
  useEffect(() => {
    const ref = topicId ? topicRef(topicId) : undefined;
    document.title = ref ? `${ref.topic.title}${route.name === 'lab' ? ' · 3D Lab' : ''} · Architect3D` : 'Architect3D · System Design & Cloud Infrastructure';
  }, [topicId, route.name]);

  if (!valid) return null;

  if (route.name === 'lab') return <LabPage moduleId={route.moduleId} topicId={route.topicId} />;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200">
      <TopNav route={route} onOpenDrawer={() => setDrawerOpen(true)} />
      <CurriculumDrawer open={drawerOpen} onClose={closeDrawer} activeTopicId={topicId} />
      {route.name === 'home' ? <HomePage /> : <TopicPage key={route.topicId} topicId={route.topicId} />}
    </div>
  );
}
