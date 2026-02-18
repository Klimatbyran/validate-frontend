import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UrlUploadFormProps {
  urlInput: string;
  onUrlInputChange: (value: string) => void;
  autoApprove: boolean;
  onAutoApproveChange: (value: boolean) => void;
  onSubmit: () => void;
}

export function UrlUploadForm({
  urlInput,
  onUrlInputChange,
  autoApprove,
  onAutoApproveChange,
  onSubmit,
}: UrlUploadFormProps) {
  return (
    <div className="space-y-4">
      <div className="bg-gray-04/50 backdrop-blur-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-gray-01">
            Klistra in PDF-länkar (en per rad)
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-02">Auto-godkänn</span>
            <button
              onClick={() => onAutoApproveChange(!autoApprove)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full",
                "transition-colors focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring",
                "focus-visible:ring-offset-2",
                autoApprove ? "bg-green-03" : "bg-gray-03",
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full",
                  "bg-white transition-transform",
                  autoApprove ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </div>
        </div>
        <textarea
          value={urlInput}
          onChange={(e) => onUrlInputChange(e.target.value)}
          placeholder="https://example.com/rapport.pdf&#10;https://example.com/rapport2.pdf"
          className="w-full h-32 bg-gray-03/20 border border-gray-03 rounded-lg p-3 text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03"
        />
        <div className="mt-4 flex justify-end">
          <Button onClick={onSubmit} disabled={!urlInput.trim()}>
            <Link2 className="w-4 h-4 mr-2" />
            Lägg till länkar
          </Button>
        </div>
      </div>
    </div>
  );
}
