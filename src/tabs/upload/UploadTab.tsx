import { useState, useCallback } from "react";
import { FileText, Link2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/tabs";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { authenticatedFetch } from "@/lib/api-helpers";
import { FileUploadZone } from "./components/FileUploadZone";
import { UrlUploadForm } from "./components/UrlUploadForm";
import { UploadList } from "./components/UploadList";
import { UploadedFile, UrlInput } from "./types";
import {
  validateUrls,
  extractCompanyFromUrl,
  PARSE_PDF_API_ENDPOINT,
  DEFAULT_RUN_ONLY,
} from "./lib/utils";

interface UploadTabProps {
  onTabChange: (tab: string) => void;
}

export function UploadTab({ onTabChange }: UploadTabProps) {
  const { t } = useI18n();
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [processedUrls, setProcessedUrls] = useState<UrlInput[]>([]);
  const [autoApprove, setAutoApprove] = useState(true);

  const handleFileSubmit = useCallback(async () => {
    if (uploadedFiles.length === 0) {
      toast.error(t("upload.noPdfUploaded"));
      return;
    }

    // For now, just show a message that file upload is not yet supported
    toast.info(t("upload.fileUploadNotSupported"));

    // TODO: When implementing file upload functionality:
    // 1. Include autoApprove in the API request body (similar to handleUrlSubmit)
    // 2. Add autoApprove back to the dependency array below
  }, [uploadedFiles, t]);

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

    // Send batch job creation request to the custom API
    try {
      const response = await authenticatedFetch(PARSE_PDF_API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          autoApprove: Boolean(autoApprove),
          forceReindex: true,
          replaceAllEmissions: true,
          runOnly: DEFAULT_RUN_ONLY,
          urls: urls,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Job submission error:", errorText);
        throw new Error(`Failed to add jobs: ${errorText}`);
      }

      const result = await response.json();
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
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(t("upload.couldNotAddJobs", { message: errorMessage }));
    }
  }, [urlInput, autoApprove]);

  const handleContinue = useCallback(() => {
    const totalItems = uploadedFiles.length + processedUrls.length;
    if (totalItems === 0) {
      toast.error(t("upload.addFilesOrLinksFirst"));
      return;
    }

    onTabChange("processing");
    toast(t("upload.startingProcessing"), {
      description: t("upload.itemsToProcess", {
        count: totalItems,
        type: uploadMode === "file" ? t("upload.file") : t("upload.link"),
      }),
    });
  }, [uploadedFiles.length, processedUrls.length, uploadMode, onTabChange, t]);

  return (
    <div className="space-y-6">
      {/* Upload Mode Tabs */}
      <Tabs
        value={uploadMode}
        onValueChange={(value) => setUploadMode(value as "file" | "url")}
        className="w-full"
      >
        <TabsList className="inline-flex bg-gray-04/50 p-1 rounded-full">
          <TabsTrigger value="file" className="rounded-full">
            <FileText className="w-4 h-4 mr-2" />
            {t("upload.files")}
          </TabsTrigger>
          <TabsTrigger value="url" className="rounded-full">
            <Link2 className="w-4 h-4 mr-2" />
            {t("upload.links")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file">
          <FileUploadZone
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            uploadedFiles={uploadedFiles}
            onFileSubmit={handleFileSubmit}
          />
        </TabsContent>

        <TabsContent value="url">
          <UrlUploadForm
            urlInput={urlInput}
            onUrlInputChange={setUrlInput}
            autoApprove={autoApprove}
            onAutoApproveChange={setAutoApprove}
            onSubmit={handleUrlSubmit}
          />
        </TabsContent>
      </Tabs>

      {/* File/URL List */}
      <UploadList
        uploadMode={uploadMode}
        uploadedFiles={uploadedFiles}
        processedUrls={processedUrls}
        onContinue={handleContinue}
      />
    </div>
  );
}
