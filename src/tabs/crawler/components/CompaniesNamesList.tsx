import { motion } from "framer-motion";
import { CompanyDetails } from "../lib/crawler-types";
import CompaniesNamesResultItem from "./CompaniesNamesResultItem";
import { useCallback, useEffect, useState } from "react";
import { fetchCompanyNamesList } from "../lib/crawler-api";
import { useI18n } from "@/contexts/I18nContext";

interface CompaniesNamesListProps {
  setIsLoading: React.Dispatch<React.SetStateAction<boolean | null>>;
  selectedCompanies: string[];
  onSelectionChange: React.Dispatch<React.SetStateAction<string[]>>;
}

const CompaniesNamesList = ({
  setIsLoading,
  selectedCompanies,
  onSelectionChange,
}: CompaniesNamesListProps) => {
  const { t } = useI18n();
  const [companiesList, setcompaniesList] = useState<CompanyDetails[] | null>(
    null,
  );

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const data = await fetchCompanyNamesList();

      if (data) {
        setcompaniesList(data);
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleToggleCompany = useCallback(
    (companyName: string) => {
      onSelectionChange((prev) =>
        prev.includes(companyName)
          ? prev.filter((name) => name !== companyName)
          : [...prev, companyName],
      );
    },
    [onSelectionChange],
  );

  const handleSelectAllCompanies = () => {
    if (selectedCompanies.length === companiesList?.length) {
      onSelectionChange([]);
    } else {
      const allCompanyNames =
        companiesList?.map((company) => company.name) || [];
      onSelectionChange(allCompanyNames);
    }
  };

  const companiesListWithSortedPeriods = companiesList?.map((company) => ({
    ...company,
    reportingPeriods: [...company.reportingPeriods].sort((a, b) =>
      b.endDate.localeCompare(a.endDate),
    ),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-04/80 backdrop-blur-sm rounded-lg overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-03/50">
            <tr>
              <th className="px-4 py-3 text-left flex flex-col text-xs tracking-wider">
                <span className="font-semibold text-gray-02 uppercase">
                  {t("crawler.company")}
                </span>
                <span className="font-medium text-gray-02">
                  {t("crawler.foundCompanies", {
                    count: companiesListWithSortedPeriods?.length ?? 0,
                  })}{" "}
                </span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-02 uppercase tracking-wider">
                {t("crawler.latestReport")}
              </th>
              <th className="pl-4 py-3 text-left flex flex-col text-xs tracking-wider">
                <span className="font-semibold flex gap-2 text-gray-02 uppercase">
                  {t("crawler.select")}{" "}
                  <button className="flex" onClick={handleSelectAllCompanies}>
                    <span className="flex gap-2">
                      ({t("crawler.clickSelectAll")})
                    </span>
                  </button>
                </span>
                <span className="font-medium text-gray-02">
                  {t("crawler.selectedCompanies", {
                    count: selectedCompanies.length,
                  })}{" "}
                </span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-03/50">
            {companiesListWithSortedPeriods?.length &&
              companiesListWithSortedPeriods.map((company, index) => (
                <CompaniesNamesResultItem
                  key={index}
                  companyDetails={company}
                  isSelected={selectedCompanies.includes(company.name)}
                  onToggle={handleToggleCompany}
                />
              ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default CompaniesNamesList;
