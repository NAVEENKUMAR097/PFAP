import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  PiggyBank,
  MoreHorizontal,
  TrendingUp,
  HandCoins,
  Handshake,
  LineChart,
  FileBarChart,
  Settings,
  Repeat2,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
}

/**
 * Primary destinations shown in the Bottom Navigation.
 *
 * Capped at 5 items deliberately — mobile tab-bar UX conventions (iOS HIG,
 * Material Design) break down past 5 destinations: tap targets shrink and
 * scanability drops. V1 has 10 modules, so the remaining 6 live behind
 * "More" rather than being crammed into the primary bar.
 *
 * This is the single source of truth for primary nav — BottomNavigation
 * renders from this array rather than hardcoding items, so adding/removing
 * a destination is a one-line change instead of touching multiple files.
 */
export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { id: 'expenses', label: 'Expenses', path: '/expenses', icon: Receipt },
  { id: 'analytics', label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { id: 'budget', label: 'Budget', path: '/budget', icon: PiggyBank },
  { id: 'more', label: 'More', path: '/more', icon: MoreHorizontal },
];

/**
 * Secondary destinations, reachable via the "More" page. Same NavItem
 * shape as the primary list so both can be rendered by the same kind of
 * link component without a parallel data model.
 */
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { id: 'income', label: 'Income', path: '/income', icon: TrendingUp },
  { id: 'lending', label: 'Lending', path: '/lending', icon: HandCoins },
  { id: 'borrowing', label: 'Borrowing', path: '/borrowing', icon: Handshake },
  { id: 'investments', label: 'Investments', path: '/investments', icon: LineChart },
  { id: 'recurring', label: 'Recurring', path: '/recurring', icon: Repeat2 },
  { id: 'reports', label: 'Reports', path: '/reports', icon: FileBarChart },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings },
];