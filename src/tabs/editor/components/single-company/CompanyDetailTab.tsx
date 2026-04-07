import { useEffect, useMemo, useState } from "react";
import { Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import {
  fetchIndustryGics,
  updateCompany,
  updateCompanyBaseYear,
  updateCompanyIndustry,
  type IndustryGicsOption,
} from "../../lib/companies-api";
import type { GarboCompanyDetail, TagOption } from "../../lib/types";
import { displayBaseYear, getDescriptionByLang, inputClassName } from "../../lib/company-edit-utils";
import { buildTagLabelBySlug } from "../../lib/editor-tag-and-payload-utils";
import { ReviewerMetadataDialog } from "../ReviewerMetadataDialog";

export function CompanyDetailTab({
  company,
  tagOptions,
  onSaved,
}: {
  company: GarboCompanyDetail;
  tagOptions: TagOption[];
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const dash = t("common.placeholderDash");
  const tagLabelBySlug = useMemo(() => buildTagLabelBySlug(tagOptions), [tagOptions]);

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
  const [selectedTags, setSelectedTags] = useState<string[]>(company.tags ?? []);

  const [subIndustryCode, setSubIndustryCode] = useState(
    company.industry?.subIndustryCode ?? ""
  );
  const [baseYear, setBaseYear] = useState(() => displayBaseYear(company.baseYear, dash));

  const [industryOptions, setIndustryOptions] = useState<IndustryGicsOption[]>(
    []
  );
  const [savingCore, setSavingCore] = useState(false);
  const [savingIndustry, setSavingIndustry] = useState(false);
  const [saveDialog, setSaveDialog] = useState<null | "core" | "industry">(null);

  useEffect(() => {
    setName(company.name ?? "");
    setDescriptionEn(getDescriptionByLang(company, "EN"));
    setDescriptionSv(getDescriptionByLang(company, "SV"));
    setLei(company.lei ?? "");
    setUrl(company.url ?? "");
    setInternalComment(company.internalComment ?? "");
    setSelectedTags(company.tags ?? []);
    setSubIndustryCode(company.industry?.subIndustryCode ?? "");
    setBaseYear(displayBaseYear(company.baseYear, dash));
  }, [
    company.wikidataId,
    company.name,
    company.lei,
    company.url,
    company.internalComment,
    company.tags,
    company.industry?.subIndustryCode,
    company.baseYear,
    company.descriptions,
    dash,
  ]);

  useEffect(() => {
    fetchIndustryGics().then(setIndustryOptions).catch(() => setIndustryOptions([]));
  }, []);

  const industrySelectOptions = industryOptions.map((o) => o.code);
  const getIndustryLabel = (code: string) => {
    const o = industryOptions.find((x) => x.code === code);
    return o?.label ?? o?.subIndustryName ?? code;
  };

  const handleSaveCore = async (meta?: { comment?: string; source?: string }) => {
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
        metadata:
          meta?.comment?.trim() || meta?.source?.trim()
            ? { comment: meta.comment?.trim() || undefined, source: meta.source?.trim() || undefined }
            : undefined,
      });
      toast.success(t("editor.tagOptions.updated"));
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingCore(false);
    }
  };

  const handleSaveIndustry = async (meta?: { comment?: string; source?: string }) => {
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
          metadata:
            meta?.comment?.trim() || meta?.source?.trim()
              ? { comment: meta.comment?.trim() || undefined, source: meta.source?.trim() || undefined }
              : undefined,
        });
      }
      if (by != null) {
        await updateCompanyBaseYear(company.wikidataId, {
          baseYear: by,
          metadata:
            meta?.comment?.trim() || meta?.source?.trim()
              ? { comment: meta.comment?.trim() || undefined, source: meta.source?.trim() || undefined }
              : undefined,
        });
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

  return (
    <div className="space-y-8">
      <section className="rounded-lg bg-gray-04/80 p-4">
        <h3 className="text-sm font-semibold text-gray-01 mb-4">
          {t("editor.singleCompanyView.sections.core")}
        </h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-01 mb-1">
                  {t("editor.singleCompanyView.fields.name")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClassName + " !max-w-none"}
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
                  {t("editor.singleCompanyView.fields.url")}
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={inputClassName + " !max-w-none"}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-01 mb-1">
                  {t("editor.singleCompanyView.fields.descriptionEn")}
                </label>
                <textarea
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  rows={8}
                  className={inputClassName + " resize-y !max-w-none min-h-[11rem]"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-01 mb-1">
                  {t("editor.singleCompanyView.fields.descriptionSv")}
                </label>
                <textarea
                  value={descriptionSv}
                  onChange={(e) => setDescriptionSv(e.target.value)}
                  rows={8}
                  className={inputClassName + " resize-y !max-w-none min-h-[11rem]"}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-01 mb-1">
                {t("editor.singleCompanyView.fields.internalComment")}
              </label>
              <textarea
                value={internalComment}
                onChange={(e) => setInternalComment(e.target.value)}
                rows={2}
                className={inputClassName + " resize-y !max-w-none"}
              />
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-lg bg-gray-05/60 p-4">
              <div className="text-xs font-semibold text-gray-02 uppercase tracking-wide mb-3">
                {t("editor.companyDetail.identifiers")}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-01 mb-1">
                    {t("editor.companyDetail.wikidataId")}
                  </label>
                  <input
                    type="text"
                    value={company.wikidataId}
                    readOnly
                    className={inputClassName + " bg-gray-04/60 !max-w-none"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-01 mb-1">
                    {t("editor.companyDetail.lei")}
                  </label>
                  <input
                    type="text"
                    value={lei}
                    onChange={(e) => setLei(e.target.value)}
                    className={inputClassName + " !max-w-none"}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-lg bg-gray-05/60 p-4">
              <div className="text-xs font-semibold text-gray-02 uppercase tracking-wide mb-3">
                {t("editor.companyDetail.tags")}
              </div>
              <MultiSelectDropdown
                options={tagOptions.map((o) => o.slug)}
                selectedIds={selectedTags}
                onChange={setSelectedTags}
                triggerLabel={t("editor.companies.tags")}
                getOptionLabel={(slug) => tagLabelBySlug[slug] ?? slug}
                emptyLabel={t("editor.tagOptions.empty")}
                panelClassName="max-h-64"
                panelMinWidth={260}
                triggerClassName="!h-8 !text-xs px-3 min-w-[200px]"
              />
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedTags.map((slug) => (
                    <span
                      key={slug}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-03/80 text-gray-01"
                    >
                      {tagLabelBySlug[slug] ?? slug}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="mt-4"
          onClick={() => setSaveDialog("core")}
          disabled={savingCore}
        >
          {savingCore && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {t("editor.fieldEdit.save")}
        </Button>
      </section>

      <section className="rounded-lg bg-gray-04/80 p-4">
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
              triggerClassName="min-w-[200px] !h-8 !text-xs px-3"
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
            onClick={() => setSaveDialog("industry")}
            disabled={savingIndustry}
          >
            {savingIndustry && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("editor.fieldEdit.save")}
          </Button>
        </div>
      </section>

      <ReviewerMetadataDialog
        open={saveDialog != null}
        onOpenChange={(o) => {
          if (!o) setSaveDialog(null);
        }}
        title={t("editor.reviewerDialog.title")}
        confirmLabel={t("editor.fieldEdit.save")}
        saving={savingCore || savingIndustry}
        onConfirm={(meta) => {
          const which = saveDialog;
          setSaveDialog(null);
          if (which === "core") return handleSaveCore(meta);
          if (which === "industry") return handleSaveIndustry(meta);
        }}
      />
    </div>
  );
}

