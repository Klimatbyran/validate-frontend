import { Link } from "react-router-dom";
import { ClipboardCheck, ChevronRight } from "lucide-react";
import type { MunicipalityClimatePlan } from "../lib/types";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import {
  getMunicipalityVerificationSummarySnapshot,
  useMunicipalityVerificationSummary,
} from "../hooks/useVerificationState";

interface VerificationQueueProps {
  municipalities: MunicipalityClimatePlan[];
}

function StatusPill({
  status,
}: {
  status: "not_started" | "in_progress" | "complete";
}) {
  const { t } = useI18n();
  const label =
    status === "complete"
      ? t("climate.verify.status.complete")
      : status === "in_progress"
        ? t("climate.verify.status.inProgress")
        : t("climate.verify.status.notStarted");

  const classes =
    status === "complete"
      ? "bg-green-03/20 text-green-03"
      : status === "in_progress"
        ? "bg-orange-03/20 text-orange-03"
        : "bg-gray-03/40 text-gray-02";

  return (
    <span className={cn("text-xs font-medium px-3 py-1 rounded-full", classes)}>
      {label}
    </span>
  );
}

export function VerificationQueue({ municipalities }: VerificationQueueProps) {
  const { t } = useI18n();

  const totals = municipalities.reduce(
    (acc, m) => {
      const s = getMunicipalityVerificationSummarySnapshot(m);
      acc.totalStatements += s.total;
      acc.totalReviewed += s.reviewed;
      return acc;
    },
    { totalStatements: 0, totalReviewed: 0 },
  );

  const pct =
    totals.totalStatements > 0
      ? (totals.totalReviewed / totals.totalStatements) * 100
      : 0;

  return (
    <div className="space-y-6">
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-gray-01">
              <ClipboardCheck size={18} />
              <div className="text-lg font-medium">
                {t("climate.verify.queueTitle")}
              </div>
            </div>
            <p className="text-sm text-gray-02 mt-1 max-w-[800px]">
              {t("climate.verify.queueSubtitle")}
            </p>
          </div>

          <div className="text-right">
            <div className="text-3xl font-semibold text-gray-01">
              {totals.totalReviewed}/{totals.totalStatements}
            </div>
            <div className="text-xs text-gray-02 uppercase tracking-wider font-medium">
              {t("climate.verify.totalVerified")}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-2 bg-gray-03/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-03 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-02">
            {t("climate.verify.queueInstruction")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {municipalities.map((m) => (
          <MunicipalityVerifyCard key={m.id} municipality={m} />
        ))}
      </div>
    </div>
  );
}

function MunicipalityVerifyCard({ municipality }: { municipality: MunicipalityClimatePlan }) {
  const { t } = useI18n();
  const summary = useMunicipalityVerificationSummary(municipality);

  const status =
    summary.reviewed === 0
      ? "not_started"
      : summary.reviewed >= summary.total
        ? "complete"
        : "in_progress";

  const progressPct = summary.total > 0 ? (summary.reviewed / summary.total) * 100 : 0;

  return (
    <Link
      to={`/climate-plans/${municipality.id}?mode=verify`}
      className={cn(
        "bg-gray-04/80 backdrop-blur-sm rounded-xl p-5 text-left hover:bg-gray-03/50 transition-colors",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-gray-01">{municipality.name}</div>
          <div className="text-xs text-gray-02 mt-1">
            {t("climate.verify.verificationProgress")}{" "}
            <span className="font-medium text-gray-01">
              {summary.reviewed}/{summary.total}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusPill status={status} />
          <ChevronRight size={16} className="text-gray-02" />
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 bg-gray-03/30 rounded-full overflow-hidden">
          <div className="h-full bg-green-03 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {/* These category counts match the Lovable design but rely on future categorization.
            We keep them as placeholders for now, derived when present. */}
        <div className="bg-gray-03/30 rounded-lg p-3 text-center">
          <div className="text-xl font-semibold text-blue-03">{summary.counts.outcomes}</div>
          <div className="text-xs text-gray-02">{t("climate.verify.categories.outcomes")}</div>
        </div>
        <div className="bg-gray-03/30 rounded-lg p-3 text-center">
          <div className="text-xl font-semibold text-green-03">{summary.counts.activityShifts}</div>
          <div className="text-xs text-gray-02">{t("climate.verify.categories.activityShifts")}</div>
        </div>
        <div className="bg-gray-03/30 rounded-lg p-3 text-center">
          <div className="text-xl font-semibold text-pink-03">{summary.counts.interventions}</div>
          <div className="text-xs text-gray-02">{t("climate.verify.categories.interventions")}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-green-03 font-medium">
          {summary.reviewed === 0
            ? t("climate.verify.startVerification")
            : summary.reviewed < summary.total
              ? t("climate.verify.remaining", { count: summary.total - summary.reviewed })
              : t("climate.verify.allVerified")}
        </div>
      </div>
    </Link>
  );
}

