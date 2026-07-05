import { Outlet } from 'react-router-dom';
import Header from '../components/navigation/Header';
import BottomNavigation from '../components/navigation/BottomNavigation';

/**
 * Application Shell skeleton.
 *
 * Structure: Header (sticky top) -> <Outlet/> (scrollable) -> BottomNavigation
 * (fixed bottom). Every routed page renders inside <main>, so no page ever
 * needs to know about the Header or Bottom Navigation directly — this is
 * the nesting the roadmap specified: BrowserRouter -> AppRoutes -> MainLayout
 * -> Outlet -> Pages.
 *
 * `pb-24` on <main> reserves space so page content never sits underneath
 * the fixed bottom nav bar.
 *
 * Mobile is the real product — this is used daily on a phone — so the
 * outer wrapper centers a `max-w-md` column on any screen wider than that.
 * On an actual phone the column is wider than the viewport, so this is a
 * no-op there; on desktop it keeps Header + content + BottomNavigation
 * reading as one coherent app instead of a stretched webpage.
 * BottomNavigation is `fixed`, so it's positioned outside this centered
 * column and re-centers itself independently (see BottomNavigation.tsx) —
 * both use the same `max-w-md` value so the widths line up.
 */
export default function MainLayout() {
  return (
    <div className="flex min-h-screen justify-center bg-base">
      <div className="flex w-full max-w-md flex-col text-ink">
        <Header />
        <main className="flex-1 overflow-y-auto px-5 pb-24 pt-4">
          <Outlet />
        </main>
      </div>
      <BottomNavigation />
    </div>
  );
}