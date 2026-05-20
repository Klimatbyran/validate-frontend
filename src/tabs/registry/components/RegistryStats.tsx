import { useI18n } from "@/contexts/I18nContext";
import type { RegistryStats as RegistryStatsData } from "../lib/registry-types";

interface RegistryStatsProps {
  stats: RegistryStatsData;
}

const RegistryStats = ({ stats }: RegistryStatsProps) => {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-4 border border-gray-03/70">
        <p className="text-sm text-gray-02">{t("registry.uniqueCompanies")}</p>
        <p className="text-2xl text-gray-01 font-semibold">{stats.uniqueCompanies}</p>
      </div>
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-4 border border-gray-03/70">
        <p className="text-sm text-gray-02">{t("registry.totalReports")}</p>
        <p className="text-2xl text-gray-01 font-semibold">{stats.totalReports}</p>
      </div>
    </div>
  );
};

export default RegistryStats;
