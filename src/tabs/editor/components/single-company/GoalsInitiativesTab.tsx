import { useI18n } from "@/contexts/I18nContext";
import type { GarboCompanyDetail } from "../../lib/types";
import { displayText } from "../../lib/company-edit-utils";

export function GoalsInitiativesTab({ company }: { company: GarboCompanyDetail }) {
  const { t } = useI18n();
  const dash = t("common.placeholderDash");

  return (
    <div className="space-y-6">
      {company.goals?.length ? (
        <section className="rounded-lg border border-gray-03 bg-gray-04/80 p-4">
          <h3 className="text-sm font-semibold text-gray-01 mb-3">
            {t("editor.singleCompanyView.sections.goals")}
          </h3>
          <ul className="list-disc list-inside text-sm text-gray-01 space-y-1">
            {company.goals.map((g) => (
              <li key={g.id}>{displayText(g.description, dash)}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {company.initiatives?.length ? (
        <section className="rounded-lg border border-gray-03 bg-gray-04/80 p-4">
          <h3 className="text-sm font-semibold text-gray-01 mb-3">
            {t("editor.singleCompanyView.sections.initiatives")}
          </h3>
          <ul className="list-disc list-inside text-sm text-gray-01 space-y-1">
            {company.initiatives.map((i) => (
              <li key={i.id}>{displayText(i.title, dash)}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {!company.goals?.length && !company.initiatives?.length && (
        <section className="rounded-lg border border-gray-03 bg-gray-04/80 p-4">
          <p className="text-sm text-gray-02">
            {t("editor.singleCompanyView.noGoalsOrInitiatives")}
          </p>
        </section>
      )}
    </div>
  );
}

