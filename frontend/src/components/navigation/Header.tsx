import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getGreeting, formatHeaderDate } from '../../utils/greeting';
import { CURRENT_USER } from '../../constants/user';

/**
 * Production Application Shell Header.
 *
 * Deliberately scoped down from the earlier placeholder version, which had
 * separate notification + profile icons:
 *  - Notification icon removed: there is no feature producing notifications
 *    yet (Budget module doesn't exist). Re-add once Budget/Analytics can
 *    raise real alerts (e.g. "budget exceeded") — tracked as a V2 item.
 *  - Profile icon merged into Settings: V1's approved module list has
 *    Settings, not a separate Profile page, and there's no auth yet to
 *    back a distinct profile view.
 */
export default function Header() {
  const greeting = getGreeting();
  const today = formatHeaderDate();

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5
        bg-base/80 px-5 py-4 backdrop-blur-md"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
    >
      <div className="flex flex-col">
        <span className="font-body text-sm text-muted">
          {greeting}, <span className="text-ink">{CURRENT_USER.displayName}</span>
        </span>
        <span className="font-display text-lg font-medium text-ink">{today}</span>
      </div>

      <Link
        to="/settings"
        aria-label="Settings"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-muted
          transition-colors hover:text-gold focus-visible:outline focus-visible:outline-2
          focus-visible:outline-gold active:bg-surface-2"
      >
        <Settings size={20} strokeWidth={1.75} />
      </Link>
    </header>
  );
}