import { useEffect, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

type CoverageRunReportYearPromptProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  yearOptions: number[];
  onConfirm: (year: number) => void;
};

export function CoverageRunReportYearPrompt({
  open,
  onOpenChange,
  companyName,
  yearOptions,
  onConfirm,
}: CoverageRunReportYearPromptProps) {
  const { t } = useI18n();
  const yearOptionsKey = yearOptions.join(",");
  const defaultYear = yearOptions[0] ?? null;
  const [selectedYear, setSelectedYear] = useState(() =>
    String(defaultYear ?? ""),
  );

  useEffect(() => {
    if (!open || defaultYear == null) return;
    setSelectedYear(String(defaultYear));
  }, [open, yearOptionsKey, defaultYear]);

  const parsedYear = Number.parseInt(selectedYear, 10);
  const isValidYear =
    Number.isFinite(parsedYear) && yearOptions.includes(parsedYear);

  const handleConfirm = () => {
    if (!isValidYear) return;
    onConfirm(parsedYear);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(100vw-2rem,24rem)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("overview.coverage.runReportYearTitle")}</DialogTitle>
          <DialogDescription className="text-left">
            {t("overview.coverage.runReportYearDescription", {
              name: companyName,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <label className="block text-sm font-medium text-gray-01">
            {t("crawler.reportYear")}
          </label>
          <div className="flex flex-wrap gap-2">
            {yearOptions.map((year) => {
              const active = selectedYear === String(year);
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(String(year))}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    active
                      ? "border-orange-03 bg-orange-03/20 text-orange-03"
                      : "border-gray-03 text-gray-02 hover:border-gray-02 hover:text-gray-01"
                  }`}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="whitespace-nowrap"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="whitespace-nowrap"
            disabled={!isValidYear}
            onClick={handleConfirm}
          >
            {t("overview.coverage.runReportContinue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
