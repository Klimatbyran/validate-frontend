import { motion } from "framer-motion";
import { CompanyDetails } from "../lib/crawler-types";
import CompaniesNamesResultItem from "./CompaniesNamesResultItem";
import { useCallback, useEffect, useState, useMemo } from "react";
import { fetchCompanyNamesList } from "../lib/crawler-api";
import { useI18n } from "@/contexts/I18nContext";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableShell,
} from "@/ui/data-table";

interface CompanySelection {
  name: string;
  wikidataId?: string;
  url?: string;
}

interface CompaniesNamesListProps {
  setIsLoading: React.Dispatch<React.SetStateAction<boolean | null>>;
  onSelectionChange: React.Dispatch<React.SetStateAction<CompanySelection[]>>;
  selectedCompanies: CompanySelection[];
  filterYear?: number | null;
  filterEnabled?: boolean;
  selectedTags: string[];
  onTagOptionsLoaded: (tags: string[]) => void;
}

const CompaniesNamesList = ({
  setIsLoading,
  selectedCompanies,
  onSelectionChange,
  filterYear,
  filterEnabled,
  selectedTags,
  onTagOptionsLoaded,
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

        const tagSet = new Set<string>();
        for (const company of data as CompanyDetails[]) {
          for (const tag of company.tags ?? []) tagSet.add(tag);
        }
        onTagOptionsLoaded(Array.from(tagSet).sort());
      }
    };
    fetchData();
  }, []);

  const handleToggleCompany = useCallback(
    (companyName: string, wikidataId?: string, url?: string) => {
      onSelectionChange((prev) =>
        prev.some((s) => s.name === companyName)
          ? prev.filter((s) => s.name !== companyName)
          : [...prev, { name: companyName, wikidataId, url }],
      );
    },
    [onSelectionChange],
  );

  const companiesListFiltered = useMemo(() => {
    let filtered = companiesList;

    if (filterEnabled && filterYear && !isNaN(filterYear)) {
      filtered =
        filtered?.filter(
          (company) =>
            !company.reportingPeriods.some(
              (rp) => new Date(rp.endDate).getFullYear() === filterYear,
            ),
        ) ?? null;
    }

    if (selectedTags.length > 0) {
      filtered =
        filtered?.filter((company) =>
          selectedTags.some((tag) => company.tags?.includes(tag)),
        ) ?? null;
    }

    return filtered
      ?.slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((company) => ({
        ...company,
        reportingPeriods: [...company.reportingPeriods].sort((a, b) =>
          b.endDate.localeCompare(a.endDate),
        ),
      }));
  }, [companiesList, filterYear, filterEnabled, selectedTags]);

  const handleSelectAllCompanies = () => {
    const visibleNames = new Set(
      companiesListFiltered?.map((c) => c.name) ?? [],
    );
    const allVisible =
      visibleNames.size > 0 &&
      companiesListFiltered?.every((c) =>
        selectedCompanies.some((s) => s.name === c.name),
      );

    if (allVisible) {
      onSelectionChange((prev) =>
        prev.filter((s) => !visibleNames.has(s.name)),
      );
    } else {
      const toAdd =
        companiesListFiltered
          ?.filter((c) => !selectedCompanies.some((s) => s.name === c.name))
          .map((c) => ({
            name: c.name,
            wikidataId: c.wikidataId,
            url: c.url ?? undefined,
          })) ?? [];
      onSelectionChange((prev) => [...prev, ...toAdd]);
    }
  };

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
                        count: companiesListFiltered?.length ?? 0,
                      })}
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
                      })}
                    </span>
                  </th>
                </tr>
              </DataTableHead>

              <DataTableBody>
                {companiesListFiltered?.map((company, index) => (
                  <CompaniesNamesResultItem
                    key={index}
                    companyDetails={company}
                    isSelected={selectedCompanies.some(
                      (s) => s.name === company.name,
                    )}
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
