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
import type { RegistryEntry, RegistryEntryUpdate } from "../lib/registry-types";

interface RegistryEditModalProps {
  entry: RegistryEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (entry: RegistryEntryUpdate) => Promise<void>;
  isEditing: boolean;
}

const RegistryEditModal = ({
  entry,
  open,
  onOpenChange,
  onEdit,
  isEditing,
}: RegistryEditModalProps) => {
  const { t } = useI18n();
  const [companyName, setCompanyName] = useState(entry.companyName ?? "");
  const [wikidataId, setWikidataId] = useState(entry.wikidataId ?? "");
  const [reportYear, setReportYear] = useState(entry.reportYear ?? "");
  const [url, setUrl] = useState(entry.url);
  const [yearError, setYearError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    setCompanyName(entry.companyName ?? "");
    setWikidataId(entry.wikidataId ?? "");
    setReportYear(entry.reportYear ?? "");
    setUrl(entry.url);
    setYearError(null);
    setUrlError(null);
  }, [entry.companyName, entry.reportYear, entry.url, entry.wikidataId]);

  const handleSaveEdit = async () => {
    if (!entry.id) return;

    const trimmedCompanyName = companyName.trim();
    const trimmedWikidataId = wikidataId.trim();
    const trimmedReportYear = reportYear.trim();
    const trimmedUrl = url.trim();

    let hasError = false;

    if (trimmedReportYear) {
      const yearNum = Number(trimmedReportYear);
      if (
        !/^\d{4}$/.test(trimmedReportYear) ||
        yearNum < 1900 ||
        yearNum > 2100
      ) {
        setYearError(t("registry.invalidYear"));
        hasError = true;
      }
    }

    if (trimmedUrl) {
      try {
        new URL(trimmedUrl);
      } catch {
        setUrlError(t("registry.invalidUrl"));
        hasError = true;
      }
    }

    if (hasError) return;

    const updates: RegistryEntryUpdate = {
      id: entry.id,
    };

    if (trimmedCompanyName) updates.companyName = trimmedCompanyName;
    if (trimmedWikidataId) updates.wikidataId = trimmedWikidataId;
    if (trimmedReportYear) updates.reportYear = trimmedReportYear;
    if (trimmedUrl) updates.url = trimmedUrl;

    if (Object.keys(updates).length === 1) {
      onOpenChange(false);
      return;
    }

    await onEdit(updates);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("registry.editReport")}</DialogTitle>
          <DialogDescription>
            {entry.companyName ?? t("registry.unknownId")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <label className="text-sm text-gray-02">
            {t("registry.companyName")}
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className="mt-1 w-full bg-gray-03/20 border border-gray-03 rounded-lg px-3 py-2 text-gray-01"
            />
          </label>
          <label className="text-sm text-gray-02">
            {t("registry.wikidataId")}
            <input
              value={wikidataId}
              onChange={(event) => setWikidataId(event.target.value)}
              className="mt-1 w-full bg-gray-03/20 border border-gray-03 rounded-lg px-3 py-2 text-gray-01"
            />
          </label>
          <label className="text-sm text-gray-02">
            {t("registry.reportYear")}
            <input
              value={reportYear}
              onChange={(event) => {
                setReportYear(event.target.value);
                setYearError(null);
              }}
              className={`mt-1 w-full bg-gray-03/20 border rounded-lg px-3 py-2 text-gray-01 ${
                yearError ? "border-red-500" : "border-gray-03"
              }`}
            />
            {yearError && (
              <span className="mt-1 block text-xs text-red-500">
                {yearError}
              </span>
            )}
          </label>
          <label className="text-sm text-gray-02">
            {t("registry.reportUrl")}
            <input
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setUrlError(null);
              }}
              className={`mt-1 w-full bg-gray-03/20 border rounded-lg px-3 py-2 text-gray-01 ${
                urlError ? "border-red-500" : "border-gray-03"
              }`}
            />
            {urlError && (
              <span className="mt-1 block text-xs text-red-500">
                {urlError}
              </span>
            )}
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isEditing}
          >
            {t("registry.cancel")}
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSaveEdit()}
            disabled={isEditing || !!yearError || !!urlError}
          >
            {t("registry.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegistryEditModal;
