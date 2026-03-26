import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";

export function AutoApproveToggle({
  value,
  onChange,
  className,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <span className="text-sm text-gray-02">{t("upload.autoApprove")}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full",
          "transition-colors focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring",
          "focus-visible:ring-offset-2",
          value ? "bg-green-03" : "bg-gray-03"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full",
            "bg-white transition-transform",
            value ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

