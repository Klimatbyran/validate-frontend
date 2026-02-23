import { useState } from "react";
import { Button } from "@/ui/button";
import { Callout } from "@/ui/callout";
import { useI18n } from "@/contexts/I18nContext";
import { Check, ExternalLink, AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface WikidataData {
  node: string;
  url: string;
  label: string;
  description?: string;
}

interface WikidataApprovalData {
  status: "approved" | "pending_approval";
  wikidata: WikidataData;
  message?: string;
  metadata?: {
    source?: string;
    comment?: string;
  };
}

interface WikidataApprovalDisplayProps {
  data: WikidataApprovalData;
  onOverride?: (overrideWikidataId: string) => void;
  onApprove?: () => void;
}

export function WikidataApprovalDisplay({
  data,
  onOverride,
  onApprove,
}: WikidataApprovalDisplayProps) {
  const { t } = useI18n();
  const [overrideId, setOverrideId] = useState("");
  const [overrideError, setOverrideError] = useState("");

  const isApproved = data.status === "approved";
  const isPending = data.status === "pending_approval";

  const handleOverrideChange = (value: string) => {
    setOverrideId(value);
    setOverrideError("");

    // Validate that it starts with Q
    if (value && !value.trim().startsWith("Q")) {
      setOverrideError(t("wikidata.mustStartWithQ"));
    } else if (value && !/^Q\d+$/.test(value.trim())) {
      setOverrideError(t("wikidata.invalidFormat"));
    }
  };

  const handleOverrideSubmit = () => {
    if (!overrideId.trim()) {
      setOverrideError(t("wikidata.enterWikidataId"));
      return;
    }

    const trimmedId = overrideId.trim();
    if (!trimmedId.startsWith("Q")) {
      setOverrideError(t("wikidata.mustStartWithQ"));
      return;
    }

    if (!/^Q\d+$/.test(trimmedId)) {
      setOverrideError(t("wikidata.invalidFormat"));
      return;
    }

    if (onOverride) {
      onOverride(trimmedId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center space-x-3">
        {isApproved ? (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-green-03/20 border border-green-03">
            <Check className="w-4 h-4 text-green-03" />
            <span className="text-sm font-medium text-green-03">{t("wikidata.approved")}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-orange-03/20 border border-orange-03">
            <AlertCircle className="w-4 h-4 text-orange-03" />
            <span className="text-sm font-medium text-orange-03">
              {t("wikidata.pendingApproval")}
            </span>
          </div>
        )}
      </div>

      {/* Message */}
      {data.message && (
        <Callout variant={isApproved ? "success" : "warning"}>
          {data.message}
        </Callout>
      )}

      {/* Wikidata Information */}
      <div className="bg-gray-03/20 rounded-lg p-4 space-y-3">
        <h4 className="text-base font-medium text-gray-01">{t("wikidata.wikidataInfo")}</h4>

        <div className="space-y-2">
          <div>
            <div className="text-xs text-gray-02 mb-1">{t("wikidata.id")}</div>
            <div className="flex items-center space-x-2">
              <code className="text-sm font-mono text-gray-01 bg-gray-04 px-2 py-1 rounded">
                {data.wikidata.node}
              </code>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-7 px-2"
              >
                <a
                  href={data.wikidata.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-03 hover:text-blue-04"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Button>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-02 mb-1">{t("wikidata.name")}</div>
            <div className="text-sm text-gray-01">{data.wikidata.label}</div>
          </div>

          {data.wikidata.description && (
            <div>
              <div className="text-xs text-gray-02 mb-1">{t("wikidata.description")}</div>
              <div className="text-sm text-gray-01">
                {data.wikidata.description}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approve Section (only for pending_approval) */}
      {isPending && (
        <Callout
          variant="success"
          title={t("wikidata.approveWikidata")}
          description={t("wikidata.approveDescription")}
        >
          <Button
            variant="primary"
            size="sm"
            onClick={() => onApprove?.()}
            className="bg-green-04 text-green-01 hover:bg-green-04/90"
          >
            <Check className="w-4 h-4 mr-2" />
            {t("wikidata.approveButton")}
          </Button>
        </Callout>
      )}

      {/* Override Section (only for pending_approval) */}
      {isPending && (
        <Callout
          variant="info"
          title={t("wikidata.overwriteWikidataId")}
          description={t("wikidata.overwriteDescription")}
        >
          <div className="space-y-2">
            <div>
              <label
                htmlFor="override-wikidata-id"
                className="block text-xs text-gray-02 mb-1"
              >
                {t("wikidata.wikidataIdLabel")}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  id="override-wikidata-id"
                  type="text"
                  value={overrideId}
                  onChange={(e) => handleOverrideChange(e.target.value)}
                  placeholder={t("wikidata.placeholder")}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg border text-sm",
                    "bg-gray-04 text-gray-01",
                    "focus:outline-none focus:ring-2 focus:ring-blue-03 focus:border-transparent",
                    overrideError
                      ? "border-pink-03 focus:ring-pink-03"
                      : "border-gray-03"
                  )}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOverrideSubmit}
                  disabled={!!overrideError || !overrideId.trim()}
                  className="h-9 px-4"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t("companyOverride.applyAndRerun")}
                </Button>
              </div>
              {overrideError && (
                <div className="text-xs text-pink-03 mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{overrideError}</span>
                </div>
              )}
            </div>
          </div>
        </Callout>
      )}

      {/* Metadata */}
      {data.metadata && (
        <div className="bg-gray-03/20 rounded-lg p-3 space-y-2">
          <div className="text-xs font-medium text-gray-02">{t("wikidata.metadata")}</div>
          {data.metadata.source && (
            <div className="text-xs text-gray-01">
              <span className="text-gray-02">{t("wikidata.source")}:</span> {data.metadata.source}
            </div>
          )}
          {data.metadata.comment && (
            <div className="text-xs text-gray-01">
              <span className="text-gray-02">{t("wikidata.comment")}:</span>{" "}
              {data.metadata.comment}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

