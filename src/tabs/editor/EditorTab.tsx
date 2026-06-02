import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { ViewModePills } from "@/ui/view-mode-pills";
import { getUnearthTarget } from "@/config/api-env";
import { ManageTagOptions } from "./components/tag-options/ManageTagOptions";
import { MultiCompanyView } from "./components/multi-company/MultiCompanyView";
import { SingleCompanyView } from "./components/single-company/SingleCompanyView";
import { EDITOR_INDEX_PATH } from "./lib/editor-routes";

export type EditorViewMode = "tag-options" | "multi-company" | "single-company";

const VIEW_MODES: { value: EditorViewMode; labelKey: string }[] = [
  { value: "single-company", labelKey: "editor.singleCompany" },
  { value: "multi-company", labelKey: "editor.multiCompany" },
  { value: "tag-options", labelKey: "editor.manageTagOptions" },
];

export function EditorTab() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { companyId: routeCompanyId } = useParams<{ companyId?: string }>();
  const [viewMode, setViewMode] = useState<EditorViewMode>("single-company");
  const pillOptions = useMemo(
    () => VIEW_MODES.map((m) => ({ value: m.value, label: t(m.labelKey) })),
    [t]
  );

  useEffect(() => {
    if (routeCompanyId) {
      setViewMode("single-company");
    }
  }, [routeCompanyId]);

  const handleViewModeChange = (mode: EditorViewMode) => {
    setViewMode(mode);
    if (mode !== "single-company" && routeCompanyId) {
      navigate(EDITOR_INDEX_PATH, { replace: true });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-semibold text-gray-01">{t("editor.title")}</h2>
            <p className="text-sm text-gray-02 mt-1">{t("editor.subtitle")}</p>
          </div>
          <ViewModePills
            options={pillOptions}
            value={viewMode}
            onValueChange={handleViewModeChange}
            ariaLabel={t("editor.viewMode")}
            className="shrink-0"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-gray-03 bg-gray-05 px-4 py-2.5">
          <div className="text-sm text-gray-01 font-medium">
            {t("editor.dataSourceLabel")}{" "}
            <span className="ml-1 inline-flex items-center rounded-full border border-gray-03 bg-gray-04 px-2 py-0.5 text-xs font-semibold text-gray-01">
              {getUnearthTarget().toUpperCase()}
            </span>
          </div>
        </div>
      </motion.div>

      {viewMode === "tag-options" && <ManageTagOptions />}
      {viewMode === "multi-company" && <MultiCompanyView />}
      {viewMode === "single-company" && <SingleCompanyView />}
    </div>
  );
}
