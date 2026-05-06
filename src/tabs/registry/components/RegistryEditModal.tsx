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

function isValidOptionalHttpUrl(raw: string): boolean {
  const t = raw.trim();
  if (!t) return true;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
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
  const [sourceUrl, setSourceUrl] = useState(entry.sourceUrl ?? "");
  const [s3Url, setS3Url] = useState(entry.s3Url ?? "");
  const [s3Key, setS3Key] = useState(entry.s3Key ?? "");
  const [s3Bucket, setS3Bucket] = useState(entry.s3Bucket ?? "");
  const [sha256, setSha256] = useState(entry.sha256 ?? "");
  const [yearError, setYearError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [sourceUrlError, setSourceUrlError] = useState<string | null>(null);
  const [s3UrlError, setS3UrlError] = useState<string | null>(null);
  const [sha256Error, setSha256Error] = useState<string | null>(null);

  useEffect(() => {
    setCompanyName(entry.companyName ?? "");
    setWikidataId(entry.wikidataId ?? "");
    setReportYear(entry.reportYear ?? "");
    setUrl(entry.url);
    setSourceUrl(entry.sourceUrl ?? "");
    setS3Url(entry.s3Url ?? "");
    setS3Key(entry.s3Key ?? "");
    setS3Bucket(entry.s3Bucket ?? "");
    setSha256(entry.sha256 ?? "");
    setYearError(null);
    setUrlError(null);
    setSourceUrlError(null);
    setS3UrlError(null);
    setSha256Error(null);
  }, [
    entry.companyName,
    entry.reportYear,
    entry.url,
    entry.wikidataId,
    entry.sourceUrl,
    entry.s3Url,
    entry.s3Key,
    entry.s3Bucket,
    entry.sha256,
  ]);

  const handleSaveEdit = async () => {
    if (!entry.id) return;

    const trimmedCompanyName = companyName.trim();
    const trimmedWikidataId = wikidataId.trim();
    const trimmedReportYear = reportYear.trim();
    const trimmedUrl = url.trim();
    const trimmedSource = sourceUrl.trim();
    const trimmedS3 = s3Url.trim();
    const trimmedKey = s3Key.trim();
    const trimmedBucket = s3Bucket.trim();
    const trimmedSha = sha256.trim().toLowerCase();

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

    if (!trimmedUrl) {
      setUrlError(t("registry.invalidUrl"));
      hasError = true;
    } else {
      try {
        const u = new URL(trimmedUrl);
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          setUrlError(t("registry.invalidUrl"));
          hasError = true;
        }
      } catch {
        setUrlError(t("registry.invalidUrl"));
        hasError = true;
      }
    }

    if (!isValidOptionalHttpUrl(trimmedSource)) {
      setSourceUrlError(t("registry.invalidUrl"));
      hasError = true;
    } else {
      setSourceUrlError(null);
    }

    if (!isValidOptionalHttpUrl(trimmedS3)) {
      setS3UrlError(t("registry.invalidUrl"));
      hasError = true;
    } else {
      setS3UrlError(null);
    }

    if (trimmedSha && !/^[a-f0-9]{64}$/.test(trimmedSha)) {
      setSha256Error(t("registry.invalidSha256"));
      hasError = true;
    } else {
      setSha256Error(null);
    }

    if (hasError) return;

    const prevSource = (entry.sourceUrl ?? "").trim();
    const prevS3 = (entry.s3Url ?? "").trim();
    const prevKey = (entry.s3Key ?? "").trim();
    const prevBucket = (entry.s3Bucket ?? "").trim();
    const prevSha = (entry.sha256 ?? "").trim().toLowerCase();

    const updates: RegistryEntryUpdate = {
      id: entry.id,
    };

    if (trimmedCompanyName !== (entry.companyName ?? "").trim()) {
      updates.companyName = trimmedCompanyName;
    }
    if (trimmedWikidataId !== (entry.wikidataId ?? "").trim()) {
      updates.wikidataId = trimmedWikidataId;
    }
    if (trimmedReportYear !== (entry.reportYear ?? "").trim()) {
      updates.reportYear = trimmedReportYear || undefined;
    }
    if (trimmedUrl !== entry.url.trim()) {
      updates.url = trimmedUrl;
    }

    if (trimmedSource !== prevSource) {
      updates.sourceUrl = trimmedSource ? trimmedSource : null;
    }
    if (trimmedS3 !== prevS3) {
      updates.s3Url = trimmedS3 ? trimmedS3 : null;
    }
    if (trimmedKey !== prevKey) {
      updates.s3Key = trimmedKey ? trimmedKey : null;
    }
    if (trimmedBucket !== prevBucket) {
      updates.s3Bucket = trimmedBucket ? trimmedBucket : null;
    }
    if (trimmedSha !== prevSha) {
      updates.sha256 = trimmedSha ? trimmedSha : null;
    }

    if (Object.keys(updates).length === 1) {
      onOpenChange(false);
      return;
    }

    await onEdit(updates);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
          <label className="text-sm text-gray-02">
            {t("registry.sourceUrl")}
            <input
              value={sourceUrl}
              onChange={(event) => {
                setSourceUrl(event.target.value);
                setSourceUrlError(null);
              }}
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
          <label className="text-sm text-gray-02">
            {t("registry.s3Url")}
            <input
              value={s3Url}
              onChange={(event) => {
                setS3Url(event.target.value);
                setS3UrlError(null);
              }}
              className={`mt-1 w-full bg-gray-03/20 border rounded-lg px-3 py-2 text-gray-01 ${
                s3UrlError ? "border-red-500" : "border-gray-03"
              }`}
              placeholder="https://…"
            />
            {s3UrlError && (
              <span className="mt-1 block text-xs text-red-500">
                {s3UrlError}
              </span>
            )}
          </label>
          <label className="text-sm text-gray-02">
            {t("registry.s3Bucket")}
            <input
              value={s3Bucket}
              onChange={(event) => setS3Bucket(event.target.value)}
              className="mt-1 w-full bg-gray-03/20 border border-gray-03 rounded-lg px-3 py-2 text-gray-01"
            />
            <span className="mt-1 block text-xs text-gray-02/90">
              {t("registry.s3BucketHint")}
            </span>
          </label>
          <label className="text-sm text-gray-02">
            {t("registry.s3Key")}
            <input
              value={s3Key}
              onChange={(event) => setS3Key(event.target.value)}
              className="mt-1 w-full bg-gray-03/20 border border-gray-03 rounded-lg px-3 py-2 text-gray-01"
              spellCheck={false}
            />
            <span className="mt-1 block text-xs text-gray-02/90">
              {t("registry.s3KeyHint")}
            </span>
          </label>
          <label className="text-sm text-gray-02">
            {t("registry.sha256")}
            <input
              value={sha256}
              onChange={(event) => {
                setSha256(event.target.value);
                setSha256Error(null);
              }}
              className={`mt-1 w-full font-mono text-sm bg-gray-03/20 border rounded-lg px-3 py-2 text-gray-01 ${
                sha256Error ? "border-red-500" : "border-gray-03"
              }`}
              placeholder="64 hex characters"
              spellCheck={false}
            />
            {sha256Error && (
              <span className="mt-1 block text-xs text-red-500">
                {sha256Error}
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
            disabled={
              isEditing ||
              !!yearError ||
              !!urlError ||
              !!sourceUrlError ||
              !!s3UrlError ||
              !!sha256Error
            }
          >
            {t("registry.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegistryEditModal;
