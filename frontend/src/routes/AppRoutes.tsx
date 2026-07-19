import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/Dashboard';
import ExpensesPage from '../pages/Expenses';
import IncomePage from '../pages/income';
import InvestmentsPage from '../pages/Investments';
import LendingPage from '../pages/Lending';
import BorrowingPage from '../pages/Borrowing';
import BudgetPage from '../pages/Budget';
import AnalyticsPage from '../pages/Analytics';
// import ReportsPage from '../pages/Reports';
import SettingsPage from '../pages/Settings';
import MorePage from '../pages/More';
import RecurringExpensesPage from '../pages/RecurringExpenses';

/**
 * Every route is nested under a single MainLayout element, so Header and
 * BottomNavigation render exactly once and every page reaches the screen
 * through the shell's <Outlet/> — no page component ever imports or
 * renders shell chrome itself.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/income" element={<IncomePage />} />
        <Route path="/investments" element={<InvestmentsPage />} />
        <Route path="/lending" element={<LendingPage />} />
        <Route path="/borrowing" element={<BorrowingPage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        {/* <Route path="/reports" element={<ReportsPage />} /> */}
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/recurring" element={<RecurringExpensesPage />} />
        <Route path="/more" element={<MorePage />} />
      </Route>
    </Routes>
  );
}