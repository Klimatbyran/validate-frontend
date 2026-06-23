import { useState } from "react";
import { FileText, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { FileDropZone } from "@/components/FileDropZone";
import { usePdfFileDrop } from "@/hooks/usePdfFileDrop";
import { useRegistryBatches } from "@/tabs/registry/hooks/useRegistryBatches";
import { NEW_BATCH_DROPDOWN_VALUE } from "@/lib/garbo-batch-types";
import { validateUrls } from "@/lib/utils";
import { resolveRegistryBatchId } from "../lib/resolve-registry-batch-id";
import { Button } from "@/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import type {
  RegistryBulkFileAddInput,
  RegistryNewEntry,
} from "../lib/registry-types";
import { isValidHttpUrl, isValidOptionalHttpUrl } from "../lib/registry-utils";
import { RegistryDroppedFilesList } from "./RegistryDroppedFilesList";
import { RegistryAddBatchOptions } from "./RegistryAddBatchOptions";

type AddMode = "single" | "multi";
type MultiInputMode = "files" | "urls";

interface RegistryAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (entry: RegistryNewEntry) => Promise<void>;
  onAddMany: (entries: RegistryNewEntry[]) => Promise<void>;
  onAddFiles: (input: RegistryBulkFileAddInput) => Promise<void>;
  isAdding: boolean;
}

const inputClass = (hasError: boolean) =>
  `mt-1 w-full bg-gray-03/20 border rounded-lg px-3 py-2 text-gray-01 ${
    hasError ? "border-red-500" : "border-gray-03"
  }`;

