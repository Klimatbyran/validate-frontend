import { motion } from "framer-motion";
import { CompanyDetails } from "../lib/crawler-types";
import CompaniesNamesResultItem from "./CompaniesNamesResultItem";
import { useCallback, useEffect, useState, useMemo } from "react";
import { fetchCompanyNamesList } from "../lib/crawler-api";
import { useI18n } from "@/contexts/I18nContext";
import { DataTable, DataTableBody, DataTableHead, DataTableShell } from "@/ui/data-table";

interface CompaniesNamesListProps {
  setIsLoading: React.Dispatch<React.SetStateAction<boolean | null>>;
  onSelectionChange: React.Dispatch<React.SetStateAction<string[]>>;
  selectedCompanies: string[];
  filterYear?: number | null;
  filterEnabled?: boolean;
}

const CompaniesNamesList = ({
  setIsLoading,
  selectedCompanies,
  onSelectionChange,
  filterYear,
  filterEnabled,
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

  const companiesListWithSortedPeriods = useMemo(() => {
    let filtered = companiesList;
    if (filterEnabled && filterYear && !isNaN(filterYear)) {
      filtered =
        companiesList?.filter((company) => {
          // Exclude companies that have a reporting period ending in filterYear
          return !company.reportingPeriods.some((rp) => {
            const endYear = new Date(rp.endDate).getFullYear();
            return endYear === filterYear;
          });
        }) || null;
    }
    return filtered?.map((company) => ({
      ...company,
      reportingPeriods: [...company.reportingPeriods].sort((a, b) =>
        b.endDate.localeCompare(a.endDate),
      ),
    }));
  }, [companiesList, filterYear, filterEnabled]);

  return (
    <>
      {companiesList && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg"
        >
          <DataTableShell>
            <DataTable className="text-left">
              <DataTableHead>
                <tr>
                  <th className="px-4 py-3 flex flex-col text-xs tracking-wider">
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
                  <th className="pl-4 py-3 flex flex-col text-xs tracking-wider">
                    <span className="font-semibold flex gap-2 text-gray-02 uppercase">
                      {t("crawler.select")}{" "}
                      <button
                        className="flex"
                        onClick={handleSelectAllCompanies}
                      >
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
              </DataTableHead>

              <DataTableBody>
                {companiesListWithSortedPeriods &&
                  companiesListWithSortedPeriods.map((company, index) => (
                    <CompaniesNamesResultItem
                      key={index}
                      companyDetails={company}
                      isSelected={selectedCompanies.includes(company.name)}
                      onToggle={handleToggleCompany}
                    />
                  ))}
              </DataTableBody>
            </DataTable>
          </DataTableShell>
        </motion.div>
      )}
    </>
  );
};

export default CompaniesNamesList;
