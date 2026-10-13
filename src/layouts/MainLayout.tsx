import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import { Header } from "@/ui/header";
import { Toaster } from "@/ui/sonner";
import {
  PipelineModeProvider,
  usePipelineMode,
} from "@/contexts/PipelineModeContext";
import { useI18n } from "@/contexts/I18nContext";
import {
  PIPELINE_MODES,
  PIPELINE_TAB_SEGMENTS,
  UNIVERSAL_TAB_SEGMENTS,
  type PipelineMode,
} from "@/lib/pipeline-mode";
import {
  type TopLevelTabSegment,
  topLevelTabFromPathname,
} from "@/lib/top-level-routes";
import { cn } from "@/lib/utils";

const TABS_WITH_SPACED_CONTENT = new Set<TopLevelTabSegment>([
  "jobbstatus",
  "editor",
]);

function pipelineModeLabelKey(mode: PipelineMode): string {
  return mode === "emissions"
    ? "nav.pipelineEmissions"
    : "nav.pipelineClimatePlans";
}

function tabLabelKey(tab: TopLevelTabSegment): string {
  switch (tab) {
    case "upload":
      return "nav.upload";
    case "jobbstatus":
      return "nav.jobStatus";
    case "workflow":
      return "nav.workflow";
    case "debug":
      return "nav.debug";
    case "errors":
      return "nav.errorBrowser";
    case "editor":
      return "nav.editor";
    case "climate-plans":
      return "nav.climatePlans";
    case "climate-pipeline":
      return "nav.climatePipeline";
    case "climate-qa-reviews":
      return "nav.climateQaReviews";
    case "municipality-sources":
      return "nav.municipalitySources";
  }
}

function MainNav() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { pipelineMode, setPipelineMode } = usePipelineMode();

  const tab: TopLevelTabSegment =
    topLevelTabFromPathname(location.pathname) ?? "upload";

  const secondaryTabs = PIPELINE_TAB_SEGMENTS[pipelineMode];

  return (
    <div className="space-y-4">
      <Tabs
        value={tab}
        onValueChange={(value) => {
          navigate(`/${value}`, { replace: false });
        }}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <TabsList className="bg-gray-04/50 backdrop-blur-sm">
              {UNIVERSAL_TAB_SEGMENTS.map((segment) => (
                <TabsTrigger key={segment} value={segment}>
                  {t(tabLabelKey(segment))}
                </TabsTrigger>
              ))}
            </TabsList>

            <div
              role="group"
              aria-label={t("nav.pipelineChoice")}
              className="inline-flex h-12 items-center rounded-full bg-gray-04/50 p-1 text-gray-02 backdrop-blur-sm"
            >
              {PIPELINE_MODES.map((mode) => {
                const isActive = pipelineMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setPipelineMode(mode)}
                    className={cn(
                      "inline-flex items-center justify-center whitespace-nowrap rounded-full px-6 py-2.5 text-sm font-medium transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isActive
                        ? "bg-gray-01 text-gray-05 shadow-sm"
                        : "text-gray-02 hover:text-gray-01",
                    )}
                  >
                    {t(pipelineModeLabelKey(mode))}
                  </button>
                );
              })}
            </div>
          </div>

          <TabsList className="bg-gray-04/50 backdrop-blur-sm self-start">
            {secondaryTabs.map((segment) => (
              <TabsTrigger key={segment} value={segment}>
                {t(tabLabelKey(segment))}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className={
            TABS_WITH_SPACED_CONTENT.has(tab) ? "mt-2 space-y-6" : "mt-2"
          }
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-05 p-8">
      <Toaster />
      <div className="max-w-[1400px] mx-auto">
        <Header />
        <PipelineModeProvider>
          <MainNav />
        </PipelineModeProvider>
      </div>
    </div>
  );
}
