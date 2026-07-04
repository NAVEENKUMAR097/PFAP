import { Outlet } from "react-router-dom";
import Header from "../components/layouts/Header";
import BottomNavigation from "../components/layouts/BottomNavigation";

function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 p-4">
        <Outlet />
      </main>

      <BottomNavigation />
    </div>
  );
}

export default MainLayout;