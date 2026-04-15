import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ClipboardCheck, Eye } from "lucide-react";
import type { MunicipalityClimatePlan } from "../lib/types";
import { useI18n } from "@/contexts/I18nContext";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import { MunicipalityVerifyView } from "./MunicipalityVerifyView";
import { MunicipalityOverviewView } from "./MunicipalityOverviewView";
import type { MunicipalityMode } from "../ClimatePlanMunicipality";

interface MunicipalityPlanDetailProps {
  municipality: MunicipalityClimatePlan;
  mode: MunicipalityMode;
}

function getPlanPeriod(m: MunicipalityClimatePlan) {
  const ts = m.planScope?.temporal_scope;
  if (!ts?.plan_period_start || !ts.plan_period_end) return null;
  return `${ts.plan_period_start}–${ts.plan_period_end}`;
}

export function MunicipalityPlanDetail({ municipality, mode }: MunicipalityPlanDetailProps) {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

  const planPeriod = useMemo(() => getPlanPeriod(municipality), [municipality]);

  const setMode = (next: MunicipalityMode) => {
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        sp.set("mode", next);
        return sp;
      },
      { replace: false },
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-semibold text-gray-01">{municipality.name}</h2>
          {mode === "verify" && (
            <span className="inline-flex items-center gap-2 bg-green-03/15 text-green-03 text-xs font-medium px-3 py-1.5 rounded-full">
              <ClipboardCheck size={14} />
              {t("climate.tabs.verify")}
            </span>
          )}
        </div>
        <div className="text-sm text-gray-02 mt-1">
          {planPeriod ? planPeriod : t("climate.compare.noData")}
        </div>
      </div>

      {/* Mode toggle (Verify default) */}
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-4">
        <Tabs value={mode} onValueChange={(v) => setMode(v as MunicipalityMode)}>
          <TabsList className="bg-gray-03/30">
            <TabsTrigger value="verify" className="gap-2">
              <ClipboardCheck size={16} />
              {t("climate.tabs.verify")}
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-2">
              <Eye size={16} />
              {t("climate.tabs.overview")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {mode === "verify" ? (
        <MunicipalityVerifyView municipality={municipality} />
      ) : (
        <MunicipalityOverviewView municipality={municipality} />
      )}
    </div>
  );
}

