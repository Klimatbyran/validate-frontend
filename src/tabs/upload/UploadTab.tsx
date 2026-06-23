import { useState, useCallback, useEffect, useRef } from "react";
import { FileText, Link2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/tabs";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { useBatches } from "@/hooks/useBatches";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { FileUploadZone } from "./components/FileUploadZone";
import { UrlUploadForm } from "./components/UrlUploadForm";
import { UploadList } from "./components/UploadList";
import { UploadRunOptions } from "./components/UploadRunOptions";
import { UploadedFile, UrlInput } from "./types";
import { collectPdfFilesFromDataTransfer } from "@/lib/drag-drop-pdf-files";
import { validateUrls, extractCompanyFromUrl } from "@/lib/utils";
import { DEFAULT_RUN_ONLY, type RunOnlyWorkerId } from "@/lib/run-only-workers";
import { NEW_BATCH_DROPDOWN_VALUE } from "@/lib/garbo-batch-types";
import { resolvePipelineBatchId } from "@/lib/resolve-pipeline-batch-id";
import {
  UploadApiError,
  createJobsFromUrls,
  isUploadPdfsEnvelope,
  uploadPdfsToParsePdf,
} from "./lib/upload-api";
import { useTagOptions } from "./hooks/useTagOptions";

export function UploadTab() {
  const { t } = useI18n();
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const hasTriggeredLoginRef = useRef(false);

  const [uploadMode, setUploadMode] = useState<"file" | "url">("url");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [processedUrls, setProcessedUrls] = useState<UrlInput[]>([]);
  const [autoApprove, setAutoApprove] = useState(true);
  const [runAllWorkers, setRunAllWorkers] = useState(false);
  const [selectedWorkers, setSelectedWorkers] =
    useState<RunOnlyWorkerId[]>(DEFAULT_RUN_ONLY);
  const [forceReindex, setForceReindex] = useState(false);
  const [batchDropdownChoice, setBatchDropdownChoice] = useState<string>("");
  const [customBatchName, setCustomBatchName] = useState("");
  const {
    batches: existingBatches,
    isLoading: batchesLoading,
    refetch: refetchBatches,
  } = useBatches();
  const {
    tagOptions,
    loading: tagsLoading,
    error: tagsError,
  } = useTagOptions();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Upload is the main entrypoint and performs write operations; require auth here.
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) return;
    if (hasTriggeredLoginRef.current) return;
    hasTriggeredLoginRef.current = true;
    login();
  }, [authLoading, isAuthenticated, login]);

  const runOnly =
    !runAllWorkers && selectedWorkers.length > 0 ? selectedWorkers : undefined;
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

    if (
      batchDropdownChoice === NEW_BATCH_DROPDOWN_VALUE &&
      !customBatchName.trim()
    ) {
      toast.error(t("upload.batchNameRequired"));
      return;
    }

    let pipelineBatchId: string | undefined;
    try {
      pipelineBatchId = await resolvePipelineBatchId({
        batchDropdownChoice,
        customBatchName,
      });
    } catch (e) {
      toast.error(
        t("upload.couldNotAddJobs", {
          message: e instanceof Error ? e.message : t("upload.unknownError"),
        }),
      );
      return;
    }

    try {
      const result = await uploadPdfsToParsePdf({
        files: uploadedFiles.map(({ file }) => file),
        autoApprove,
        forceReindex,
        batchId: pipelineBatchId,
        runOnly,
        tags,
      });

      const reusedCount = isUploadPdfsEnvelope(result)
        ? result.uploads.filter((u) => u.reusedExisting).length
        : 0;

      const newUrls: UrlInput[] = uploadedFiles.map(
        ({ file, id, company }) => ({
          url: `uploaded:${file.name}`,
          id,
          company,
        }),
      );
      setProcessedUrls((prev) => [...prev, ...newUrls]);
      setUploadedFiles([]);
      toast.success(
        t("upload.filesSubmitted", { count: uploadedFiles.length }),
      );
      if (reusedCount > 0) {
        toast.info(t("upload.storageDeduplicated", { count: reusedCount }));
      }
      if (batchDropdownChoice === NEW_BATCH_DROPDOWN_VALUE) {
        refetchBatches();
      }
    } catch (error) {
      console.error("Failed to upload files:", error);
      if (error instanceof UploadApiError && error.status === 413) {
        toast.error(t("upload.fileTooLarge"));
        return;
      }
      const errorMessage =
        error instanceof Error ? error.message : t("upload.unknownError");
      toast.error(t("upload.couldNotAddJobs", { message: errorMessage }));
    }
  }, [
    uploadedFiles,
    autoApprove,
    runAllWorkers,
    selectedWorkers,
    forceReindex,
    batchDropdownChoice,
    customBatchName,
    runOnly,
    tags,
    t,
    refetchBatches,
  ]);

  const addUploadedPdfFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) {
        toast.error(t("upload.onlyPdfAllowed"));
        return;
      }

      const newFiles = files.map((file) => ({
        file,
        id: crypto.randomUUID(),
        company: file.name.split("_")[0],
      }));

      setUploadedFiles((prev) => [...prev, ...newFiles]);
      toast.success(t("upload.filesUploaded", { count: files.length }));
    },
    [t],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = await collectPdfFilesFromDataTransfer(e.dataTransfer);
      addUploadedPdfFiles(files);
    },
    [addUploadedPdfFiles],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter(
        (file) =>
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf"),
      );
      e.target.value = "";
      addUploadedPdfFiles(files);
    },
    [addUploadedPdfFiles],
  );

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
      toast.warning(
        t("upload.invalidUrlsSkipped", { count: invalidUrls.length }),
      );
    }

    if (urls.length === 0) {
      toast.error(t("upload.noValidPdfLinks"));
      return;
    }

    if (!runAllWorkers && selectedWorkers.length === 0) {
      toast.error(t("upload.selectAtLeastOneWorker"));
      return;
    }

    if (
      batchDropdownChoice === NEW_BATCH_DROPDOWN_VALUE &&
      !customBatchName.trim()
    ) {
      toast.error(t("upload.batchNameRequired"));
      return;
    }

    let pipelineBatchId: string | undefined;
    try {
      pipelineBatchId = await resolvePipelineBatchId({
        batchDropdownChoice,
        customBatchName,
      });
    } catch (e) {
      toast.error(
        t("upload.couldNotAddJobs", {
          message: e instanceof Error ? e.message : t("upload.unknownError"),
        }),
      );
      return;
    }

    // Send batch job creation request to the custom API
    // When "Alla" is chosen, omit runOnly so pipeline-api runs all steps.
    try {
      const result = await createJobsFromUrls({
        urls,
        autoApprove,
        forceReindex,
        batchId: pipelineBatchId,
        runOnly,
        tags,
      });
      console.log("Jobs created successfully:", result);

      const envelope =
        !Array.isArray(result) && result && typeof result === "object"
          ? result
          : null;
      const cached =
        envelope && Array.isArray(envelope.cached)
          ? envelope.cached
          : undefined;
      const cacheErrors =
        envelope && Array.isArray(envelope.errors)
          ? envelope.errors
          : undefined;
      const failedUrls = new Set(
        (cacheErrors ?? [])
          .map((e) => (e && typeof e.url === "string" ? e.url : ""))
          .filter(Boolean),
      );
      const succeededUrls = urls.filter((u) => !failedUrls.has(u));

      if (Array.isArray(cached) && cached.length > 0) {
        const reused = cached.filter(
          (c) => (c as { reusedExisting?: boolean })?.reusedExisting,
        ).length;
        toast.info(
          t("upload.pdfCachedSummary", { total: cached.length, reused }),
        );
      }

      if (cacheErrors && cacheErrors.length > 0 && succeededUrls.length > 0) {
        toast.warning(
          t("upload.pdfCachePartialFailure", {
            failed: cacheErrors.length,
            succeeded: succeededUrls.length,
            total: urls.length,
          }),
        );
      }

      const newUrls = succeededUrls.map((url) => ({
        url,
        id: crypto.randomUUID(),
        company: extractCompanyFromUrl(url),
      }));

      setProcessedUrls((prev) => {
        const updatedUrls = [...prev, ...newUrls];
        toast.success(t("upload.linksAdded", { count: succeededUrls.length }));
        return updatedUrls;
      });

      // Clear the input field
      setUrlInput("");
      if (batchDropdownChoice === NEW_BATCH_DROPDOWN_VALUE) {
        refetchBatches();
      }
    } catch (error) {
      console.error("Failed to add jobs:", error);
      if (error instanceof UploadApiError && error.status === 413) {
        toast.error(t("upload.fileTooLarge"));
        return;
      }
      const errorMessage =
        error instanceof Error ? error.message : t("upload.unknownError");
      toast.error(t("upload.couldNotAddJobs", { message: errorMessage }));
    }
  }, [
    urlInput,
    autoApprove,
    runAllWorkers,
    selectedWorkers,
    forceReindex,
    batchDropdownChoice,
    customBatchName,
    runOnly,
    tags,
    t,
    refetchBatches,
  ]);

  const handleWorkerToggle = useCallback(
    (workerId: RunOnlyWorkerId, checked: boolean) => {
      setSelectedWorkers((prev) =>
        checked ? [...prev, workerId] : prev.filter((id) => id !== workerId),
      );
    },
    [],
  );

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex justify-center py-12 bg-gray-04/80 backdrop-blur-sm rounded-lg">
        <LoadingSpinner label={t("auth.loginRequired")} />
      </div>
    );
  }

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

        <TabsContent value="url">
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
            onInputChange={handleFileInputChange}
            uploadedFiles={uploadedFiles}
            autoApprove={autoApprove}
            onAutoApproveChange={setAutoApprove}
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
