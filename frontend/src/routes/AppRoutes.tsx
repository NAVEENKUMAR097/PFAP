import { Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<h1>Dashboard Coming Soon</h1>} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;