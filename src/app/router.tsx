import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { HomePage } from '../pages/HomePage';
import { LearnIndexPage } from '../pages/Learn/LearnIndexPage';
import { LessonPage } from '../pages/Learn/LessonPage';
import { PracticePage } from '../pages/Practice/PracticePage';
import { CheatsheetPage } from '../pages/Cheatsheet/CheatsheetPage';
import { PlaybookIndexPage } from '../pages/Playbooks/PlaybookIndexPage';
import { PlaybookDetailPage } from '../pages/Playbooks/PlaybookDetailPage';
import { BookmarksPage } from '../pages/Bookmarks/BookmarksPage';
import { ProgressPage } from '../pages/Progress/ProgressPage';
import { MissionPassedPage } from '../pages/Progress/MissionPassedPage';
import { ShareMilestonePage } from '../pages/Share/ShareMilestonePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { OnboardingStartPage } from '../pages/Onboarding/OnboardingStartPage';
import { OnboardingGoalPage } from '../pages/Onboarding/OnboardingGoalPage';
import { OnboardingPreferencesPage } from '../pages/Onboarding/OnboardingPreferencesPage';
import { OnboardingFirstMissionPage } from '../pages/Onboarding/OnboardingFirstMissionPage';
import { OnboardingFirstMissionPassedPage } from '../pages/Onboarding/OnboardingFirstMissionPassedPage';
import { OnboardingDonePage } from '../pages/Onboarding/OnboardingDonePage';
import { RouteErrorBoundary } from '../components/system/RouteErrorBoundary';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppShell />,
      errorElement: <RouteErrorBoundary />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'learn', element: <LearnIndexPage /> },
        { path: 'learn/:trackSlug/:chapterSlug/:lessonSlug', element: <LessonPage /> },
        { path: 'practice', element: <PracticePage /> },
        { path: 'cheatsheet', element: <CheatsheetPage /> },
        { path: 'playbooks', element: <PlaybookIndexPage /> },
        { path: 'playbooks/:playbookSlug', element: <PlaybookDetailPage /> },
        { path: 'bookmarks', element: <BookmarksPage /> },
        { path: 'progress', element: <ProgressPage /> },
        { path: 'progress/missions/:missionSlug/passed', element: <MissionPassedPage /> },
        { path: 'onboarding/start', element: <OnboardingStartPage /> },
        { path: 'onboarding/goal', element: <OnboardingGoalPage /> },
        { path: 'onboarding/preferences', element: <OnboardingPreferencesPage /> },
        { path: 'onboarding/first-mission', element: <OnboardingFirstMissionPage /> },
        {
          path: 'onboarding/first-mission/passed',
          element: <OnboardingFirstMissionPassedPage />,
        },
        { path: 'onboarding/done', element: <OnboardingDonePage /> },
        { path: 'share/:milestoneSlug', element: <ShareMilestonePage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
);
