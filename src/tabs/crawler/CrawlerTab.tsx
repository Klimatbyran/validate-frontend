import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/ui/button";
import { WandIcon, Loader2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import fetchCompanyReports from "./lib/crawler-api";
import { CompanyReport } from "./lib/crawler-types";
import ResultsList from "./components/ResultsList";

export function CrawlerTab() {
  const { t } = useI18n();
  const [companyNameInput, setCompanyNameInput] = useState<string>("");
  const [reportYearInput, setReportYearInput] = useState<string>("");
  const [companyReports, setCompanyReports] = useState<CompanyReport[] | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean | null>(null);

  const handleClick = async () => {
    if (!companyNameInput || !reportYearInput) return;

    setIsLoading(true);
    const companyNames = companyNameInput.split(",").map((name) => name.trim());
    const searchQueries = companyNames.map((name) => ({
      name,
      reportYear: reportYearInput,
    }));

    const data = await Promise.all(
      searchQueries.map((query) => fetchCompanyReports(query)),
    );

    if (data) {
      const transformedData = data.flatMap((response) =>
        response.results.map((item: CompanyReport) => ({
          companyName: item.companyName || "Unknown",
          reportYear: item.reportYear || "Unknown",
          results: item.results ?? [],
        })),
      );

      setCompanyReports(transformedData);
      setIsLoading(false);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyNameInput(e.target.value);
  };

  const handleReportYearInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setReportYearInput(e.target.value);
  };

  return (
    <div className="flex flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 flex flex-col justify-between"
      >
        <h2 className="text-xl font-semibold text-gray-01 mb-6">{t("crawler.title")}</h2>

        <div className="flex flex-col gap-2 justify-center">
          <h3>{t("crawler.manualSearch")}</h3>
          <div className="flex flex-col gap-4 justify-center">
            <div className="flex flex-col gap-2">
              <textarea
                onChange={(e) => handleSearchInputChange(e)}
                placeholder={t("crawler.searchPlaceholder")}
                className="bg-gray-03/20 w-[500px] h-[100px] border p-2 flex items-center justify-center border-gray-03 rounded-lg text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03"
              />
              <h3 className="pt-4">{t("crawler.reportYear")}</h3>
              <input
                required
                onChange={(e) => handleReportYearInputChange(e)}
                placeholder={t("crawler.reportYearPlaceholder")}
                className="bg-gray-03/20 w-48 border p-2 flex items-center justify-center border-gray-03 rounded-lg text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03"
              />
            </div>
            <Button size={"sm"} onClick={() => handleClick()}>
              {t("crawler.search")}
              <WandIcon className="w-4 h-4 ml-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 text-blue-03 animate-spin mx-auto" />
            <div>
              <p className="text-lg text-gray-01 font-medium">
                {t("crawler.loadingResults")}
              </p>
              <p className="text-sm text-gray-02 mt-2">
                {t("crawler.loadingDescription")}
              </p>
            </div>
          </div>
        </div>
      ) : (
        companyReports && (
          <ResultsList
            setCompanyReports={setCompanyReports}
            companyReports={companyReports}
          />
        )
      )}
    </div>
  );
}
