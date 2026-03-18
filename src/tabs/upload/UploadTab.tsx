import { useState, useCallback } from "react";
import { FileText, Link2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/tabs";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { useBatches } from "@/hooks/useBatches";
import { FileUploadZone } from "./components/FileUploadZone";
import { UrlUploadForm } from "./components/UrlUploadForm";
import { UploadList } from "./components/UploadList";
import { UploadRunOptions } from "./components/UploadRunOptions";
import { UploadedFile, UrlInput } from "./types";
import { validateUrls, extractCompanyFromUrl } from "@/lib/utils";
import { DEFAULT_RUN_ONLY, type RunOnlyWorkerId } from "@/lib/run-only-workers";
import { NEW_BATCH_DROPDOWN_VALUE } from "./lib/utils";
import { UploadApiError, createJobsFromUrls, uploadPdfsToParsePdf } from "./lib/upload-api";
import { useTagOptions } from "./hooks/useTagOptions";

export function UploadTab() {
  const { t } = useI18n();
  const [uploadMode, setUploadMode] = useState<"file" | "url">("url");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [processedUrls, setProcessedUrls] = useState<UrlInput[]>([]);
  const [autoApprove, setAutoApprove] = useState(true);
  const [runAllWorkers, setRunAllWorkers] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState<RunOnlyWorkerId[]>(
    DEFAULT_RUN_ONLY,
  );
  const [forceReindex, setForceReindex] = useState(false);
  const [batchDropdownChoice, setBatchDropdownChoice] = useState<string>("");
  const [customBatchName, setCustomBatchName] = useState("");
  const { batches: existingBatches, isLoading: batchesLoading } = useBatches();
  const { tagOptions, loading: tagsLoading, error: tagsError } = useTagOptions();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const effectiveBatchId =
    !batchDropdownChoice ? "" : batchDropdownChoice === NEW_BATCH_DROPDOWN_VALUE ? customBatchName.trim() : batchDropdownChoice;

  const runOnly = !runAllWorkers && selectedWorkers.length > 0 ? selectedWorkers : undefined;
  const batchId = effectiveBatchId || undefined;
  const tags = selectedTags.length > 0 ? selectedTags : undefined;

  const handleFileSubmit = useCallback(async () => {
    if (uploadedFiles.length === 0) {
      toast.error(t("upload.noPdfUploaded"));
      return;
    }

    if (!runAllWorkers && selectedWorkers.length === 0) {
      toast.error(t("upload.selectAtLeastOneWorker"));
      return;
    }

    try {
      await uploadPdfsToParsePdf({
        files: uploadedFiles.map(({ file }) => file),
        autoApprove,
        forceReindex,
        batchId,
        runOnly,
        tags,
      });

      const newUrls: UrlInput[] = uploadedFiles.map(({ file, id, company }) => ({
        url: `uploaded:${file.name}`,
        id,
        company,
      }));
      setProcessedUrls((prev) => [...prev, ...newUrls]);
      setUploadedFiles([]);
      toast.success(t("upload.filesSubmitted", { count: uploadedFiles.length }));
    } catch (error) {
      console.error("Failed to upload files:", error);
      if (error instanceof UploadApiError && error.status === 413) {
        toast.error(t("upload.fileTooLarge"));
        return;
      }
      const errorMessage = error instanceof Error ? error.message : t("upload.unknownError");
      toast.error(t("upload.couldNotAddJobs", { message: errorMessage }));
    }
  }, [uploadedFiles, autoApprove, runAllWorkers, selectedWorkers, forceReindex, effectiveBatchId, selectedTags, t]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === "application/pdf"
    );

    if (files.length === 0) {
      toast.error(t("upload.onlyPdfAllowed"));
      return;
    }

    const newFiles = files.map((file) => ({
      file,
      id: crypto.randomUUID(),
      company: file.name.split("_")[0],
    }));

    setUploadedFiles((prev) => {
      const updatedFiles = [...prev, ...newFiles];
      toast.success(t("upload.filesUploaded", { count: files.length }));
      return updatedFiles;
    });
  }, [t]);

  const handleUrlSubmit = useCallback(async () => {
    // Split the input by newlines and filter out empty lines
    // ignorera om filerna slutar på pdf eller ej- vissa kommer inte göra det men ändå vara giltiga pdf:er.
    const urlLines = urlInput
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url);

    if (urlLines.length === 0) {
      toast.error(t("upload.noValidPdfLinks"));
      return;
    }

    // Validate URLs and filter out invalid ones
    const { valid: urls, invalid: invalidUrls } = validateUrls(urlLines);

    if (invalidUrls.length > 0) {
      toast.warning(t("upload.invalidUrlsSkipped", { count: invalidUrls.length }));
    }

    if (urls.length === 0) {
      toast.error(t("upload.noValidPdfLinks"));
      return;
    }

    if (!runAllWorkers && selectedWorkers.length === 0) {
      toast.error(t("upload.selectAtLeastOneWorker"));
      return;
    }

    // Send batch job creation request to the custom API
    // When "Alla" is chosen, omit runOnly so pipeline-api runs all steps.
    try {
      const result = await createJobsFromUrls({
        urls,
        autoApprove,
        forceReindex,
        batchId,
        runOnly,
        tags,
      });
      console.log("Jobs created successfully:", result);

      const newUrls = urls.map((url) => ({
        url,
        id: crypto.randomUUID(),
        company: extractCompanyFromUrl(url),
      }));

      setProcessedUrls((prev) => {
        const updatedUrls = [...prev, ...newUrls];
        toast.success(t("upload.linksAdded", { count: urls.length }));
        return updatedUrls;
      });

      // Clear the input field
      setUrlInput("");
    } catch (error) {
      console.error("Failed to add jobs:", error);
      if (error instanceof UploadApiError && error.status === 413) {
        toast.error(t("upload.fileTooLarge"));
        return;
      }
      const errorMessage = error instanceof Error ? error.message : t("upload.unknownError");
      toast.error(t("upload.couldNotAddJobs", { message: errorMessage }));
    }
  }, [urlInput, autoApprove, runAllWorkers, selectedWorkers, forceReindex, effectiveBatchId, selectedTags, t]);

  const handleWorkerToggle = useCallback((workerId: RunOnlyWorkerId, checked: boolean) => {
    setSelectedWorkers((prev) =>
      checked ? [...prev, workerId] : prev.filter((id) => id !== workerId),
    );
  }, []);

  return (
    <div className="space-y-6">
      {/* Upload Mode Tabs */}
      <Tabs
        value={uploadMode}
        onValueChange={(value) => setUploadMode(value as "file" | "url")}
        className="w-full"
      >
        <TabsList className="inline-flex bg-gray-04/50 p-1 rounded-full">
          <TabsTrigger value="url" className="rounded-full">
            <Link2 className="w-4 h-4 mr-2" />
            {t("upload.links")}
          </TabsTrigger>
          <TabsTrigger value="file" className="rounded-full">
            <FileText className="w-4 h-4 mr-2" />
            {t("upload.files")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url" >
          <UploadRunOptions
            batch={{
              existingBatches,
              batchesLoading,
              batchDropdownChoice,
              onBatchDropdownChoiceChange: setBatchDropdownChoice,
              customBatchName,
              onCustomBatchNameChange: setCustomBatchName,
            }}
            tags={{
              tagOptions,
              tagsLoading,
              tagsError,
              selectedTags,
              onSelectedTagsChange: setSelectedTags,
            }}
            workers={{
              runAllWorkers,
              onRunAllWorkersChange: setRunAllWorkers,
              selectedWorkers,
              onSelectedWorkersChange: handleWorkerToggle,
              forceReindex,
              onForceReindexChange: setForceReindex,
            }}
          />
          <UrlUploadForm
            urlInput={urlInput}
            onUrlInputChange={setUrlInput}
            autoApprove={autoApprove}
            onAutoApproveChange={setAutoApprove}
            onSubmit={handleUrlSubmit}
          />
        </TabsContent>

        <TabsContent value="file">
          <UploadRunOptions
            batch={{
              existingBatches,
              batchesLoading,
              batchDropdownChoice,
              onBatchDropdownChoiceChange: setBatchDropdownChoice,
              customBatchName,
              onCustomBatchNameChange: setCustomBatchName,
            }}
            tags={{
              tagOptions,
              tagsLoading,
              tagsError,
              selectedTags,
              onSelectedTagsChange: setSelectedTags,
            }}
            workers={{
              runAllWorkers,
              onRunAllWorkersChange: setRunAllWorkers,
              selectedWorkers,
              onSelectedWorkersChange: handleWorkerToggle,
              forceReindex,
              onForceReindexChange: setForceReindex,
            }}
          />
          <FileUploadZone
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            uploadedFiles={uploadedFiles}
            onFileSubmit={handleFileSubmit}
          />
        </TabsContent>
      </Tabs>

      {/* File/URL List */}
      <UploadList
        uploadMode={uploadMode}
        uploadedFiles={uploadedFiles}
        processedUrls={processedUrls}
      />
    </div>
  );
}
