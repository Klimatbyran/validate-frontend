import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";

export function AutoApproveToggle({
  value,
  onChange,
  className,
  showScopeHint = false,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  className?: string;
  /** When true, explains that auto-approve only skips Wikidata staff review. */
  showScopeHint?: boolean;
}) {
  const { t } = useI18n();
  const label = t("upload.autoApprove");
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-02">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={value}
          aria-label={label}
          onClick={() => onChange(!value)}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full",
            "transition-colors focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring",
            "focus-visible:ring-offset-2",
            value ? "bg-green-03" : "bg-gray-03",
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full",
              "bg-white transition-transform",
              value ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </div>
      {showScopeHint ? (
        <p className="text-xs text-gray-02 max-w-md">
          {t("upload.autoApproveHint")}
        </p>
      ) : null}
    </div>
  );
}
