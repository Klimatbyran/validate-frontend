import { useEffect, useState } from "react";
import { Loader2, Undo2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import { toast } from "sonner";
import {
  updateCompany,
  updateCompanyIndustry,
  updateCompanyBaseYear,
  fetchIndustryGics,
  type IndustryGicsOption,
} from "../lib/companies-api";
import type { GarboCompanyDetail, TagOption } from "../lib/types";
import { MetadataHint } from "./MetadataHint";

const inputClassName =
  "w-full max-w-md px-3 py-2 rounded-lg border border-gray-03 bg-gray-05 text-gray-01 placeholder:text-gray-03 focus:outline-none focus:ring-2 focus:ring-blue-03";

function displayBaseYear(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number") return String(value);
  if (
    typeof value === "object" &&
    "year" in value &&
    typeof (value as { year: unknown }).year === "number"
  )
    return String((value as { year: number }).year);
  return "—";
}

function displayText(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    typeof (value as { text: unknown }).text === "string"
  )
    return (value as { text: string }).text;
  return "—";
}

function getDescriptionByLang(
  company: GarboCompanyDetail,
  lang: string
): string {
  const d = company.descriptions?.find((x) => x.language === lang);
  return d && typeof d.text === "string" ? d.text : "";
}

export function CompanyEditDetail({
  company,
  tagOptions,
  onSaved,
}: {
  company: GarboCompanyDetail;
  tagOptions: TagOption[];
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(company.name ?? "");
  const [descriptionEn, setDescriptionEn] = useState(() =>
    getDescriptionByLang(company, "EN")
  );
  const [descriptionSv, setDescriptionSv] = useState(() =>
    getDescriptionByLang(company, "SV")
  );
  const [lei, setLei] = useState(company.lei ?? "");
  const [url, setUrl] = useState(company.url ?? "");
  const [internalComment, setInternalComment] = useState(
    company.internalComment ?? ""
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    company.tags ?? []
  );

  const [subIndustryCode, setSubIndustryCode] = useState(
    company.industry?.subIndustryCode ?? ""
  );
  const [baseYear, setBaseYear] = useState(() =>
    displayBaseYear(company.baseYear)
  );

  const [industryOptions, setIndustryOptions] = useState<IndustryGicsOption[]>([]);
  const [savingCore, setSavingCore] = useState(false);
  const [savingIndustry, setSavingIndustry] = useState(false);

  useEffect(() => {
    setName(company.name ?? "");
    setDescriptionEn(getDescriptionByLang(company, "EN"));
    setDescriptionSv(getDescriptionByLang(company, "SV"));
    setLei(company.lei ?? "");
    setUrl(company.url ?? "");
    setInternalComment(company.internalComment ?? "");
    setSelectedTags(company.tags ?? []);
    setSubIndustryCode(company.industry?.subIndustryCode ?? "");
    setBaseYear(displayBaseYear(company.baseYear));
  }, [company.wikidataId, company.name, company.lei, company.url, company.internalComment, company.tags, company.industry?.subIndustryCode, company.baseYear, company.descriptions]);

  useEffect(() => {
    fetchIndustryGics()
      .then(setIndustryOptions)
      .catch(() => setIndustryOptions([]));
  }, []);

  const handleSaveCore = async () => {
    setSavingCore(true);
    try {
      await updateCompany(company.wikidataId, {
        name,
        descriptions: [
          { language: "EN", text: descriptionEn },
          { language: "SV", text: descriptionSv },
        ],
        lei: lei || undefined,
        url: url || undefined,
        internalComment: internalComment || undefined,
        tags: selectedTags,
      });
      toast.success(t("editor.tagOptions.updated"));
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingCore(false);
    }
  };

  const handleSaveIndustry = async () => {
    const by = baseYear.trim() ? parseInt(baseYear, 10) : undefined;
    if (by != null && (isNaN(by) || by < 1990 || by > 2100)) {
      toast.error(t("editor.singleCompanyView.invalidBaseYear"));
      return;
    }
    setSavingIndustry(true);
    try {
      if (subIndustryCode) {
        await updateCompanyIndustry(company.wikidataId, {
          industry: { subIndustryCode },
        });
      }
      if (by != null) {
        await updateCompanyBaseYear(company.wikidataId, { baseYear: by });
      }
      if (subIndustryCode || by != null) {
        toast.success(t("editor.tagOptions.updated"));
        onSaved?.();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingIndustry(false);
    }
  };

  const industrySelectOptions = industryOptions.map((o) => o.code);
  const getIndustryLabel = (code: string) => {
    const o = industryOptions.find((x) => x.code === code);
    return o?.label ?? o?.subIndustryName ?? code;
  };

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-gray-03 bg-gray-04/80 p-4">
        <h3 className="text-sm font-semibold text-gray-01 mb-4">
          {t("editor.singleCompanyView.sections.core")}
        </h3>
        <div className="space-y-4 max-w-xl">
          <div>
            <label className="block text-sm font-medium text-gray-01 mb-1">
              {t("editor.singleCompanyView.fields.name")}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClassName}
              />
              <button
                type="button"
                onClick={() => setName(company.name ?? "")}
                className="p-2 rounded-full text-gray-02 hover:text-gray-01 hover:bg-gray-03"
                aria-label={t("editor.singleCompanyView.undo")}
              >
                <Undo2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-01 mb-1">
              {t("editor.singleCompanyView.fields.descriptionEn")}
            </label>
            <textarea
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              rows={3}
              className={inputClassName + " resize-y"}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-01 mb-1">
              {t("editor.singleCompanyView.fields.descriptionSv")}
            </label>
            <textarea
              value={descriptionSv}
              onChange={(e) => setDescriptionSv(e.target.value)}
              rows={3}
              className={inputClassName + " resize-y"}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-01 mb-1">
              LEI
            </label>
            <input
              type="text"
              value={lei}
              onChange={(e) => setLei(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-01 mb-1">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-01 mb-1">
              {t("editor.singleCompanyView.fields.internalComment")}
            </label>
            <textarea
              value={internalComment}
              onChange={(e) => setInternalComment(e.target.value)}
              rows={2}
              className={inputClassName + " resize-y"}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-01 mb-1">
              {t("editor.singleCompanyView.sections.tags")}
            </label>
            <MultiSelectDropdown
              options={tagOptions.map((o) => o.slug)}
              selectedIds={selectedTags}
              onChange={setSelectedTags}
              triggerLabel={t("editor.companies.tags")}
              getOptionLabel={(slug) =>
                tagOptions.find((o) => o.slug === slug)?.label ?? slug
              }
              emptyLabel={t("editor.tagOptions.empty")}
              panelClassName="max-h-64"
              panelMinWidth={260}
            />
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedTags.map((slug) => (
                  <span
                    key={slug}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-03/80 text-gray-01 border border-gray-03"
                  >
                    {tagOptions.find((o) => o.slug === slug)?.label ?? slug}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="mt-4"
          onClick={handleSaveCore}
          disabled={savingCore}
        >
          {savingCore && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {t("editor.fieldEdit.save")}
        </Button>
      </section>

      <section className="rounded-lg border border-gray-03 bg-gray-04/80 p-4">
        <h3 className="text-sm font-semibold text-gray-01 mb-4">
          {t("editor.singleCompanyView.sections.industry")} /{" "}
          {t("editor.singleCompanyView.sections.baseYear")}
        </h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-02 mb-1">
              {t("editor.singleCompanyView.fields.gicsSubIndustry")}
            </label>
            <SingleSelectDropdown
              options={industrySelectOptions}
              value={subIndustryCode}
              onChange={setSubIndustryCode}
              placeholder={t("editor.singleCompanyView.selectIndustry")}
              getOptionLabel={getIndustryLabel}
              emptyLabel={t("editor.singleCompanyView.noIndustry")}
              triggerClassName="min-w-[200px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-02 mb-1">
              {t("editor.singleCompanyView.sections.baseYear")}
            </label>
            <input
              type="number"
              min={1990}
              max={2100}
              value={baseYear}
              onChange={(e) => setBaseYear(e.target.value)}
              className={inputClassName + " w-28"}
            />
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSaveIndustry}
            disabled={savingIndustry}
          >
            {savingIndustry && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            {t("editor.fieldEdit.save")}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-gray-03 bg-gray-04/80 p-4">
        <h3 className="text-sm font-semibold text-gray-01 mb-4">
          {t("editor.singleCompanyView.sections.reportingPeriods")}
        </h3>
        {company.reportingPeriods?.length ? (
          <ul className="space-y-4">
            {company.reportingPeriods.map((rp) => (
              <li
                key={rp.id ?? rp.startDate}
                className="text-sm border-b border-gray-03/50 pb-4 last:border-0"
              >
                <div className="font-medium text-gray-01">
                  {rp.startDate} – {rp.endDate}
                </div>
                {rp.reportURL && (
                  <a
                    href={rp.reportURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-03 hover:underline text-xs"
                  >
                    {t("editor.companies.reportUrl")}
                  </a>
                )}
                <div className="mt-2 text-gray-02 text-xs space-y-1">
                  {rp.emissions?.scope1?.total != null && (
                    <div>
                      Scope 1: {Number(rp.emissions.scope1.total).toLocaleString()}
                      <MetadataHint
                        metadata={
                          (rp.emissions as { scope1?: { metadata?: unknown } })
                            ?.scope1?.metadata as any
                        }
                      />
                    </div>
                  )}
                  {rp.emissions?.scope2 && (
                    <div>
                      Scope 2: MB/LB/Unk
                      <MetadataHint
                        metadata={
                          (rp.emissions as { scope2?: { metadata?: unknown } })
                            ?.scope2?.metadata as any
                        }
                      />
                    </div>
                  )}
                  {rp.economy && (
                    <div>
                      Economy
                      <MetadataHint
                        metadata={
                          (rp.economy as { metadata?: unknown })?.metadata as any
                        }
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-02">
            {t("editor.singleCompanyView.noReportingPeriods")}
          </p>
        )}
        <p className="text-xs text-gray-03 mt-2">
          {t("editor.singleCompanyView.reportingPeriodsHint")}
        </p>
      </section>

      {(company.goals?.length || company.initiatives?.length) && (
        <>
          {company.goals?.length ? (
            <section className="rounded-lg border border-gray-03 bg-gray-04/80 p-4">
              <h3 className="text-sm font-semibold text-gray-01 mb-3">
                {t("editor.singleCompanyView.sections.goals")}
              </h3>
              <ul className="list-disc list-inside text-sm text-gray-01 space-y-1">
                {company.goals.map((g) => (
                  <li key={g.id}>{displayText(g.description)}</li>
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
                  <li key={i.id}>{displayText(i.title)}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
