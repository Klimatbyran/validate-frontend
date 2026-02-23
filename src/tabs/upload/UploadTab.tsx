import { useState, useCallback } from "react";
import { FileText, Link2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/tabs";
import { toast } from "sonner";
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
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [processedUrls, setProcessedUrls] = useState<UrlInput[]>([]);
  const [autoApprove, setAutoApprove] = useState(true);

  const handleFileSubmit = useCallback(async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Inga PDF-filer uppladdade");
      return;
    }

    // For now, just show a message that file upload is not yet supported
    toast.info("Filuppladdning stöds inte ännu. Använd länk-läget istället.");

    // TODO: When implementing file upload functionality:
    // 1. Include autoApprove in the API request body (similar to handleUrlSubmit)
    // 2. Add autoApprove back to the dependency array below
  }, [uploadedFiles]);

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
      toast.error("Endast PDF-filer är tillåtna");
      return;
    }

    const newFiles = files.map((file) => ({
      file,
      id: crypto.randomUUID(),
      company: file.name.split("_")[0],
    }));

    setUploadedFiles((prev) => {
      const updatedFiles = [...prev, ...newFiles];
      toast.success(
        `${files.length} fil${files.length === 1 ? "" : "er"} uppladdade`
      );
      return updatedFiles;
    });
  }, []);

  const handleUrlSubmit = useCallback(async () => {
    // Split the input by newlines and filter out empty lines
    // ignorera om filerna slutar på pdf eller ej- vissa kommer inte göra det men ändå vara giltiga pdf:er.
    const urlLines = urlInput
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url);

    if (urlLines.length === 0) {
      toast.error("Inga giltiga PDF-länkar hittades");
      return;
    }

    // Validate URLs and filter out invalid ones
    const { valid: urls, invalid: invalidUrls } = validateUrls(urlLines);

    if (invalidUrls.length > 0) {
      toast.warning(
        `${invalidUrls.length} ogiltig${
          invalidUrls.length === 1 ? "" : "a"
        } URL${invalidUrls.length === 1 ? "" : ":er"} hoppades över`
      );
    }

    if (urls.length === 0) {
      toast.error("Inga giltiga PDF-länkar hittades");
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
        toast.success(
          `${urls.length} länk${urls.length === 1 ? "" : "ar"} tillagda`
        );
        return updatedUrls;
      });

      // Clear the input field
      setUrlInput("");
    } catch (error) {
      console.error("Failed to add jobs:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Kunde inte lägga till jobb: ${errorMessage}`);
    }
  }, [urlInput, autoApprove]);

  const handleContinue = useCallback(() => {
    const totalItems = uploadedFiles.length + processedUrls.length;
    if (totalItems === 0) {
      toast.error("Lägg till filer eller länkar först");
      return;
    }

    onTabChange("processing");
    toast("Påbörjar bearbetning...", {
      description: `${totalItems} ${uploadMode === "file" ? "fil" : "länk"}${
        totalItems === 1 ? "" : "ar"
      } att processa`,
    });
  }, [uploadedFiles.length, processedUrls.length, uploadMode, onTabChange]);

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
            Filer
          </TabsTrigger>
          <TabsTrigger value="url" className="rounded-full">
            <Link2 className="w-4 h-4 mr-2" />
            Länkar
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
