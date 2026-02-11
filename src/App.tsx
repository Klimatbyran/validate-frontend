import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Header } from "@/components/ui/header";
import { QueueStatus } from "@/components/ui/queue-status";
import { SwimlaneQueueStatus } from "@/views/swimlane-queue-status";
import { WorkflowDiagram } from "@/components/ui/workflow-diagram";
import { DebugView } from "@/views/debug-view";
import { Toaster } from "@/components/ui/sonner";
import { Routes, Route } from "react-router-dom";
import SlideshowPage from "./views/SlideshowPage";
import { UploadTab } from "./components/tabs/upload/UploadTab";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthCallback } from "@/pages/AuthCallback";
import { GlobalLoginModal } from "@/components/GlobalLoginModal";

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
                    {/*                     <TabsTrigger value="debug">Debug</TabsTrigger>
                     */}{" "}
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
                        <QueueStatus />
                      </motion.div>
                    </TabsContent>

                    <TabsContent key="jobbstatus" value="jobbstatus" asChild>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                      >
                        <SwimlaneQueueStatus />
                      </motion.div>
                    </TabsContent>

                    <TabsContent key="workflow" value="workflow" asChild>
                      <motion.div>
                        <WorkflowDiagram />
                      </motion.div>
                    </TabsContent>

                    {/* <TabsContent key="debug" value="debug" asChild>
                      <motion.div>
                        <DebugView />
                      </motion.div>
                    </TabsContent> */}

                    <TabsContent key="results" value="results" asChild>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6"
                      >
                        <h2 className="text-xl text-gray-01 mb-4">
                          Resultatöversikt
                        </h2>
                        <p className="text-gray-02">
                          Här kommer resultaten att visas när bearbetningen är
                          klar.
                        </p>
                      </motion.div>
                    </TabsContent>

                    <TabsContent key="crawler" value="crawler" asChild>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6"
                      >
                        <h2 className="text-xl text-gray-01 mb-4">Crawler</h2>
                        <p className="text-gray-02">
                          Omg, no crawler to be found yet! Check back later.
                        </p>
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
