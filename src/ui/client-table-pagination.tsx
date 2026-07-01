import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";

type Props = {
  from: number;
  to: number;
  filteredTotal: number;
  unfilteredTotal?: number;
  page: number;
  totalPages: number;
  showAll: boolean;
  canPaginate: boolean;
  onPageChange: (page: number) => void;
  onShowAllChange: (showAll: boolean) => void;
};

export function ClientTablePagination({
  from,
  to,
  filteredTotal,
  unfilteredTotal,
  page,
  totalPages,
  showAll,
  canPaginate,
  onPageChange,
  onShowAllChange,
}: Props) {
  const { t } = useI18n();

  if (filteredTotal === 0) {
    return (
      <p className="px-4 py-2 text-xs text-gray-01/90 border-t border-gray-03/50">
        {t("common.pagination.empty")}
      </p>
    );
  }

  const filtersActive =
    unfilteredTotal != null && unfilteredTotal !== filteredTotal;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-2 text-xs text-gray-01/90 border-t border-gray-03/50">
      <p>
        {showAll
          ? t("common.pagination.showingAll", { total: filteredTotal })
          : t("common.pagination.range", { from, to, total: filteredTotal })}
        {filtersActive
          ? ` ${t("common.pagination.filteredOfTotal", {
              total: unfilteredTotal,
            })}`
          : null}
      </p>

      {canPaginate ? (
        <div className="flex flex-wrap items-center gap-2">
          {showAll ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onShowAllChange(false)}
            >
              {t("common.pagination.showPages")}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 text-xs"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                {t("common.pagination.prev")}
              </Button>
              <span className="text-gray-02 tabular-nums">
                {t("common.pagination.page", { page, totalPages })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => onShowAllChange(true)}
              >
                {t("common.pagination.showAll")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 text-xs"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                {t("common.pagination.next")}
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
