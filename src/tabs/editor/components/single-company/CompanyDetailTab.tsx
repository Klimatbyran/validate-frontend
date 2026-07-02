import { useEffect, useMemo, useState } from "react";
import { Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { Modal } from "@/ui/modal";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { GicsTreeSelect } from "@/ui/gics-tree-select";
import {
  deleteCompany,
  fetchIndustryGics,
  updateCompany,
  updateCompanyBaseYear,
  updateCompanyIndustry,
  type IndustryGicsOption,
} from "../../lib/companies-api";
import {
  WIKIDATA_ID_REGEX,
  type GarboCompanyDetail,
  type TagOption,
} from "../../lib/types";
import {
  displayBaseYear,
  getDescriptionByLang,
  inputClassName,
} from "../../lib/company-edit-utils";
import { buildTagLabelBySlug } from "../../lib/editor-tag-and-payload-utils";
import { editorPrimaryActionButtonClass } from "../../lib/editor-button-classes";
import {
  leiFromIdentifiers,
  wikidataFromIdentifiers,
} from "../../lib/company-identifiers";
import { CompanyIdentifiersList } from "./CompanyIdentifiersList";
import { ReviewerMetadataDialog } from "../ReviewerMetadataDialog";

export function CompanyDetailTab({
  company,
  tagOptions,
  onSaved,
  onDeleted,
}: {
  company: GarboCompanyDetail;
  tagOptions: TagOption[];
  onSaved?: () => void;
  onDeleted?: () => void;
}) {
  const { t } = useI18n();
  const dash = t("common.placeholderDash");
  const tagLabelBySlug = useMemo(
    () => buildTagLabelBySlug(tagOptions),
    [tagOptions],
  );

  const [name, setName] = useState(company.name ?? "");
  const [descriptionEn, setDescriptionEn] = useState(() =>
    getDescriptionByLang(company, "EN"),
  );
  const [descriptionSv, setDescriptionSv] = useState(() =>
    getDescriptionByLang(company, "SV"),
  );
  const [wikidataId, setWikidataId] = useState(
    () => wikidataFromIdentifiers(company) ?? "",
  );
  const [lei, setLei] = useState(() => leiFromIdentifiers(company) ?? "");
  const [url, setUrl] = useState(company.url ?? "");
  const [internalComment, setInternalComment] = useState(
    company.internalComment ?? "",
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    company.tags ?? [],
  );

  const [subIndustryCode, setSubIndustryCode] = useState(
    company.industry?.subIndustryCode ?? "",
  );
  const [baseYear, setBaseYear] = useState(() =>
    displayBaseYear(company.baseYear, dash),
  );

  const [industryOptions, setIndustryOptions] = useState<IndustryGicsOption[]>(
    [],
  );
  const [industryOptionsLoading, setIndustryOptionsLoading] = useState(false);
  const [savingCore, setSavingCore] = useState(false);
  const [savingIndustry, setSavingIndustry] = useState(false);
  const [saveDialog, setSaveDialog] = useState<null | "core" | "industry">(
    null,
  );
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState(false);

  useEffect(() => {
    setName(company.name ?? "");
    setDescriptionEn(getDescriptionByLang(company, "EN"));
    setDescriptionSv(getDescriptionByLang(company, "SV"));
    setWikidataId(wikidataFromIdentifiers(company) ?? "");
    setLei(leiFromIdentifiers(company) ?? "");
    setUrl(company.url ?? "");
    setInternalComment(company.internalComment ?? "");
    setSelectedTags(company.tags ?? []);
    setSubIndustryCode(company.industry?.subIndustryCode ?? "");
    setBaseYear(displayBaseYear(company.baseYear, dash));
  }, [
    company.id,
    company.name,
    company.identifiers,
    company.url,
    company.internalComment,
    company.tags,
    company.industry?.subIndustryCode,
    company.baseYear,
    company.descriptions,
    dash,
  ]);

  useEffect(() => {
    setIndustryOptionsLoading(true);
    fetchIndustryGics()
      .then(setIndustryOptions)
      .catch((e) => {
        setIndustryOptions([]);
        toast.error(
          e instanceof Error
            ? e.message
            : t("editor.singleCompanyView.loadError"),
        );
      })
      .finally(() => setIndustryOptionsLoading(false));
  }, []);

  const handleSaveCore = async (meta?: {
    comment?: string;
    source?: string;
  }) => {
    const trimmedWikidataId = wikidataId.trim();
    if (trimmedWikidataId && !WIKIDATA_ID_REGEX.test(trimmedWikidataId)) {
      toast.error(t("wikidata.invalidFormat"));
      return;
    }

    setSavingCore(true);
    try {
      await updateCompany(company.id, {
        wikidataId: trimmedWikidataId || undefined,
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
            ? {
                comment: meta.comment?.trim() || undefined,
                source: meta.source?.trim() || undefined,
              }
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

  const handleSaveIndustry = async (meta?: {
    comment?: string;
    source?: string;
  }) => {
    const by = baseYear.trim() ? parseInt(baseYear, 10) : undefined;
    if (by != null && (isNaN(by) || by < 1990 || by > 2100)) {
      toast.error(t("editor.singleCompanyView.invalidBaseYear"));
      return;
    }
    setSavingIndustry(true);
    try {
      if (subIndustryCode) {
        await updateCompanyIndustry(company.id, {
          industry: { subIndustryCode },
          metadata:
            meta?.comment?.trim() || meta?.source?.trim()
              ? {
                  comment: meta.comment?.trim() || undefined,
                  source: meta.source?.trim() || undefined,
                }
              : undefined,
        });
      }
      if (by != null) {
        await updateCompanyBaseYear(company.id, {
          baseYear: by,
          metadata:
            meta?.comment?.trim() || meta?.source?.trim()
              ? {
                  comment: meta.comment?.trim() || undefined,
                  source: meta.source?.trim() || undefined,
                }
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

  const selectedIndustry = useMemo(
    () => industryOptions.find((o) => o.code === subIndustryCode) ?? null,
    [industryOptions, subIndustryCode],
  );

  const handleDeleteCompany = async () => {
    setDeletingCompany(true);
    try {
      await deleteCompany(company.id);
      toast.success(t("editor.singleCompanyView.deleteCompany.deleted"));
      setDeleteModalOpen(false);
      onDeleted?.();
    } catch (e) {
      toast.error(
        t("editor.singleCompanyView.deleteCompany.failed", {
          message: e instanceof Error ? e.message : String(e),
        }),
      );
    } finally {
      setDeletingCompany(false);
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
                  className={
                    inputClassName + " resize-y !max-w-none min-h-[11rem]"
                  }
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
                  className={
                    inputClassName + " resize-y !max-w-none min-h-[11rem]"
                  }
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
              {company.identifiers && company.identifiers.length > 0 ? (
                <CompanyIdentifiersList identifiers={company.identifiers} />
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-01 mb-1">
                    {t("editor.companyDetail.wikidataId")}
                  </label>
                  <input
                    type="text"
                    value={wikidataId}
                    onChange={(e) => setWikidataId(e.target.value)}
                    placeholder={t("wikidata.placeholder")}
                    className={inputClassName + " !max-w-none"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-01 mb-1">
                    {t("editor.companyDetail.internalId")}
                  </label>
                  <input
                    type="text"
                    value={company.id}
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
          onClick={() => setSaveDialog("core")}
          disabled={savingCore}
          className={`mt-4 ${editorPrimaryActionButtonClass}`}
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
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-[7rem_minmax(12rem,1fr)_auto] gap-4 items-end">
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
                className={
                  inputClassName + " w-full !max-w-none !h-8 !text-xs px-3"
                }
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-02 mb-1">
                {t("editor.singleCompanyView.fields.gicsSubIndustry")}
              </label>
              <GicsTreeSelect
                options={industryOptions}
                value={subIndustryCode}
                onChange={setSubIndustryCode}
                placeholder={t("editor.singleCompanyView.selectIndustry")}
                emptyLabel={t("editor.singleCompanyView.noIndustry")}
                searchPlaceholder={t("common.search")}
                loading={industryOptionsLoading}
                loadingLabel={t("common.loading")}
                triggerClassName="w-full !justify-between !h-8 !text-xs px-3"
              />
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setSaveDialog("industry")}
              disabled={savingIndustry}
              className={editorPrimaryActionButtonClass}
            >
              {savingIndustry && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {t("editor.fieldEdit.save")}
            </Button>
          </div>

          {selectedIndustry && (
            <div className="text-[11px] text-gray-02 max-w-[520px] leading-snug">
              <span className="font-medium text-gray-02">
                {selectedIndustry.sector ?? "—"}
              </span>{" "}
              &gt;{" "}
              <span className="font-medium text-gray-02">
                {selectedIndustry.group ?? "—"}
              </span>{" "}
              &gt;{" "}
              <span className="font-medium text-gray-02">
                {selectedIndustry.industry ?? "—"}
              </span>{" "}
              &gt;{" "}
              <span className="font-medium text-gray-02">
                {
                  (selectedIndustry.subIndustryName ??
                    selectedIndustry.label ??
                    selectedIndustry.code) as string
                }
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-red-500/30 bg-gray-04/80 p-4">
        <h3 className="text-sm font-semibold text-red-500 mb-2">
          {t("editor.singleCompanyView.deleteCompany.sectionTitle")}
        </h3>
        <p className="text-sm text-gray-02 mb-4">
          {t("editor.singleCompanyView.deleteCompany.sectionHint")}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="bg-red-500 text-white hover:bg-red-500/90 active:bg-red-500/80"
          onClick={() => setDeleteModalOpen(true)}
          disabled={deletingCompany}
        >
          {deletingCompany && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {t("editor.singleCompanyView.deleteCompany.button")}
        </Button>
      </section>

      <Modal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        size="md"
        title={t("editor.singleCompanyView.deleteCompany.title")}
        description={t("editor.singleCompanyView.deleteCompany.description", {
          name: company.name ?? company.id,
          wikidataId: wikidataFromIdentifiers(company) ?? t("common.placeholderDash"),
        })}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deletingCompany}
            >
              {t("editor.singleCompanyView.deleteCompany.cancel")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="bg-red-500 text-white hover:bg-red-500/90 active:bg-red-500/80"
              onClick={() => void handleDeleteCompany()}
              disabled={deletingCompany}
            >
              {deletingCompany
                ? t("editor.singleCompanyView.deleteCompany.deleting")
                : t("editor.singleCompanyView.deleteCompany.confirm")}
            </Button>
          </>
        }
      />

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
