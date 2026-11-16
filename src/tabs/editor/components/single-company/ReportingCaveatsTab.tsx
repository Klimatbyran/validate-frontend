import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import type { GarboCompanyDetail } from "../../lib/types";
import { inputClassName } from "../../lib/company-edit-utils";
import {
  REPORTING_CAVEAT_TYPES,
  EMISSIONS_SCOPE_KEYS,
  createReportingCaveat,
  updateReportingCaveat,
  deleteReportingCaveat,
  type ReportingCaveat,
  type ReportingCaveatType,
  type EmissionsScopeKey,
  type ReportingCaveatImpact,
} from "../../lib/reporting-caveats-api";

type QuoteDraft = {
  originalQuote: string;
  sourceReference: string;
};

type FormState = {
  type: ReportingCaveatType;
  description: string;
  effectiveYear: string;
  affectedYears: string;
  affectedScopes: EmissionsScopeKey[];
  counterpartyName: string;
  counterpartyCompanyId: string;
  reportId: string;
  source: string;
  impactDirection: "" | ReportingCaveatImpact;
  quotes: QuoteDraft[];
  verified: boolean;
  metadataSource: string;
  metadataComment: string;
};

const emptyForm = (): FormState => ({
  type: "OTHER",
  description: "",
  effectiveYear: "",
  affectedYears: "",
  affectedScopes: [],
  counterpartyName: "",
  counterpartyCompanyId: "",
  reportId: "",
  source: "",
  impactDirection: "",
  quotes: [{ originalQuote: "", sourceReference: "" }],
  verified: false,
  metadataSource: "",
  metadataComment: "",
});

function caveatToForm(c: ReportingCaveat): FormState {
  return {
    type: (REPORTING_CAVEAT_TYPES.includes(c.type as ReportingCaveatType)
      ? c.type
      : "OTHER") as ReportingCaveatType,
    description: c.description ?? "",
    effectiveYear: c.effectiveYear ?? "",
    affectedYears: (c.affectedYears ?? []).join(", "),
    affectedScopes: (c.affectedScopes ?? []).filter(
      (s): s is EmissionsScopeKey =>
        (EMISSIONS_SCOPE_KEYS as readonly string[]).includes(s),
    ),
    counterpartyName: c.counterpartyName ?? "",
    counterpartyCompanyId: c.counterpartyCompanyId ?? "",
    reportId: c.reportId ?? "",
    source: c.source ?? "",
    impactDirection: (c.impactDirection as ReportingCaveatImpact) || "",
    quotes: c.quotes?.length
      ? c.quotes.map((q) => ({
          originalQuote: q.originalQuote,
          sourceReference: q.sourceReference ?? "",
        }))
      : [{ originalQuote: "", sourceReference: "" }],
    verified: Boolean(
      c.metadata &&
        typeof c.metadata === "object" &&
        "verifiedBy" in c.metadata &&
        (c.metadata as { verifiedBy?: unknown }).verifiedBy,
    ),
    metadataSource: c.metadata?.source ?? "",
    metadataComment: c.metadata?.comment ?? "",
  };
}

function parseYears(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((y) => y.trim())
    .filter(Boolean);
}

