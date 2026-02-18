import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/tabs";
import { Header } from "@/ui/header";
import { ProcessingTab } from "@/tabs/processing/ProcessingTab";
import { JobbstatusTab } from "@/tabs/jobbstatus/JobbstatusTab";
import { WorkflowTab } from "@/tabs/workflow/WorkflowTab";
import { DebugTab } from "@/tabs/debug/DebugTab";
import { Toaster } from "@/ui/sonner";
import { Routes, Route } from "react-router-dom";
import SlideshowPage from "@/pages/SlideshowPage";
import { UploadTab } from "@/tabs/upload/UploadTab";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthCallback } from "@/pages/AuthCallback";
import { GlobalLoginModal } from "@/components/GlobalLoginModal";
import { ErrorBrowserTab } from "@/tabs/errors/ErrorBrowserTab";
import { CrawlerTab } from "@/tabs/crawler/CrawlerTab";
import { ResultsTab } from "@/tabs/results/ResultsTab";

function App() {
  const [currentTab, setCurrentTab] = useState("upload");

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

                  <Tabs
                    value={currentTab}
                    onValueChange={(value) => {
                      setCurrentTab(value);
                    }}
                    className="space-y-6"
                  >
                    <TabsList className="bg-gray-04/50 backdrop-blur-sm">
                      <TabsTrigger value="upload">Uppladdning</TabsTrigger>
                      <TabsTrigger value="processing">Bearbetning</TabsTrigger>
                      <TabsTrigger value="jobbstatus">Jobbstatus</TabsTrigger>
                      <TabsTrigger value="workflow">Processflöde</TabsTrigger>
                      <TabsTrigger value="debug">Debug</TabsTrigger>
                      <TabsTrigger value="errors">Error Browser</TabsTrigger>
                      <TabsTrigger value="results">Resultat</TabsTrigger>
                      <TabsTrigger value="crawler">Crawler</TabsTrigger>
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
                  </AnimatePresence>
                </Tabs>
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
