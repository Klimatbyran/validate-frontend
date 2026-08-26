import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ExternalLink, Pencil, Play, Trash2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { RegistryReportPill } from "@/tabs/overview/lib/coverage-types";
import {
  registryReportPipelineUrl,
  registryReportMenuLabel,
  type RegistryReportYearGroup,
} from "@/tabs/overview/lib/coverage-registry-report-run";

type ReportYearTypeDropdownProps = {
  group: RegistryReportYearGroup;
  onRun: (report: RegistryReportPill) => void;
  onReplace: (report: RegistryReportPill) => void;
  onRemove: (report: RegistryReportPill) => void;
};

export function ReportYearTypeDropdown({
  group,
  onRun,
  onReplace,
  onRemove,
}: ReportYearTypeDropdownProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPosition, setPanelPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const yearLabel = group.year != null ? String(group.year) : "?";
  const className = group.prodReady
    ? "border-green-03/40 bg-green-03/20 text-green-03 hover:bg-green-03/30"
    : "border-yellow-500/40 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30";

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        wrapperRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const triggerEl = triggerRef.current;
      if (!triggerEl) return;
      const rect = triggerEl.getBoundingClientRect();
      setPanelPosition({
        top: rect.bottom + 6,
        left: rect.left,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <div className="relative inline-flex" ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        title={
          group.prodReady
            ? t("overview.coverage.reports.pillInProd")
            : t("overview.coverage.reports.pillInRegistry")
        }
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${className}`}
      >
        {yearLabel}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && panelPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              style={{ top: panelPosition.top, left: panelPosition.left }}
              className="fixed z-[99999] min-w-[16rem] rounded-md border border-gray-03 bg-gray-04 p-1.5 shadow-md"
            >
              {group.reports.map((report) => {
                const href = report.sourceUrl?.trim() || report.url;
                const typeLabel = registryReportMenuLabel(
                  report,
                  group.reports,
                  t("overview.coverage.reports.unknownType"),
                );
                const typeClass = report.prodReady
                  ? "bg-green-03"
                  : "bg-yellow-500";
                return (
                  <div
                    key={report.reportId}
                    className="flex items-center gap-1 rounded px-1 py-1 hover:bg-gray-03/40"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${typeClass}`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-xs text-gray-01">
                      {typeLabel}
                    </span>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={t("crawler.reportLink")}
                      className="rounded-full p-1 text-gray-02 hover:bg-gray-03/60 hover:text-gray-01"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="button"
                      className="rounded-full p-1 text-gray-02 hover:bg-gray-03/60 hover:text-gray-01"
                      title={t("overview.coverage.runReport")}
                      disabled={!registryReportPipelineUrl(report)}
                      onClick={() => {
                        setOpen(false);
                        onRun(report);
                      }}
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full p-1 text-gray-02 hover:bg-gray-03/60 hover:text-gray-01"
                      title={t("overview.coverage.replaceReportUrl")}
                      onClick={() => {
                        setOpen(false);
                        onReplace(report);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full p-1 text-gray-02 hover:bg-pink-03/20 hover:text-pink-03"
                      title={t("overview.coverage.removeReport")}
                      onClick={() => {
                        setOpen(false);
                        onRemove(report);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
