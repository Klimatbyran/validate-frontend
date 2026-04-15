import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Callout } from "@/ui/callout";
import { useI18n } from "@/contexts/I18nContext";
import { useClimatePlans } from "./hooks/useClimatePlans";
import { MunicipalityPlanDetail } from "./components/MunicipalityPlanDetail";

export type MunicipalityMode = "verify" | "overview";

function getModeFromSearchParams(sp: URLSearchParams): MunicipalityMode {
  const raw = sp.get("mode");
  return raw === "overview" ? "overview" : "verify";
}

export function ClimatePlanMunicipality() {
  const { t } = useI18n();
  const { municipalityId } = useParams<{ municipalityId: string }>();
  const [searchParams] = useSearchParams();
  const { municipalities, isLoading, error } = useClimatePlans();

  const mode = getModeFromSearchParams(searchParams);

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

  const municipality = municipalities.find((m) => m.id === municipalityId);
  if (!municipality || !municipalityId) {
    return (
      <div className="space-y-4">
        <Callout variant="error">{t("climate.detail.notFound")}</Callout>
        <Link
          to="/climate-plans"
          className="text-sm text-gray-02 hover:text-gray-01 transition-colors"
        >
          {t("climate.detail.backToComparison")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/climate-plans"
        className="flex items-center gap-2 text-sm text-gray-02 hover:text-gray-01 transition-colors"
      >
        <ArrowLeft size={16} />
        {t("climate.detail.backToComparison")}
      </Link>

      <MunicipalityPlanDetail municipality={municipality} mode={mode} />
    </div>
  );
}

