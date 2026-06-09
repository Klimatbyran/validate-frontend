import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";

export function MultiCompanySelectionBar({
  count,
  onClear,
  onBulkUpdateTags,
  bulkDisabled,
}: {
  count: number;
  onClear: () => void;
  onBulkUpdateTags: () => void;
  bulkDisabled?: boolean;
}) {
  const { t } = useI18n();
  if (count <= 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-03 bg-gray-04/80 px-4 py-3">
      <span className="text-sm font-medium text-gray-01">
        {t("editor.companies.companiesSelected", { count })}
      </span>
      <Button type="button" variant="ghost" size="sm" onClick={onClear}>
        {t("editor.companies.clearSelection")}
      </Button>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={onBulkUpdateTags}
        disabled={bulkDisabled}
      >
        {t("editor.companies.bulkUpdateTags")}
      </Button>
    </div>
  );
}
