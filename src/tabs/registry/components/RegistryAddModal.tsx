import { useState } from "react";
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
import type { RegistryNewEntry } from "../lib/registry-types";
import {
  isValidHttpUrl,
  isValidOptionalHttpUrl,
} from "../lib/registry-utils";

interface RegistryAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (entry: RegistryNewEntry) => Promise<void>;
  isAdding: boolean;
}

const RegistryAddModal = ({
  open,
  onOpenChange,
  onAdd,
  isAdding,
}: RegistryAddModalProps) => {
  const { t } = useI18n();
  const [companyName, setCompanyName] = useState("");
  const [wikidataId, setWikidataId] = useState("");
  const [reportYear, setReportYear] = useState("");
  const [url, setUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceUrlTouched, setSourceUrlTouched] = useState(false);

  const [companyNameError, setCompanyNameError] = useState<string | null>(null);
  const [yearError, setYearError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [sourceUrlError, setSourceUrlError] = useState<string | null>(null);

  const resetForm = () => {
    setCompanyName("");
    setWikidataId("");
    setReportYear("");
    setUrl("");
    setSourceUrl("");
    setSourceUrlTouched(false);
    setCompanyNameError(null);
    setYearError(null);
    setUrlError(null);
    setSourceUrlError(null);
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setUrlError(null);
    if (!sourceUrlTouched) {
      setSourceUrl(value);
    }
  };

  const handleSourceUrlChange = (value: string) => {
    setSourceUrl(value);
    setSourceUrlTouched(true);
    setSourceUrlError(null);
  };

  const handleAdd = async () => {
    const trimmedName = companyName.trim();
    const trimmedWikidata = wikidataId.trim();
    const trimmedYear = reportYear.trim();
    const trimmedUrl = url.trim();
    const trimmedSource = sourceUrl.trim();

    let hasError = false;

    if (!trimmedName) {
      setCompanyNameError(t("registry.companyNameRequired"));
      hasError = true;
    } else {
      setCompanyNameError(null);
    }

    if (!trimmedYear) {
      setYearError(t("registry.reportYearRequired"));
      hasError = true;
    } else {
      const yearNum = Number(trimmedYear);
      if (!/^\d{4}$/.test(trimmedYear) || yearNum < 1900 || yearNum > 2100) {
        setYearError(t("registry.invalidYear"));
        hasError = true;
      } else {
        setYearError(null);
      }
    }

    if (!isValidHttpUrl(trimmedUrl)) {
      setUrlError(t("registry.invalidUrl"));
      hasError = true;
    } else {
      setUrlError(null);
    }

    if (!isValidOptionalHttpUrl(trimmedSource)) {
      setSourceUrlError(t("registry.invalidUrl"));
      hasError = true;
    } else {
      setSourceUrlError(null);
    }

    if (hasError) return;

    await onAdd({
      companyName: trimmedName,
      wikidataId: trimmedWikidata || undefined,
      reportYear: trimmedYear,
      url: trimmedUrl,
      sourceUrl: trimmedSource || undefined,
    });

    resetForm();
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (isAdding) return;
    if (!open) resetForm();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("registry.addEntryTitle")}</DialogTitle>
          <DialogDescription>{t("registry.addEntryDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <label className="text-sm text-gray-02">
            {t("registry.companyName")}
            <span className="text-red-400 ml-0.5">*</span>
            <input
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                setCompanyNameError(null);
              }}
              className={`mt-1 w-full bg-gray-03/20 border rounded-lg px-3 py-2 text-gray-01 ${
                companyNameError ? "border-red-500" : "border-gray-03"
              }`}
            />
            {companyNameError && (
              <span className="mt-1 block text-xs text-red-500">
                {companyNameError}
              </span>
            )}
          </label>

          <label className="text-sm text-gray-02">
            {t("registry.wikidataId")}
            <input
              value={wikidataId}
              onChange={(e) => setWikidataId(e.target.value)}
              className="mt-1 w-full bg-gray-03/20 border border-gray-03 rounded-lg px-3 py-2 text-gray-01"
              placeholder="Q12345"
            />
          </label>

          <label className="text-sm text-gray-02">
            {t("registry.reportYear")}
            <span className="text-red-400 ml-0.5">*</span>
            <input
              value={reportYear}
              onChange={(e) => {
                setReportYear(e.target.value);
                setYearError(null);
              }}
              className={`mt-1 w-full bg-gray-03/20 border rounded-lg px-3 py-2 text-gray-01 ${
                yearError ? "border-red-500" : "border-gray-03"
              }`}
              placeholder="2024"
            />
            {yearError && (
              <span className="mt-1 block text-xs text-red-500">{yearError}</span>
            )}
          </label>

          <label className="text-sm text-gray-02">
            {t("registry.reportUrl")}
            <span className="text-red-400 ml-0.5">*</span>
            <input
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              className={`mt-1 w-full bg-gray-03/20 border rounded-lg px-3 py-2 text-gray-01 ${
                urlError ? "border-red-500" : "border-gray-03"
              }`}
              placeholder="https://…"
            />
            {urlError && (
              <span className="mt-1 block text-xs text-red-500">{urlError}</span>
            )}
          </label>

          <label className="text-sm text-gray-02">
            {t("registry.sourceUrl")}
            <input
              value={sourceUrl}
              onChange={(e) => handleSourceUrlChange(e.target.value)}
              className={`mt-1 w-full bg-gray-03/20 border rounded-lg px-3 py-2 text-gray-01 ${
                sourceUrlError ? "border-red-500" : "border-gray-03"
              }`}
              placeholder="https://…"
            />
            {sourceUrlError && (
              <span className="mt-1 block text-xs text-red-500">
                {sourceUrlError}
              </span>
            )}
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isAdding}
          >
            {t("registry.cancel")}
          </Button>
          <Button
            size="sm"
            onClick={() => void handleAdd()}
            disabled={
              isAdding ||
              !!companyNameError ||
              !!yearError ||
              !!urlError ||
              !!sourceUrlError
            }
          >
            {isAdding ? t("registry.addEntryAdding") : t("registry.addEntry")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegistryAddModal;
