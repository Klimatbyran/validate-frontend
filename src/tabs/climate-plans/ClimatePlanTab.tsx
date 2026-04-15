import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClipboardCheck, Eye } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import { Callout } from "@/ui/callout";
import { useI18n } from "@/contexts/I18nContext";
import { useClimatePlans } from "./hooks/useClimatePlans";
import { CompareView } from "./components/CompareView";
import { VerificationQueue } from "./components/VerificationQueue";

type PageTab = "verify" | "overview";

function getTabFromSearchParams(sp: URLSearchParams): PageTab {
  const raw = sp.get("tab");
  return raw === "overview" ? "overview" : "verify";
}

export function ClimatePlanTab() {
  const { t } = useI18n();
  const { municipalities, isLoading, error } = useClimatePlans();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeTab = useMemo(
    () => getTabFromSearchParams(searchParams),
    [searchParams],
  );

  const setTab = (tab: PageTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: false },
    );
  };

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

  return (
    <div className="space-y-6">
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-02 uppercase tracking-wider font-medium">
                {t("climate.internalReviewTool")}
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-01">
              {t("climate.title")}
            </h2>
            <p className="text-sm text-gray-02 mt-1 max-w-[700px]">
              {t("climate.subtitle")}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-gray-02">
                {municipalities.length === 1
                  ? t("climate.municipalitiesLoadedOne")
                  : t("climate.municipalitiesLoadedMany", {
                      count: municipalities.length,
                    })}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <Tabs value={activeTab} onValueChange={(v) => setTab(v as PageTab)}>
              <TabsList>
                <TabsTrigger value="verify" className="gap-2 px-5">
                  <ClipboardCheck size={16} />
                  {t("climate.tabs.verify")}
                </TabsTrigger>
                <TabsTrigger value="overview" className="gap-2 px-5">
                  <Eye size={16} />
                  {t("climate.tabs.overview")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {activeTab === "verify" ? (
        <VerificationQueue municipalities={municipalities} />
      ) : (
        <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6">
          <CompareView
            municipalities={municipalities}
            onSelectMunicipality={(id) => {
              navigate(`/climate-plans/${id}?mode=overview`, { replace: false });
            }}
            showSummaryCards
          />
        </div>
      )}
    </div>
  );
}