export function ReportingCaveatsTab({
  company,
  onSaved,
}: {
  company: GarboCompanyDetail;
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const caveats = useMemo(
    () => (company.reportingCaveats ?? []) as ReportingCaveat[],
    [company.reportingCaveats],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);

  function startCreate() {
    setEditingId(null);
    setCreating(true);
    setForm(emptyForm());
  }

  function startEdit(c: ReportingCaveat) {
    setCreating(false);
    setEditingId(c.id);
    setForm(caveatToForm(c));
  }

  function cancelForm() {
    setCreating(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  async function save() {
    if (!form.description.trim()) {
      toast.error(t("editor.singleCompanyView.caveats.validationDescription"));
      return;
    }
    const quotes = form.quotes
      .map((q, i) => ({
        originalQuote: q.originalQuote.trim(),
        sourceReference: q.sourceReference.trim() || null,
        sortOrder: i,
      }))
      .filter((q) => q.originalQuote.length > 0);

    const body = {
      caveat: {
        type: form.type,
        description: form.description.trim(),
        effectiveYear: form.effectiveYear.trim() || null,
        affectedYears: parseYears(form.affectedYears),
        affectedScopes: form.affectedScopes,
        counterpartyName: form.counterpartyName.trim() || null,
        counterpartyCompanyId: form.counterpartyCompanyId.trim() || null,
        reportId: form.reportId.trim() || null,
        source: form.source.trim() || null,
        impactDirection: form.impactDirection || null,
        quotes,
      },
      verified: form.verified,
      metadata: {
        source: form.metadataSource.trim() || undefined,
        comment: form.metadataComment.trim() || undefined,
      },
    };

    setBusy(true);
    try {
      if (editingId) {
        await updateReportingCaveat(company.id, editingId, body);
        toast.success(t("editor.singleCompanyView.caveats.updated"));
      } else {
        await createReportingCaveat(company.id, body);
        toast.success(t("editor.singleCompanyView.caveats.created"));
      }
      cancelForm();
      onSaved?.();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("editor.singleCompanyView.caveats.saveFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t("editor.singleCompanyView.caveats.confirmDelete"))) {
      return;
    }
    setBusy(true);
    try {
      await deleteReportingCaveat(id);
      toast.success(t("editor.singleCompanyView.caveats.deleted"));
      if (editingId === id) cancelForm();
      onSaved?.();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("editor.singleCompanyView.caveats.deleteFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  const showForm = creating || editingId !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-02 max-w-2xl">
          {t("editor.singleCompanyView.caveats.intro")}
        </p>
        {!showForm ? (
          <Button type="button" onClick={startCreate} disabled={busy}>
            {t("editor.singleCompanyView.caveats.add")}
          </Button>
        ) : null}
      </div>

      {showForm ? (
        <section className="rounded-lg border border-gray-03 bg-gray-04/80 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-01">
            {editingId
              ? t("editor.singleCompanyView.caveats.editTitle")
              : t("editor.singleCompanyView.caveats.createTitle")}
          </h3>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-01 mb-1">
                {t("editor.singleCompanyView.caveats.fields.type")}
              </label>
              <SingleSelectDropdown
                options={[...REPORTING_CAVEAT_TYPES]}
                value={form.type}
                onChange={(v) =>
                  setForm((p) => ({ ...p, type: v as ReportingCaveatType }))
                }
                placeholder="Type"
                ariaLabel={t("editor.singleCompanyView.caveats.fields.type")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-01 mb-1">
                {t("editor.singleCompanyView.caveats.fields.effectiveYear")}
              </label>
              <input
                type="text"
                value={form.effectiveYear}
                onChange={(e) =>
                  setForm((p) => ({ ...p, effectiveYear: e.target.value }))
                }
                placeholder="2023"
                className={inputClassName + " !max-w-none"}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-01 mb-1">
              {t("editor.singleCompanyView.caveats.fields.description")}
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              rows={3}
              className={inputClassName + " resize-y !max-w-none"}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-01 mb-1">
                {t("editor.singleCompanyView.caveats.fields.affectedYears")}
              </label>
              <input
                type="text"
                value={form.affectedYears}
                onChange={(e) =>
                  setForm((p) => ({ ...p, affectedYears: e.target.value }))
                }
                placeholder="2022, 2023"
                className={inputClassName + " !max-w-none"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-01 mb-1">
                {t("editor.singleCompanyView.caveats.fields.impactDirection")}
              </label>
              <SingleSelectDropdown
                options={["", "INCREASE", "DECREASE", "MIXED"]}
                value={form.impactDirection}
                onChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    impactDirection: v as "" | ReportingCaveatImpact,
                  }))
                }
                placeholder="—"
                getOptionLabel={(v) => (v ? v : "—")}
                ariaLabel={t(
                  "editor.singleCompanyView.caveats.fields.impactDirection",
                )}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-01 mb-1">
              {t("editor.singleCompanyView.caveats.fields.affectedScopes")}
            </label>
            <MultiSelectDropdown
              options={[...EMISSIONS_SCOPE_KEYS]}
              selectedIds={form.affectedScopes}
              onChange={(ids) =>
                setForm((p) => ({
                  ...p,
                  affectedScopes: ids as EmissionsScopeKey[],
                }))
              }
              triggerLabel={
                form.affectedScopes.length
                  ? form.affectedScopes.join(", ")
                  : t("editor.singleCompanyView.caveats.fields.affectedScopes")
              }
              ariaLabel={t(
                "editor.singleCompanyView.caveats.fields.affectedScopes",
              )}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-01 mb-1">
                {t("editor.singleCompanyView.caveats.fields.counterpartyName")}
              </label>
              <input
                type="text"
                value={form.counterpartyName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, counterpartyName: e.target.value }))
                }
                className={inputClassName + " !max-w-none"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-01 mb-1">
                {t(
                  "editor.singleCompanyView.caveats.fields.counterpartyCompanyId",
                )}
              </label>
              <input
                type="text"
                value={form.counterpartyCompanyId}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    counterpartyCompanyId: e.target.value,
                  }))
                }
                placeholder={t(
                  "editor.singleCompanyView.caveats.fields.counterpartyCompanyIdHint",
                )}
                className={inputClassName + " !max-w-none"}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-01 mb-1">
                {t("editor.singleCompanyView.caveats.fields.reportId")}
              </label>
              <input
                type="text"
                value={form.reportId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, reportId: e.target.value }))
                }
                className={inputClassName + " !max-w-none"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-01 mb-1">
                {t("editor.singleCompanyView.caveats.fields.source")}
              </label>
              <input
                type="text"
                value={form.source}
                onChange={(e) =>
                  setForm((p) => ({ ...p, source: e.target.value }))
                }
                placeholder="https://…"
                className={inputClassName + " !max-w-none"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-01">
                {t("editor.singleCompanyView.caveats.fields.quotes")}
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    quotes: [
                      ...p.quotes,
                      { originalQuote: "", sourceReference: "" },
                    ],
                  }))
                }
              >
                {t("editor.singleCompanyView.caveats.addQuote")}
              </Button>
            </div>
            {form.quotes.map((q, index) => (
              <div
                key={index}
                className="rounded-md border border-gray-03 p-3 space-y-2"
              >
                <textarea
                  value={q.originalQuote}
                  onChange={(e) =>
                    setForm((p) => {
                      const quotes = [...p.quotes];
                      quotes[index] = {
                        ...quotes[index],
                        originalQuote: e.target.value,
                      };
                      return { ...p, quotes };
                    })
                  }
                  placeholder={t(
                    "editor.singleCompanyView.caveats.fields.originalQuote",
                  )}
                  rows={2}
                  className={inputClassName + " resize-y !max-w-none"}
                />
                <input
                  type="text"
                  value={q.sourceReference}
                  onChange={(e) =>
                    setForm((p) => {
                      const quotes = [...p.quotes];
                      quotes[index] = {
                        ...quotes[index],
                        sourceReference: e.target.value,
                      };
                      return { ...p, quotes };
                    })
                  }
                  placeholder="p. 42"
                  className={inputClassName + " !max-w-none"}
                />
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-01 mb-1">
                {t("editor.singleCompanyView.caveats.fields.metadataSource")}
              </label>
              <input
                type="text"
                value={form.metadataSource}
                onChange={(e) =>
                  setForm((p) => ({ ...p, metadataSource: e.target.value }))
                }
                className={inputClassName + " !max-w-none"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-01 mb-1">
                {t("editor.singleCompanyView.caveats.fields.metadataComment")}
              </label>
              <input
                type="text"
                value={form.metadataComment}
                onChange={(e) =>
                  setForm((p) => ({ ...p, metadataComment: e.target.value }))
                }
                className={inputClassName + " !max-w-none"}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-01">
            <input
              type="checkbox"
              checked={form.verified}
              onChange={(e) =>
                setForm((p) => ({ ...p, verified: e.target.checked }))
              }
            />
            {t("editor.singleCompanyView.caveats.fields.verified")}
          </label>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={save} disabled={busy}>
              {t("editor.singleCompanyView.caveats.save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={cancelForm}
              disabled={busy}
            >
              {t("editor.singleCompanyView.caveats.cancel")}
            </Button>
          </div>
        </section>
      ) : null}

      {caveats.length ? (
        <ul className="space-y-3">
          {caveats.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-gray-03 bg-gray-04/80 p-4 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-02">
                    {c.type}
                    {c.effectiveYear ? ` · ${c.effectiveYear}` : ""}
                  </p>
                  <p className="text-sm text-gray-01 mt-1">{c.description}</p>
                  {c.quotes?.[0]?.originalQuote ? (
                    <p className="text-xs text-gray-02 mt-2 italic">
                      “{c.quotes[0].originalQuote}”
                      {(c.quotes.length ?? 0) > 1
                        ? ` (+${(c.quotes.length ?? 1) - 1})`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(c)}
                    disabled={busy}
                  >
                    {t("editor.singleCompanyView.caveats.edit")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(c.id)}
                    disabled={busy}
                  >
                    {t("editor.singleCompanyView.caveats.delete")}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : !showForm ? (
        <section className="rounded-lg border border-gray-03 bg-gray-04/80 p-4">
          <p className="text-sm text-gray-02">
            {t("editor.singleCompanyView.caveats.empty")}
          </p>
        </section>
      ) : null}
    </div>
  );
}
