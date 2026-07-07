import { Link } from 'react-router-dom';
import { SECONDARY_NAV_ITEMS } from '../../constants/navigation';

/**
 * Renders from SECONDARY_NAV_ITEMS (constants/navigation.ts) — adding a
 * module to that array shows up here automatically, no separate wiring
 * needed. This is the overflow destination for the 6 modules that don't
 * fit in the primary 5-slot Bottom Navigation (see navigation.ts for the
 * reasoning behind that cap).
 */
export default function MorePage() {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="font-display text-2xl font-medium text-ink">More</h1>
      <p className="text-sm text-muted">Everything else, in one place.</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {SECONDARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.path}
              className="flex flex-col items-start gap-3 rounded-2xl bg-surface p-4
                transition-colors hover:bg-surface-2 focus-visible:outline
                focus-visible:outline-2 focus-visible:outline-gold"
            >
              <Icon size={22} strokeWidth={1.75} className="text-gold" />
              <span className="font-body text-sm text-ink">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}