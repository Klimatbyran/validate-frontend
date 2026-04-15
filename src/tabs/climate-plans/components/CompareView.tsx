import { useState } from "react";
import type { ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  Target,
  Calendar,
  Scale,
  Globe,
  BarChart3,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { MunicipalityClimatePlan } from "../lib/types";
import { cn } from "@/lib/utils";
import { MunicipalitySummaryCard } from "./compare/MunicipalitySummaryCard";
import { TargetsPanel } from "./compare/panels/TargetsPanel";
import { TimelinePanel } from "./compare/panels/TimelinePanel";
import { FrameworkPanel } from "./compare/panels/FrameworkPanel";
import { ScopePanel } from "./compare/panels/ScopePanel";
import { AccountingPanel } from "./compare/panels/AccountingPanel";

interface CompareViewProps {
  municipalities: MunicipalityClimatePlan[];
  onSelectMunicipality: (id: string) => void;
  showSummaryCards?: boolean;
}

type Category = "targets" | "timeline" | "framework" | "scope" | "accounting";

const CATEGORY_IDS: { id: Category; labelKey: string; icon: ReactNode }[] = [
  { id: "targets", labelKey: "climate.compare.targets", icon: <Target size={16} /> },
  { id: "timeline", labelKey: "climate.compare.timeline", icon: <Calendar size={16} /> },
  { id: "framework", labelKey: "climate.compare.frameworks", icon: <Scale size={16} /> },
  { id: "scope", labelKey: "climate.compare.scope", icon: <Globe size={16} /> },
  { id: "accounting", labelKey: "climate.compare.accounting", icon: <BarChart3 size={16} /> },
];

export function CompareView({
  municipalities,
  onSelectMunicipality,
  showSummaryCards = true,
}: CompareViewProps) {
  const { t } = useI18n();
  const [expandedCategory, setExpandedCategory] = useState<Category | null>(null);

  const toggleCategory = (cat: Category) => {
    setExpandedCategory(expandedCategory === cat ? null : cat);
  };

  const panelMap: Record<Category, ReactNode> = {
    targets: <TargetsPanel municipalities={municipalities} />,
    timeline: <TimelinePanel municipalities={municipalities} />,
    framework: <FrameworkPanel municipalities={municipalities} />,
    scope: <ScopePanel municipalities={municipalities} />,
    accounting: <AccountingPanel municipalities={municipalities} />,
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {showSummaryCards && (
        <div className="flex gap-4 flex-wrap">
          {municipalities.map((m) => (
            <MunicipalitySummaryCard
              key={m.id}
              m={m}
              onClick={() => onSelectMunicipality(m.id)}
            />
          ))}
        </div>
      )}

      {/* Category drill-down */}
      <div className="space-y-2">
        <div className="text-xs text-gray-02 uppercase tracking-wider font-medium">
          {t("climate.compare.compareInDetail")}
        </div>
        {CATEGORY_IDS.map((cat) => (
          <div key={cat.id}>
            <button
              onClick={() => toggleCategory(cat.id)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-lg transition-colors",
                expandedCategory === cat.id
                  ? "bg-gray-03/50 rounded-b-none"
                  : "bg-gray-04/80 hover:bg-gray-03/30"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-02">{cat.icon}</span>
                <span className="text-sm font-medium text-gray-01">{t(cat.labelKey)}</span>
              </div>
              {expandedCategory === cat.id ? (
                <ChevronUp size={16} className="text-gray-02" />
              ) : (
                <ChevronDown size={16} className="text-gray-02" />
              )}
            </button>
            {expandedCategory === cat.id && (
              <div className="bg-gray-04/60 rounded-b-lg p-5 border-t border-gray-03/30">
                {panelMap[cat.id]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
