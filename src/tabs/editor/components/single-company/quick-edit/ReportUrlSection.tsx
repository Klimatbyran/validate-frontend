import type { Dispatch, SetStateAction } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { inputClassName } from "../../../lib/company-edit-utils";
import type { GarboReportingPeriodSummary } from "../../../lib/types";
import type { ReportingPeriodQuickEditEdited } from "../../../lib/reporting-period-quick-edit";
import { ReportUrlBar } from "./ReportUrlBar";

export function ReportUrlSection({
  period,
  edited,
  setEdited,
  setNullableEdit,
}: {
  period: GarboReportingPeriodSummary;
  edited: ReportingPeriodQuickEditEdited;
  setEdited: Dispatch<SetStateAction<ReportingPeriodQuickEditEdited>>;
  setNullableEdit: (
    key: keyof ReportingPeriodQuickEditEdited,
    value: string,
    hadOriginalValue: boolean,
  ) => void;
}) {
  const { t } = useI18n();
  const originalReportURL = period.reportURL ?? null;
  const reportURL =
    edited.reportURL ??
    (originalReportURL != null ? String(originalReportURL) : "");

  return (
    <ReportUrlBar
      title={t("editor.reportingPeriodQuickEdit.reportUrlSection")}
      originalUrl={originalReportURL}
      openLabel={t("editor.periodEditor.openReport")}
      value={reportURL}
      placeholder={t("editor.reportingPeriodQuickEdit.urlPlaceholder")}
      dirty={edited.reportURL != null}
      inputClassName={inputClassName}
      onChange={(next) =>
        setNullableEdit("reportURL", next, originalReportURL != null)
      }
      onReset={() =>
        setEdited((p) => {
          const n = { ...p };
          delete n.reportURL;
          return n;
        })
      }
      resetTitle={t("editor.reportingPeriodQuickEdit.resetReportUrlTitle")}
    />
  );
}
