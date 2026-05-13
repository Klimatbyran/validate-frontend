import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Header } from "@/ui/header";
import { Toaster } from "@/ui/sonner";
import { CompaniesProvider } from "@/contexts/CompaniesContext";
import { useI18n } from "@/contexts/I18nContext";
import { JobStatusOverlay } from "@/components/JobStatusOverlay";
import {
  type TopLevelTabSegment,
  topLevelTabFromPathname,
} from "@/lib/top-level-routes";

export function MainLayout() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const tab: TopLevelTabSegment =
    topLevelTabFromPathname(location.pathname) ?? "upload";

  return (
    <div className="min-h-screen bg-gray-05 p-8">
      <Toaster />
      <div className="max-w-[1400px] mx-auto">
        <Header />
        <CompaniesProvider>
          <Tabs
            value={tab}
            onValueChange={(value) => {
              navigate(`/${value}`, { replace: false });
            }}
            className="space-y-6"
          >
            <TabsList className="bg-gray-04/50 backdrop-blur-sm">
              <TabsTrigger value="crawler">{t("nav.crawler")}</TabsTrigger>
              <TabsTrigger value="registry">{t("nav.registry")}</TabsTrigger>
              <TabsTrigger value="upload">{t("nav.upload")}</TabsTrigger>
              <TabsTrigger value="jobbstatus">{t("nav.jobStatus")}</TabsTrigger>
              <TabsTrigger value="workflow">{t("nav.workflow")}</TabsTrigger>
              <TabsTrigger value="debug">{t("nav.debug")}</TabsTrigger>
              <TabsTrigger value="errors">{t("nav.errorBrowser")}</TabsTrigger>
              <TabsTrigger value="editor">{t("nav.editor")}</TabsTrigger>
              <TabsTrigger value="climate-plans">
                {t("nav.climatePlans")}
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="popLayout" initial={false}>
              <TabsContent key={tab} value={tab} asChild>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={
                    tab === "jobbstatus" ||
                    tab === "crawler" ||
                    tab === "registry" ||
                    tab === "editor"
                      ? "space-y-6"
                      : undefined
                  }
                >
                  <Outlet />
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
          <JobStatusOverlay />
        </CompaniesProvider>
      </div>
    </div>
  );
}
