import { motion } from "framer-motion";
import { CompanyReport } from "../lib/crawler-types";
import type { SelectedReport } from "../lib/crawler-types";
import { selectedReportFromHit } from "../lib/crawler-utils";
import SearchResultItem from "./SearchResultItem";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";

interface SearchResultsListProps {
  companyReports: CompanyReport[] | null;
  selectedReports: SelectedReport[];
  handleSelectReport: (
    companyName: string,
    report: SelectedReport | null,
  ) => void;
}

const SearchResultsList = ({
  companyReports,
  selectedReports,
  handleSelectReport,
}: SearchResultsListProps) => {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 flex flex-col justify-between"
    >
      <h3 className="text-xl font-semibold text-gray-01 mb-6">
        {t("crawler.searchResults")}
      </h3>

      {companyReports?.map((report, index) => (
        <SearchResultItem
          key={index}
          companyReport={report}
          selectedReport={
            selectedReports.find((r) => r.companyName === report.companyName)
              ?.url
          }
          onSelect={(companyName, url) => {
            if (!url) {
              handleSelectReport(companyName, null);
              return;
            }
            const hit = report.results.find((result) => result.url === url);
            const selected = selectedReportFromHit({
              companyName,
              url,
              hit,
              wikidataId: report.wikidataId,
            });
            if (!selected) {
              toast.error(t("crawler.selectedReportNeedsYear"));
              return;
            }
            handleSelectReport(companyName, selected);
          }}
        />
      ))}
    </motion.div>
  );
};

export default SearchResultsList;
