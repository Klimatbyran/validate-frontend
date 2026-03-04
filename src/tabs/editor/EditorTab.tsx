import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { ManageTagOptions } from "./components/ManageTagOptions";

export type EditorViewMode = "tag-options";

const VIEW_MODES: { value: EditorViewMode; labelKey: string }[] = [
  { value: "tag-options", labelKey: "editor.manageTagOptions" },
];

export function EditorTab() {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<EditorViewMode>("tag-options");

  return (
    <div className="flex flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 flex flex-col gap-4"
      >
        <div>
          <h2 className="text-xl font-semibold text-gray-01">{t("editor.title")}</h2>
          <p className="text-sm text-gray-02 mt-1">{t("editor.subtitle")}</p>
        </div>
        <div className="flex rounded-full overflow-hidden border border-gray-02/20 bg-gray-04/50 p-1">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setViewMode(mode.value)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-all",
                viewMode === mode.value
                  ? "bg-gray-01 text-gray-05 shadow-sm"
                  : "text-gray-02 hover:text-gray-01"
              )}
            >
              {t(mode.labelKey)}
            </button>
          ))}
        </div>
        {viewMode === "tag-options" && (
          <div className="pt-2">
            <ManageTagOptions />
          </div>
        )}
      </motion.div>
    </div>
  );
}
