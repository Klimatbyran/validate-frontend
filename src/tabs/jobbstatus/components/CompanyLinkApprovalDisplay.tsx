import { useState } from "react";
import { Button } from "@/ui/button";
import { Callout } from "@/ui/callout";
import { useI18n } from "@/contexts/I18nContext";
import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompanyLinkApprovalData } from "../lib/job-specific-data-parsing";

interface CompanyLinkApprovalDisplayProps {
  data: CompanyLinkApprovalData;
  onApprove?: (selection: { companyId?: string; createNew?: boolean }) => void;
}

export function CompanyLinkApprovalDisplay({
  data,
  onApprove,
}: CompanyLinkApprovalDisplayProps) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<string>(
    data.selectedCompanyId ?? data.candidates[0]?.id ?? "",
  );
  const [createNew, setCreateNew] = useState(Boolean(data.createNew));

  const isApproved = data.status === "approved";
  const isPending = data.status === "pending_approval";
  const isWikidataRelink = data.metadata?.source === "wikidata-relink";

  const handleApprove = () => {
    if (createNew) {
      onApprove?.({ createNew: true });
      return;
    }
    if (selectedId) {
      onApprove?.({ companyId: selectedId });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        {isApproved ? (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-green-03/20 border border-green-03">
            <Check className="w-4 h-4 text-green-03" />
            <span className="text-sm font-medium text-green-03">
              {t("companyLink.approved")}
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-orange-03/20 border border-orange-03">
            <AlertCircle className="w-4 h-4 text-orange-03" />
            <span className="text-sm font-medium text-orange-03">
              {t("companyLink.pendingApproval")}
            </span>
          </div>
        )}
      </div>

      {data.message ? (
        <Callout variant={isApproved ? "success" : "warning"}>
          {data.message}
        </Callout>
      ) : null}

      <div className="bg-gray-03/20 rounded-lg p-4 space-y-3">
        <h4 className="text-base font-medium text-gray-01">
          {isWikidataRelink
            ? t("companyLink.wikidataRelinkTitle")
            : t("companyLink.title")}
        </h4>
        <p className="text-sm text-gray-02">
          {isWikidataRelink && data.wikidataNode
            ? t("companyLink.wikidataRelinkDescription", {
                wikidataId: data.wikidataNode,
                name: data.extractedName,
              })
            : t("companyLink.extractedName", { name: data.extractedName })}
        </p>

        {isApproved ? (
          <div className="text-sm text-gray-01">
            {data.createNew
              ? t("companyLink.approvedCreateNew")
              : t("companyLink.approvedSelected", {
                  name:
                    data.candidates.find((c) => c.id === data.selectedCompanyId)
                      ?.name ??
                    data.selectedCompanyId ??
                    "—",
                })}
          </div>
        ) : (
          <div className="space-y-2">
            {data.candidates.map((candidate) => (
              <label
                key={candidate.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  !createNew && selectedId === candidate.id
                    ? "border-blue-03 bg-blue-03/10"
                    : "border-gray-03 hover:border-blue-03/50",
                )}
                onClick={() => {
                  setCreateNew(false);
                  setSelectedId(candidate.id);
                }}
              >
                <input
                  type="radio"
                  name="company-link-candidate"
                  checked={!createNew && selectedId === candidate.id}
                  onChange={() => {
                    setCreateNew(false);
                    setSelectedId(candidate.id);
                  }}
                  className="mt-1 shrink-0 accent-blue-03"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-01">
                    {candidate.name}
                  </div>
                  <div className="text-xs text-gray-02 break-all">
                    {candidate.wikidataId
                      ? `${t("companyLink.wikidata")}: ${candidate.wikidataId}`
                      : t("companyLink.noWikidata")}
                  </div>
                  <div className="text-xs text-gray-02 break-all">
                    {t("companyLink.companyId")}: {candidate.id}
                  </div>
                </div>
              </label>
            ))}

            {data.allowCreateNew !== false ? (
              <label
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  createNew
                    ? "border-blue-03 bg-blue-03/10"
                    : "border-gray-03 hover:border-blue-03/50",
                )}
                onClick={() => setCreateNew(true)}
              >
                <input
                  type="radio"
                  name="company-link-candidate"
                  checked={createNew}
                  onChange={() => setCreateNew(true)}
                  className="mt-1 shrink-0 accent-blue-03"
                />
                <div>
                  <div className="text-sm font-medium text-gray-01">
                    {t("companyLink.createNew")}
                  </div>
                  <div className="text-xs text-gray-02">
                    {t("companyLink.createNewDescription")}
                  </div>
                </div>
              </label>
            ) : null}
          </div>
        )}
      </div>

      {isPending && (
        <div className="rounded-lg border border-green-03/40 bg-green-03/10 p-4 space-y-3">
          <div>
            <h4 className="text-base font-medium text-gray-01">
              {isWikidataRelink
                ? t("companyLink.wikidataRelinkApproveTitle")
                : t("companyLink.approveTitle")}
            </h4>
            <p className="text-sm text-gray-02 mt-1">
              {isWikidataRelink
                ? t("companyLink.wikidataRelinkApproveDescription")
                : t("companyLink.approveDescription")}
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleApprove}
            disabled={!createNew && !selectedId}
            className="bg-green-04 text-green-01 hover:bg-green-04/90"
          >
            <Check className="w-4 h-4 mr-2" />
            {t("companyLink.approveButton")}
          </Button>
        </div>
      )}

      {data.metadata && (
        <div className="bg-gray-03/20 rounded-lg p-3 space-y-2">
          <div className="text-xs font-medium text-gray-02">
            {t("companyLink.metadata")}
          </div>
          {data.metadata.source && (
            <div className="text-xs text-gray-01">
              <span className="text-gray-02">{t("companyLink.source")}:</span>{" "}
              {data.metadata.source}
            </div>
          )}
          {data.metadata.comment && (
            <div className="text-xs text-gray-01">
              <span className="text-gray-02">{t("companyLink.comment")}:</span>{" "}
              {data.metadata.comment}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
