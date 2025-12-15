import { Toaster } from "@/components/ui/toaster";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import SubmitPage from "./pages/SubmitPage";
import ManagePage from "./pages/ManagePage";
import StatsPage from "./pages/StatsPage";
import DashboardPage from "./pages/DashboardPage";
import NotFound from "./pages/NotFound";

const App = () => (
  <>
    <Toaster />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="submit" element={<SubmitPage />} />
          <Route path="manage" element={<ManagePage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </>
);

export default App;
