import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { ViewModePills } from "@/ui/view-mode-pills";
import { ManageTagOptions } from "./components/ManageTagOptions";
import { MultiCompanyView } from "./components/MultiCompanyView";
import { SingleCompanyView } from "./components/SingleCompanyView";

export type EditorViewMode = "tag-options" | "multi-company" | "single-company";

const VIEW_MODES: { value: EditorViewMode; labelKey: string }[] = [
  { value: "multi-company", labelKey: "editor.multiCompany" },
  { value: "single-company", labelKey: "editor.singleCompany" },
  { value: "tag-options", labelKey: "editor.manageTagOptions" },
];

export function EditorTab() {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<EditorViewMode>("multi-company");
  const pillOptions = useMemo(
    () => VIEW_MODES.map((m) => ({ value: m.value, label: t(m.labelKey) })),
    [t]
  );

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
            onValueChange={setViewMode}
            ariaLabel={t("editor.viewMode")}
            className="shrink-0"
          />
        </div>
        {viewMode === "tag-options" && (
          <div className="pt-2">
            <ManageTagOptions />
          </div>
        )}
        {viewMode === "multi-company" && (
          <div className="pt-2">
            <MultiCompanyView />
          </div>
        )}
        {viewMode === "single-company" && (
          <div className="pt-2">
            <SingleCompanyView />
          </div>
        )}
      </motion.div>
    </div>
  );
}