const RegistryAddModal = ({
  open,
  onOpenChange,
  onAdd,
  onAddMany,
  onAddFiles,
  isAdding,
}: RegistryAddModalProps) => {
  const { t } = useI18n();
  const {
    isDragging,
    droppedFiles,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleInputChange,
    removeFile,
    clearFiles,
  } = usePdfFileDrop();

  const [addMode, setAddMode] = useState<AddMode>("single");
  const [multiInputMode, setMultiInputMode] = useState<MultiInputMode>("files");
  const [urlInput, setUrlInput] = useState("");

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

  const [batchDropdownChoice, setBatchDropdownChoice] = useState("");
  const [customBatchName, setCustomBatchName] = useState("");
  const {
    batches: existingBatches,
    isLoading: batchesLoading,
    refetch: refetchBatches,
  } = useRegistryBatches();

  const multiUrlLineCount = urlInput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;

  const description =
    addMode === "single"
      ? t("registry.addEntryDescriptionSingle")
      : multiInputMode === "urls"
        ? t("registry.addEntryDescriptionMultiUrls")
        : t("registry.addEntryDescriptionMultiFiles");

  const resetForm = () => {
    setAddMode("single");
    setMultiInputMode("files");
    setUrlInput("");
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
    setBatchDropdownChoice("");
    setCustomBatchName("");
    clearFiles();
  };

  const resolveBatchForSave = async (): Promise<string | undefined> => {
    if (
      batchDropdownChoice === NEW_BATCH_DROPDOWN_VALUE &&
      !customBatchName.trim()
    ) {
      toast.error(t("upload.batchNameRequired"));
      return undefined;
    }

    if (!batchDropdownChoice) return undefined;

    try {
      const batchDbId = await resolveRegistryBatchId({
        batchDropdownChoice,
        customBatchName,
      });
      if (batchDropdownChoice === NEW_BATCH_DROPDOWN_VALUE) {
        refetchBatches();
      }
      return batchDbId;
    } catch (error) {
      toast.error(
        t("upload.couldNotAddJobs", {
          message:
            error instanceof Error ? error.message : t("upload.unknownError"),
        }),
      );
      return undefined;
    }
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

  const validateSingleFields = () => {
    const trimmedName = companyName.trim();
    const trimmedYear = reportYear.trim();
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

    if (!isValidOptionalHttpUrl(trimmedSource)) {
      setSourceUrlError(t("registry.invalidUrl"));
      hasError = true;
    } else {
      setSourceUrlError(null);
    }

    return { hasError, trimmedName, trimmedYear, trimmedSource };
  };

  const handleDropWithToast = async (e: React.DragEvent) => {
    const count = await handleDrop(e);
    if (count === 0) {
      toast.error(t("upload.onlyPdfAllowed"));
      return;
    }
    toast.success(t("upload.filesUploaded", { count }));
  };

  const handleInputChangeWithToast = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const count = handleInputChange(e);
    if (count === 0) {
      toast.error(t("upload.onlyPdfAllowed"));
      return;
    }
    toast.success(t("upload.filesUploaded", { count }));
  };

  const handleAdd = async () => {
    const batchDbId = await resolveBatchForSave();
    if (batchDbId === undefined && batchDropdownChoice) return;

    if (addMode === "multi" && multiInputMode === "files") {
      if (droppedFiles.length === 0) return;
      await onAddFiles({
        files: droppedFiles.map((f) => f.file),
        ...(batchDbId ? { batchDbId } : {}),
      });
      resetForm();
      onOpenChange(false);
      return;
    }

    if (addMode === "multi" && multiInputMode === "urls") {
      const urlLines = urlInput
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (urlLines.length === 0) {
        toast.error(t("upload.noValidPdfLinks"));
        return;
      }

      const { valid: urls, invalid: invalidUrls } = validateUrls(urlLines);

      if (invalidUrls.length > 0) {
        toast.warning(
          t("upload.invalidUrlsSkipped", { count: invalidUrls.length }),
        );
      }

      if (urls.length === 0) {
        toast.error(t("upload.noValidPdfLinks"));
        return;
      }

      await onAddMany(
        urls.map((entryUrl) => ({
          url: entryUrl,
          companyName: "Unknown",
          ...(batchDbId ? { batchDbId } : {}),
        })),
      );
      resetForm();
      onOpenChange(false);
      return;
    }

    const trimmedWikidata = wikidataId.trim();
    const { hasError, trimmedName, trimmedYear, trimmedSource } =
      validateSingleFields();
    if (hasError) return;

    const trimmedUrl = url.trim();
    if (!isValidHttpUrl(trimmedUrl)) {
      setUrlError(t("registry.invalidUrl"));
      return;
    }
    setUrlError(null);

    await onAdd({
      companyName: trimmedName,
      wikidataId: trimmedWikidata || undefined,
      reportYear: trimmedYear,
      url: trimmedUrl,
      sourceUrl: trimmedSource || undefined,
      ...(batchDbId ? { batchDbId } : {}),
    });

    resetForm();
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (isAdding) return;
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const submitCount =
    addMode === "single"
      ? 1
      : multiInputMode === "files"
        ? droppedFiles.length
        : multiUrlLineCount;

  const submitDisabled =
    isAdding ||
    (addMode === "single"
      ? !!companyNameError || !!yearError || !!urlError || !!sourceUrlError
      : multiInputMode === "files"
        ? droppedFiles.length === 0
        : multiUrlLineCount === 0);

  const submitLabel =
    addMode === "single"
      ? isAdding
        ? t("registry.addEntryAdding")
        : t("registry.addEntry")
      : isAdding
        ? t("registry.addEntryAdding")
        : t("registry.addEntriesCount", { count: submitCount });

  const batchOptions = (
    <RegistryAddBatchOptions
      batch={{
        existingBatches,
        batchesLoading,
        batchDropdownChoice,
        onBatchDropdownChoiceChange: setBatchDropdownChoice,
        customBatchName,
        onCustomBatchNameChange: setCustomBatchName,
      }}
    />
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("registry.addEntryTitle")}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Tabs
          value={addMode}
          onValueChange={(value) => setAddMode(value as AddMode)}
          className="w-full"
        >
          <TabsList className="inline-flex w-full sm:w-auto">
            <TabsTrigger value="single" className="flex-1 sm:flex-none">
              {t("registry.addModeSingle")}
            </TabsTrigger>
            <TabsTrigger value="multi" className="flex-1 sm:flex-none">
              {t("registry.addModeMulti")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-3">
            <div className="grid gap-3">
              {batchOptions}

              <label className="text-sm text-gray-02">
                {t("registry.companyName")}
                <span className="text-red-400 ml-0.5">*</span>
                <input
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    setCompanyNameError(null);
                  }}
                  className={inputClass(!!companyNameError)}
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
                  className={inputClass(false)}
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
                  className={inputClass(!!yearError)}
                  placeholder="2024"
                />
                {yearError && (
                  <span className="mt-1 block text-xs text-red-500">
                    {yearError}
                  </span>
                )}
              </label>

              <label className="text-sm text-gray-02">
                {t("registry.reportUrl")}
                <span className="text-red-400 ml-0.5">*</span>
                <input
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className={inputClass(!!urlError)}
                  placeholder="https://…"
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
                  onChange={(e) => handleSourceUrlChange(e.target.value)}
                  className={inputClass(!!sourceUrlError)}
                  placeholder="https://…"
                />
                {sourceUrlError && (
                  <span className="mt-1 block text-xs text-red-500">
                    {sourceUrlError}
                  </span>
                )}
              </label>
            </div>
          </TabsContent>

          <TabsContent value="multi" className="mt-3">
            <div className="grid gap-3">
              {batchOptions}

              <Tabs
                value={multiInputMode}
                onValueChange={(value) =>
                  setMultiInputMode(value as MultiInputMode)
                }
                className="w-full"
              >
                <TabsList className="inline-flex w-full sm:w-auto h-10 p-0.5">
                  <TabsTrigger
                    value="files"
                    className="flex-1 sm:flex-none rounded-full px-4 py-1.5 text-sm"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {t("upload.files")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="urls"
                    className="flex-1 sm:flex-none rounded-full px-4 py-1.5 text-sm"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    {t("upload.links")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="files" className="mt-3 space-y-3">
                  <FileDropZone
                    isDragging={isDragging}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => void handleDropWithToast(e)}
                    onInputChange={handleInputChangeWithToast}
                    title={t("registry.dragDropPdf")}
                    subtitle={t("registry.dragDropPdfHint")}
                    compact
                  />
                  <RegistryDroppedFilesList
                    files={droppedFiles}
                    onRemove={removeFile}
                  />
                </TabsContent>

                <TabsContent value="urls" className="mt-3">
                  <label className="block text-sm font-medium text-gray-01 mb-2">
                    {t("upload.pastePdfLinks")}
                  </label>
                  <textarea
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={t("upload.linksPlaceholder")}
                    className="w-full h-32 bg-gray-03/20 border border-gray-03 rounded-lg p-3 text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03"
                  />
                  {multiUrlLineCount > 0 && (
                    <p className="mt-2 text-xs text-gray-02">
                      {t("registry.multiUrlLineCount", {
                        count: multiUrlLineCount,
                      })}
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>
        </Tabs>

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
            disabled={submitDisabled}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegistryAddModal;
