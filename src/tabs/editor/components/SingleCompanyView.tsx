import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { listCompanies, getCompany } from "../lib/companies-api";
import type { GarboCompanyDetail, GarboCompanyListItem } from "../lib/types";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";

/** API may return baseYear as number or as { id, year, metadata }; normalize for display. */
function displayBaseYear(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && "year" in value && typeof (value as { year: unknown }).year === "number") {
    return String((value as { year: number }).year);
  }
  return "—";
}

/** API may return description/title as string or nested object; normalize for display. */
function displayText(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "text" in value && typeof (value as { text: unknown }).text === "string") {
    return (value as { text: string }).text;
  }
  return "—";
}

export function SingleCompanyView() {
  const { t } = useI18n();
  const [companyList, setCompanyList] = useState<GarboCompanyListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<GarboCompanyDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    setError(null);
    listCompanies()
      .then((list) => {
        if (!cancelled) setCompanyList(list);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setCompanyList([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    setError(null);
    getCompany(selectedId)
      .then((company) => {
        if (!cancelled) setDetail(company);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const companyOptions = useMemo(
    () => companyList.map((c) => c.wikidataId),
    [companyList]
  );

  const getCompanyLabel = useCallback(
    (wikidataId: string) => {
      const c = companyList.find((x) => x.wikidataId === wikidataId);
      return c ? `${c.name} (${c.wikidataId})` : wikidataId;
    },
    [companyList]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <label className="text-sm font-medium text-gray-01 shrink-0">
          {t("editor.singleCompanyView.selectCompany")}
        </label>
        <SingleSelectDropdown
          options={companyOptions}
          value={selectedId}
          onChange={setSelectedId}
          placeholder={t("editor.singleCompanyView.searchPlaceholder")}
          getOptionLabel={getCompanyLabel}
          loading={loadingList}
          loadingLabel={t("editor.companies.loading")}
          emptyLabel={t("editor.companies.empty")}
          triggerClassName="min-w-[280px]"
          panelMinWidth={320}
        />
      </div>

      {loadingDetail && (
        <div className="flex justify-center py-12 bg-gray-04/80 backdrop-blur-sm rounded-lg">
          <LoadingSpinner label={t("editor.singleCompanyView.loadingDetail")} />
        </div>
      )}

      {error && !loadingDetail && (
        <div className="rounded-lg border border-gray-03 bg-gray-04/80 p-4">
          <p className="text-gray-01 font-medium">{t("editor.singleCompanyView.loadError")}</p>
          <p className="text-sm text-gray-02 mt-1">{error}</p>
        </div>
      )}

      {detail && !loadingDetail && (
        <div className="space-y-6">
          <section className="rounded-lg border border-gray-03 bg-gray-04/80 p-4">
            <h3 className="text-sm font-semibold text-gray-01 mb-3">
              {t("editor.singleCompanyView.sections.core")}
            </h3>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-gray-02">Name</dt>
                <dd className="text-gray-01 font-medium">{detail.name}</dd>
              </div>
              <div>
                <dt className="text-gray-02">Wikidata ID</dt>
                <dd className="text-gray-01 font-mono">{detail.wikidataId}</dd>
              </div>
              {detail.url && (
                <div>
                  <dt className="text-gray-02">URL</dt>
                  <dd>
                    <a
                      href={detail.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-03 hover:underline"
                    >
                      {detail.url}
                    </a>
                  </dd>
                </div>
              )}
              {detail.internalComment && (
                <div>
                  <dt className="text-gray-02">Internal comment</dt>
                  <dd className="text-gray-01">{detail.internalComment}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-lg border border-gray-03 bg-gray-04/80 p-4">
            <h3 className="text-sm font-semibold text-gray-01 mb-3">
              {t("editor.singleCompanyView.sections.tags")}
            </h3>
            <p className="text-sm text-gray-02">
              {detail.tags?.length ? detail.tags.join(", ") : "—"}
            </p>
            <p className="text-xs text-gray-03 mt-2">
              In-place tag editing can be added here; or use Multi-company view to bulk-edit tags.
            </p>
          </section>

          <section className="rounded-lg border border-gray-03 bg-gray-04/80 p-4">
            <h3 className="text-sm font-semibold text-gray-01 mb-3">
              {t("editor.singleCompanyView.sections.reportingPeriods")}
            </h3>
            {detail.reportingPeriods?.length ? (
              <ul className="space-y-2 text-sm">
                {detail.reportingPeriods.map((rp) => (
                  <li key={rp.id ?? rp.startDate} className="text-gray-01">
                    {rp.startDate} – {rp.endDate}
                    {rp.reportURL && (
                      <a
                        href={rp.reportURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-03 hover:underline"
                      >
                        Report
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-02">No reporting periods.</p>
            )}
            <p className="text-xs text-gray-03 mt-2">
              Full per-period edit form (emissions, economy) can be added here.
            </p>
          </section>

          {(detail.goals?.length || detail.initiatives?.length) && (
            <>
              {detail.goals?.length > 0 && (
                <section className="rounded-lg border border-gray-03 bg-gray-04/80 p-4">
                  <h3 className="text-sm font-semibold text-gray-01 mb-3">
                    {t("editor.singleCompanyView.sections.goals")}
                  </h3>
                  <ul className="list-disc list-inside text-sm text-gray-01 space-y-1">
                    {detail.goals.map((g) => (
                      <li key={g.id}>{displayText(g.description)}</li>
                    ))}
                  </ul>
                </section>
              )}
              {detail.initiatives?.length > 0 && (
                <section className="rounded-lg border border-gray-03 bg-gray-04/80 p-4">
                  <h3 className="text-sm font-semibold text-gray-01 mb-3">
                    {t("editor.singleCompanyView.sections.initiatives")}
                  </h3>
                  <ul className="list-disc list-inside text-sm text-gray-01 space-y-1">
                    {detail.initiatives.map((i) => (
                      <li key={i.id}>{displayText(i.title)}</li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          {(detail.industry || detail.baseYear != null) && (
            <section className="rounded-lg border border-gray-03 bg-gray-04/80 p-4">
              <h3 className="text-sm font-semibold text-gray-01 mb-3">
                {t("editor.singleCompanyView.sections.industry")} / {t("editor.singleCompanyView.sections.baseYear")}
              </h3>
              <p className="text-sm text-gray-01">
                {detail.industry?.subIndustryCode ?? "—"} / {displayBaseYear(detail.baseYear)}
              </p>
            </section>
          )}
        </div>
      )}

      {!selectedId && !loadingList && companyList.length > 0 && (
        <div className="rounded-lg border border-gray-03 bg-gray-04/80 p-8 text-center text-gray-02 text-sm">
          {t("editor.singleCompanyView.selectCompany")}
        </div>
      )}
    </div>
  );
}
