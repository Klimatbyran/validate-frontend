import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthCallback } from "@/pages/AuthCallback";
import { GlobalLoginModal } from "@/components/GlobalLoginModal";
import SlideshowPage from "@/pages/SlideshowPage";
import { MainLayout } from "@/layouts/MainLayout";
import { ClimatePlansExplorer } from "@/tabs/climate-plans/ClimatePlansExplorer";
import { CrawlerTab } from "@/tabs/crawler/CrawlerTab";
import { DebugTab } from "@/tabs/debug/DebugTab";
import { EditorTab } from "@/tabs/editor/EditorTab";
import { ErrorBrowserTab } from "@/tabs/errors/ErrorBrowserTab";
import { JobbstatusTab } from "@/tabs/jobbstatus/JobbstatusTab";
import { RegistryTab } from "@/tabs/registry/RegistryTab";
import { UploadTab } from "@/tabs/upload/UploadTab";
import { WorkflowTab } from "@/tabs/workflow/WorkflowTab";
import { DEFAULT_TOP_LEVEL_PATH } from "@/lib/top-level-routes";

function App() {
  return (
    <AuthProvider>
      <GlobalLoginModal />
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/slideshow" element={<SlideshowPage />} />

        <Route element={<MainLayout />}>
          <Route
            path="/"
            element={<Navigate to={DEFAULT_TOP_LEVEL_PATH} replace />}
          />
          <Route path="/crawler" element={<CrawlerTab />} />
          <Route path="/registry" element={<RegistryTab />} />
          <Route path="/upload" element={<UploadTab />} />
          <Route path="/jobbstatus" element={<JobbstatusTab />} />
          <Route path="/workflow" element={<WorkflowTab />} />
          <Route path="/debug" element={<DebugTab />} />
          <Route path="/errors" element={<ErrorBrowserTab />} />
          <Route path="/editor/company/:companyId" element={<EditorTab />} />
          <Route
            path="/editor/company"
            element={<Navigate to="/editor" replace />}
          />
          <Route path="/editor" element={<EditorTab />} />
          <Route path="/climate-plans" element={<ClimatePlansExplorer />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={DEFAULT_TOP_LEVEL_PATH} replace />}
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
