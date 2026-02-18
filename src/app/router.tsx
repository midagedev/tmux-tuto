import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { LoadingState } from '../components/system/LoadingState';
import { RouteErrorBoundary } from '../components/system/RouteErrorBoundary';
import { useI18n } from '../i18n';
import { AppShell } from './layout/AppShell';

const HomePage = lazy(() => import('../pages/HomePage').then((module) => ({ default: module.HomePage })));
const LearnIndexPage = lazy(() =>
  import('../pages/Learn/LearnIndexPage').then((module) => ({ default: module.LearnIndexPage })),
);
const LessonPage = lazy(() =>
  import('../pages/Learn/LessonPage').then((module) => ({ default: module.LessonPage })),
);
const PracticePage = lazy(() =>
  import('../pages/Practice/PracticePage').then((module) => ({ default: module.PracticePage })),
);
const PracticeVmPocPage = lazy(() =>
  import('../pages/Practice/PracticeVmPocPage').then((module) => ({ default: module.PracticeVmPocPage })),
);
const CheatsheetPage = lazy(() =>
  import('../pages/Cheatsheet/CheatsheetPage').then((module) => ({ default: module.CheatsheetPage })),
);
const PlaybookIndexPage = lazy(() =>
  import('../pages/Playbooks/PlaybookIndexPage').then((module) => ({ default: module.PlaybookIndexPage })),
);
const PlaybookDetailPage = lazy(() =>
  import('../pages/Playbooks/PlaybookDetailPage').then((module) => ({ default: module.PlaybookDetailPage })),
);
const PlaybookCopiedPage = lazy(() =>
  import('../pages/Playbooks/PlaybookCopiedPage').then((module) => ({ default: module.PlaybookCopiedPage })),
);
const BookmarksPage = lazy(() =>
  import('../pages/Bookmarks/BookmarksPage').then((module) => ({ default: module.BookmarksPage })),
);
const ProgressPage = lazy(() =>
  import('../pages/Progress/ProgressPage').then((module) => ({ default: module.ProgressPage })),
);
const MissionPassedPage = lazy(() =>
  import('../pages/Progress/MissionPassedPage').then((module) => ({ default: module.MissionPassedPage })),
);
const ShareMilestonePage = lazy(() =>
  import('../pages/Share/ShareMilestonePage').then((module) => ({ default: module.ShareMilestonePage })),
);
const ShareAchievementPage = lazy(() =>
  import('../pages/Share/ShareAchievementPage').then((module) => ({ default: module.ShareAchievementPage })),
);
const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);
const OnboardingStartPage = lazy(() =>
  import('../pages/Onboarding/OnboardingStartPage').then((module) => ({
    default: module.OnboardingStartPage,
  })),
);
const OnboardingGoalPage = lazy(() =>
  import('../pages/Onboarding/OnboardingGoalPage').then((module) => ({
    default: module.OnboardingGoalPage,
  })),
);
const OnboardingPreferencesPage = lazy(() =>
  import('../pages/Onboarding/OnboardingPreferencesPage').then((module) => ({
    default: module.OnboardingPreferencesPage,
  })),
);
const OnboardingFirstMissionPage = lazy(() =>
  import('../pages/Onboarding/OnboardingFirstMissionPage').then((module) => ({
    default: module.OnboardingFirstMissionPage,
  })),
);
const OnboardingFirstMissionPassedPage = lazy(() =>
  import('../pages/Onboarding/OnboardingFirstMissionPassedPage').then((module) => ({
    default: module.OnboardingFirstMissionPassedPage,
  })),
);
const OnboardingDonePage = lazy(() =>
  import('../pages/Onboarding/OnboardingDonePage').then((module) => ({
    default: module.OnboardingDonePage,
  })),
);

function renderLazyPage(Component: ComponentType) {
  return (
    <LocalizedSuspense>
      <Component />
    </LocalizedSuspense>
  );
}

function LocalizedSuspense({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return <Suspense fallback={<LoadingState message={t('router.loadingPage')} />}>{children}</Suspense>;
}

export function createAppRouter() {
  return createBrowserRouter(
    [
      {
        path: '/',
        element: <AppShell />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true, element: renderLazyPage(HomePage) },
          { path: 'learn', element: renderLazyPage(LearnIndexPage) },
          { path: 'learn/:trackSlug/:chapterSlug/:lessonSlug', element: renderLazyPage(LessonPage) },
          { path: 'practice', element: renderLazyPage(PracticePage) },
          { path: 'practice/vm-poc', element: renderLazyPage(PracticeVmPocPage) },
          { path: 'cheatsheet', element: renderLazyPage(CheatsheetPage) },
          { path: 'playbooks', element: renderLazyPage(PlaybookIndexPage) },
          { path: 'playbooks/:playbookSlug', element: renderLazyPage(PlaybookDetailPage) },
          { path: 'playbooks/:playbookSlug/copied', element: renderLazyPage(PlaybookCopiedPage) },
          { path: 'bookmarks', element: renderLazyPage(BookmarksPage) },
          { path: 'progress', element: renderLazyPage(ProgressPage) },
          { path: 'progress/missions/:missionSlug/passed', element: renderLazyPage(MissionPassedPage) },
          { path: 'onboarding/start', element: renderLazyPage(OnboardingStartPage) },
          { path: 'onboarding/goal', element: renderLazyPage(OnboardingGoalPage) },
          { path: 'onboarding/preferences', element: renderLazyPage(OnboardingPreferencesPage) },
          { path: 'onboarding/first-mission', element: renderLazyPage(OnboardingFirstMissionPage) },
          {
            path: 'onboarding/first-mission/passed',
            element: renderLazyPage(OnboardingFirstMissionPassedPage),
          },
          { path: 'onboarding/done', element: renderLazyPage(OnboardingDonePage) },
          { path: 'share/achievement/:achievementId', element: renderLazyPage(ShareAchievementPage) },
          { path: 'share/:milestoneSlug', element: renderLazyPage(ShareMilestonePage) },
          { path: '*', element: renderLazyPage(NotFoundPage) },
        ],
      },
    ],
    {
      basename: import.meta.env.BASE_URL,
    },
  );
}
