import { Check, X } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";

export function YesNoBadge({ value }: { value: boolean }) {
  const { t } = useI18n();
  return value ? (
    <span className="inline-flex items-center gap-1 bg-green-03/20 text-green-03 text-xs font-medium px-2 py-1 rounded-full">
      <Check size={12} /> {t("common.yes")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 bg-gray-03/40 text-gray-02 text-xs px-2 py-1 rounded-full">
      <X size={12} /> {t("common.no")}
    </span>
  );
}

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "blue" | "green" | "orange" | "pink" | "default";
}) {
  const styles = {
    blue: "bg-blue-03/20 text-blue-03",
    green: "bg-green-03/20 text-green-03",
    orange: "bg-orange-03/20 text-orange-03",
    pink: "bg-pink-03/20 text-pink-03",
    default: "bg-gray-03/50 text-gray-02",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full",
        styles[variant],
      )}
    >
      {children}
    </span>
  );
}

export function ScopeBadges({
  explicit,
  implicit,
}: {
  explicit?: string[];
  implicit?: string[];
}) {
  const { t } = useI18n();
  const all = new Set([...(explicit || []), ...(implicit || [])]);
  if (all.size === 0) {
    return (
      <span className="text-xs text-gray-02">{t("climate.compare.notSpecified")}</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {["1", "2", "3"].map((s) => (
        <span
          key={s}
          className={cn(
            "text-xs font-medium px-2.5 py-1 rounded-full",
            all.has(s)
              ? explicit?.includes(s)
                ? "bg-blue-03/20 text-blue-03"
                : "bg-blue-03/10 text-blue-03/60 border border-blue-03/20"
              : "bg-gray-03/30 text-gray-02",
          )}
        >
          {t("climate.compare.scopeNumber", { n: s })}
          {all.has(s) && !explicit?.includes(s) && (
            <span className="text-xs ml-1">{t("climate.compare.implicit")}</span>
          )}
        </span>
      ))}
    </div>
  );
}

