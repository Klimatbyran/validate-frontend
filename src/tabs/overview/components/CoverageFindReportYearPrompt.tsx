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

type CoverageFindReportYearPromptProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  defaultYear: number;
  isSearching?: boolean;
  onConfirm: (year: number) => void;
};

function recentYearOptions(anchorYear: number): number[] {
  const current = new Date().getFullYear();
  const years = new Set<number>([anchorYear, current]);
  for (let year = current; year >= current - 8; year -= 1) {
    years.add(year);
  }
  return [...years].sort((a, b) => b - a);
}

export function CoverageFindReportYearPrompt({
  open,
  onOpenChange,
  companyName,
  defaultYear,
  isSearching = false,
  onConfirm,
}: CoverageFindReportYearPromptProps) {
  const { t } = useI18n();
  const [selectedYear, setSelectedYear] = useState(String(defaultYear));
  const yearOptions = recentYearOptions(defaultYear);

  useEffect(() => {
    if (open) {
      setSelectedYear(String(defaultYear));
    }
  }, [open, defaultYear]);

  const parsedYear = Number.parseInt(selectedYear, 10);
  const isValidYear =
    Number.isFinite(parsedYear) &&
    parsedYear >= 1990 &&
    parsedYear <= new Date().getFullYear() + 1;

  const handleConfirm = () => {
    if (!isValidYear || isSearching) return;
    onConfirm(parsedYear);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(100vw-2rem,24rem)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t("overview.coverage.findReportYearTitle")}
          </DialogTitle>
          <DialogDescription className="text-left">
            {t("overview.coverage.findReportYearDescription", {
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
                  disabled={isSearching}
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
          <input
            type="number"
            min={1990}
            max={new Date().getFullYear() + 1}
            value={selectedYear}
            disabled={isSearching}
            onChange={(event) => setSelectedYear(event.target.value)}
            className="w-full rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm text-gray-01 focus:outline-none focus:ring-2 focus:ring-orange-03"
          />
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="whitespace-nowrap"
            disabled={isSearching}
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="whitespace-nowrap"
            disabled={!isValidYear || isSearching}
            onClick={handleConfirm}
          >
            {isSearching
              ? t("overview.coverage.findReportSearching")
              : t("overview.coverage.findReportSearch")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
