import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { PRIMARY_NAV_ITEMS } from '../../constants/navigation';

interface PillRect {
  left: number;
  width: number;
}

/**
 * Production Bottom Navigation.
 *
 * Renders from PRIMARY_NAV_ITEMS (constants/navigation.ts) — the single
 * source of truth shared with the More page — rather than hardcoding tabs
 * here. A gold pill slides behind the active item on route change; this is
 * the shell's one deliberate motion moment, built with plain refs + CSS
 * transitions (no framer-motion — that's outside the approved stack).
 */
export default function BottomNavigation() {
  const location = useLocation();
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pillRect, setPillRect] = useState<PillRect>({ left: 0, width: 0 });

  useEffect(() => {
    const activeItem = PRIMARY_NAV_ITEMS.find((item) =>
      item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path),
    );
    const activeEl = activeItem ? itemRefs.current[activeItem.id] : null;
    if (activeEl) {
      setPillRect({ left: activeEl.offsetLeft, width: activeEl.offsetWidth });
    }
  }, [location.pathname]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-white/5 bg-surface/90 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <div className="relative mx-auto flex max-w-md items-center justify-between px-2 py-2">
        <span
          className="absolute top-2 h-[calc(100%-1rem)] rounded-2xl bg-gold/15 transition-[left,width] duration-300 ease-out"
          style={{ left: pillRect.left, width: pillRect.width }}
          aria-hidden="true"
        />
        {PRIMARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              ref={(el) => {
                itemRefs.current[item.id] = el;
              }}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `relative z-10 flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold
                transition-colors ${isActive ? 'text-gold' : 'text-muted'}`
              }
            >
              <Icon size={20} strokeWidth={1.75} />
              <span className="font-body">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}