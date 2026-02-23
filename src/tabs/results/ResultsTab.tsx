import { useI18n } from "@/contexts/I18nContext";

export function ResultsTab() {
  const { t } = useI18n();
  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6">
      <h2 className="text-xl text-gray-01 mb-4">
        {t("results.overview")}
      </h2>
      <p className="text-gray-02">
        {t("results.placeholder")}
      </p>
    </div>
  );
}
