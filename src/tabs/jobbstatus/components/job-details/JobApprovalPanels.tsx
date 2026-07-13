/**
 * Staff approval actions for pipeline jobs (company link, Wikidata, company name).
 * Rendered at the top of the job details overview so actions are not buried below URLs.
 */

import { CompanyLinkApprovalDisplay } from "../CompanyLinkApprovalDisplay";
import { WikidataApprovalDisplay } from "../WikidataApprovalDisplay";
import { CompanyNameOverrideDisplay } from "./CompanyNameOverrideDisplay";
import { Callout } from "@/ui/callout";
import { useI18n } from "@/contexts/I18nContext";
import type {
  CompanyLinkApprovalData,
  WikidataApprovalData,
} from "../../lib/job-specific-data-parsing";

interface JobApprovalPanelsProps {
  companyLinkApprovalData: CompanyLinkApprovalData | null;
  wikidataApprovalData: WikidataApprovalData | null;
  showCompanyNameOverride: boolean;
  companyName?: string;
  missingCompanyNameForOverride: boolean;
  showUnresolvedApprovalHint: boolean;
  isLoadingApprovalDetails: boolean;
  onCompanyLinkApprove: (selection: {
    companyId?: string;
    createNew?: boolean;
  }) => void;
  onWikidataApprove: () => void;
  onWikidataOverride: (overrideWikidataId: string) => void;
  onCompanyNameOverride: (overrideCompanyName: string) => void;
}

export function JobApprovalPanels({
  companyLinkApprovalData,
  wikidataApprovalData,
  showCompanyNameOverride,
  companyName,
  missingCompanyNameForOverride,
  showUnresolvedApprovalHint,
  isLoadingApprovalDetails,
  onCompanyLinkApprove,
  onWikidataApprove,
  onWikidataOverride,
  onCompanyNameOverride,
}: JobApprovalPanelsProps) {
  const { t } = useI18n();

  const hasPanels =
    companyLinkApprovalData ||
    wikidataApprovalData ||
    showCompanyNameOverride ||
    showUnresolvedApprovalHint ||
    isLoadingApprovalDetails;

  if (!hasPanels) return null;

  return (
    <div className="mb-4 space-y-4 rounded-lg border border-orange-03/40 bg-orange-03/5 p-4">
      <h3 className="text-lg font-medium text-gray-01">
        {t("jobstatus.jobdetails.actionRequiredTitle")}
      </h3>

      {isLoadingApprovalDetails ? (
        <p className="text-sm text-gray-02">
          {t("jobstatus.jobdetails.loadingApprovalDetails")}
        </p>
      ) : null}

      {showUnresolvedApprovalHint ? (
        <Callout
          variant="warning"
          title={t("jobstatus.jobdetails.unresolvedApprovalTitle")}
          description={t("jobstatus.jobdetails.unresolvedApprovalDescription")}
        />
      ) : null}

      {companyLinkApprovalData ? (
        <CompanyLinkApprovalDisplay
          data={companyLinkApprovalData}
          onApprove={onCompanyLinkApprove}
        />
      ) : null}

      {wikidataApprovalData ? (
        <WikidataApprovalDisplay
          data={wikidataApprovalData}
          onOverride={onWikidataOverride}
          onApprove={onWikidataApprove}
        />
      ) : null}

      {showCompanyNameOverride ? (
        <CompanyNameOverrideDisplay
          currentCompanyName={companyName}
          missingCompanyName={missingCompanyNameForOverride}
          onOverride={onCompanyNameOverride}
        />
      ) : null}
    </div>
  );
}
