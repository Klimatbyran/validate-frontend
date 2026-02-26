import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Routes, Route } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/tabs";
import { Header } from "@/ui/header";
import { Toaster } from "@/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompaniesProvider } from "@/contexts/CompaniesContext";
import { AuthCallback } from "@/pages/AuthCallback";
import { GlobalLoginModal } from "@/components/GlobalLoginModal";
import SlideshowPage from "@/pages/SlideshowPage";
import { ClimatePlansExplorer } from "@/tabs/climate-plans/ClimatePlansExplorer";
import { CrawlerTab } from "@/tabs/crawler/CrawlerTab";
import { DebugTab } from "@/tabs/debug/DebugTab";
import { ErrorBrowserTab } from "@/tabs/errors/ErrorBrowserTab";
import { JobbstatusTab } from "@/tabs/jobbstatus/JobbstatusTab";
import { ProcessingTab } from "@/tabs/processing/ProcessingTab";
import { ResultsTab } from "@/tabs/results/ResultsTab";
import { UploadTab } from "@/tabs/upload/UploadTab";
import { WorkflowTab } from "@/tabs/workflow/WorkflowTab";
import { useI18n } from "@/contexts/I18nContext";

function App() {
  const [currentTab, setCurrentTab] = useState("upload");
  const { t } = useI18n();

  return (
    <AuthProvider>
      <GlobalLoginModal />
      <Routes>
        {/* OAuth callback route - not protected */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* All other routes - no longer protected at route level */}
        <Route
          path="/"
          element={
            <div className="min-h-screen bg-gray-05 p-8">
              <Toaster />
              <div className="max-w-[1400px] mx-auto">
                <Header />
                <CompaniesProvider>
                <Tabs
                  value={currentTab}
                  onValueChange={(value) => {
                    setCurrentTab(value);
                  }}
                  className="space-y-6"
                >
                  <TabsList className="bg-gray-04/50 backdrop-blur-sm">
                    <TabsTrigger value="upload">{t("nav.upload")}</TabsTrigger>
                    <TabsTrigger value="processing">{t("nav.processing")}</TabsTrigger>
                    <TabsTrigger value="jobbstatus">{t("nav.jobStatus")}</TabsTrigger>
                    <TabsTrigger value="workflow">{t("nav.workflow")}</TabsTrigger>
                    <TabsTrigger value="debug">{t("nav.debug")}</TabsTrigger>
                    <TabsTrigger value="errors">{t("nav.errorBrowser")}</TabsTrigger>
                    <TabsTrigger value="results">{t("nav.results")}</TabsTrigger>
                    <TabsTrigger value="crawler">{t("nav.crawler")}</TabsTrigger>
                    <TabsTrigger value="climate-plans">{t("nav.climatePlans")}</TabsTrigger>
                  </TabsList>

                  <AnimatePresence mode="popLayout" initial={false}>
                    <TabsContent key="upload" value="upload" asChild>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                      >
                        <UploadTab onTabChange={setCurrentTab} />
                      </motion.div>
                    </TabsContent>

                    <TabsContent key="processing" value="processing" asChild>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                      >
                        <ProcessingTab />
                      </motion.div>
                    </TabsContent>

                    <TabsContent key="jobbstatus" value="jobbstatus" asChild>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                      >
                        <JobbstatusTab />
                      </motion.div>
                    </TabsContent>

                    <TabsContent key="workflow" value="workflow" asChild>
                      <motion.div>
                        <WorkflowTab />
                      </motion.div>
                    </TabsContent>

                    <TabsContent key="debug" value="debug" asChild>
                      <motion.div>
                        <DebugTab />
                      </motion.div>
                    </TabsContent>

                    <TabsContent key="errors" value="errors" asChild>
                      <motion.div>
                        <ErrorBrowserTab />
                      </motion.div>
                    </TabsContent>

                    <TabsContent key="results" value="results" asChild>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6"
                      >
                        <ResultsTab />
                      </motion.div>
                    </TabsContent>

                    <TabsContent key="crawler" value="crawler" asChild>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                      >
                        <CrawlerTab />
                      </motion.div>
                    </TabsContent>

                    <TabsContent key="climate-plans" value="climate-plans" asChild>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                      >
                        <ClimatePlansExplorer />
                      </motion.div>
                    </TabsContent>
                  </AnimatePresence>
                </Tabs>
                </CompaniesProvider>
              </div>
            </div>
          }
        />
        <Route path="/slideshow" element={<SlideshowPage />} />
      </Routes>
      </AuthProvider>
  );
}

export default App;
