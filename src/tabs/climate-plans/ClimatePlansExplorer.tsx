import { useState } from "react";
import { Callout } from "@/ui/callout";
import { useI18n } from "@/contexts/I18nContext";
import { useClimatePlans } from "./hooks/useClimatePlans";
import { CompareView } from "./components/CompareView";
import { MunicipalityDetail } from "./components/MunicipalityDetail";

export function ClimatePlansExplorer() {
  const { t } = useI18n();
  const { municipalities, isLoading, error } = useClimatePlans();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"compare" | "detail">("compare");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-02 text-sm">{t("climate.loading")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <Callout variant="error">
        {t("climate.loadFailed", { error: String(error) })}
      </Callout>
    );
  }

  if (municipalities.length === 0) {
    return (
      <div className="text-gray-02 text-sm py-10 text-center">
        {t("climate.noneFound")}
      </div>
    );
  }

  // Show detail view
  if (view === "detail" && selectedId) {
    const municipality = municipalities.find((m) => m.id === selectedId);
    if (municipality) {
      return (
        <MunicipalityDetail
          municipality={municipality}
          onBack={() => { setView("compare"); setSelectedId(null); }}
        />
      );
    }
  }

  // Compare view - if only one municipality, duplicate it to demo the comparison UI
  const compareData = municipalities.length === 1
    ? municipalities
    : municipalities;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-01">
            {t("climate.comparison")}
          </h2>
          <p className="text-sm text-gray-02 mt-1">
            {municipalities.length} municipalit{municipalities.length === 1 ? "y" : "ies"} loaded
            {municipalities.length === 1 && " — add more to compare"}
          </p>
        </div>
      </div>

      <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6">
        <CompareView
          municipalities={compareData}
          onSelectMunicipality={(id) => { setSelectedId(id); setView("detail"); }}
        />
      </div>
    </div>
  );
}
