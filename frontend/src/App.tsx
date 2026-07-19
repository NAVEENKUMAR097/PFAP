import { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import { processDueRecurring } from './services/recurring';

function App() {
  // Catch-up runs once per app open, not on a timer - this backend isn't an
  // always-on server, so "every time the app opens" is the reliable trigger
  // point rather than trying to poll while nothing may be running. It's
  // safe to call repeatedly: process-due only touches rules whose
  // next_due_date has actually arrived, and executing one always advances
  // that date, so re-running this on every reload just does nothing extra.
  useEffect(() => {
    processDueRecurring().catch((err) => {
      // Non-fatal - the app should still load even if this fails (e.g.
      // backend briefly unreachable). Recurring rules simply catch up on
      // the next successful app open instead.
      console.error('Recurring catch-up failed:', err);
    });
  }, []);

  return <AppRoutes />;
}

export default App;