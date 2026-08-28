import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DEFAULT_TAB_FOR_PIPELINE_MODE,
  pipelineModeForTab,
  resolveInitialPipelineMode,
  writeStoredPipelineMode,
  type PipelineMode,
} from "@/lib/pipeline-mode";
import {
  topLevelTabFromPathname,
  type TopLevelTabSegment,
} from "@/lib/top-level-routes";

export interface PipelineModeContextValue {
  pipelineMode: PipelineMode;
  setPipelineMode: (mode: PipelineMode) => void;
}

const PipelineModeContext = createContext<PipelineModeContextValue | undefined>(
  undefined,
);

function tabFromLocation(pathname: string): TopLevelTabSegment {
  return topLevelTabFromPathname(pathname) ?? "crawler";
}

export function PipelineModeProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = tabFromLocation(location.pathname);

  const [pipelineMode, setPipelineModeState] = useState<PipelineMode>(() =>
    resolveInitialPipelineMode(activeTab),
  );

  // Keep mode in sync when navigating to a pipeline-specific tab.
  useEffect(() => {
    const modeFromTab = pipelineModeForTab(activeTab);
    if (modeFromTab && modeFromTab !== pipelineMode) {
      setPipelineModeState(modeFromTab);
      writeStoredPipelineMode(modeFromTab);
    }
  }, [activeTab, pipelineMode]);

  const setPipelineMode = useCallback(
    (mode: PipelineMode) => {
      setPipelineModeState(mode);
      writeStoredPipelineMode(mode);

      const modeForCurrentTab = pipelineModeForTab(activeTab);
      if (modeForCurrentTab && modeForCurrentTab !== mode) {
        navigate(`/${DEFAULT_TAB_FOR_PIPELINE_MODE[mode]}`, { replace: false });
      }
    },
    [activeTab, navigate],
  );

  const value = useMemo(
    () => ({ pipelineMode, setPipelineMode }),
    [pipelineMode, setPipelineMode],
  );

  return (
    <PipelineModeContext.Provider value={value}>
      {children}
    </PipelineModeContext.Provider>
  );
}

export function usePipelineMode(): PipelineModeContextValue {
  const ctx = useContext(PipelineModeContext);
  if (ctx === undefined) {
    throw new Error("usePipelineMode must be used within PipelineModeProvider");
  }
  return ctx;
}
