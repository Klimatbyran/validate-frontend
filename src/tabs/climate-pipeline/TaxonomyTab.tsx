import { useEffect, useState } from "react";
import {
  Loader2,
  RefreshCw,
  History,
  Pencil,
  Plus,
  X,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";
import {
  useTransitionElementSearch,
  getCurrentTransitionElement,
  getTransitionElementVersions,
  updateTransitionElement,
  createTransitionElement,
  type TransitionElement,
  type TransitionElementSummary,
} from "./hooks/useTransitionElements";
import { resolveQaReviewerForSave } from "./lib/qaReviewerIdentity";

/** Where this element came from before this app ever touched it --
 * independent of version/editedBy, and (unlike relying on description
 * text) survives edits, since both `status` and `handoffBroadened` are
 * carried forward on every PATCH rather than overwritten. */
function seedOriginOf(
  r: Pick<TransitionElementSummary, "status" | "handoffBroadened">,
): "extended" | "broadened" | "original" {
  if (r.status === "shadow") return "extended";
  if (r.handoffBroadened) return "broadened";
  return "original";
}

/** Combines in-app provenance (version/editedBy) with seed-time origin
 * (seedOriginOf) -- an in-app edit always takes top billing (it's the
 * most recent, most relevant fact), but the badge still names what it
 * started as, rather than discarding that once something's been edited. */
function provenanceOf(
  r: Pick<
    TransitionElementSummary,
    "version" | "editedBy" | "status" | "handoffBroadened"
  >,
): { labelKey: string; className: string } {
  const origin = seedOriginOf(r);

  if (r.version > 1) {
    return {
      labelKey:
        origin === "extended"
          ? "taxonomy.provenanceEditedBroadenedFromExtended"
          : origin === "broadened"
            ? "taxonomy.provenanceEditedBroadenedFromBroadened"
            : "taxonomy.provenanceEditedBroadened",
      className: "border-orange-03/40 bg-orange-03/10 text-orange-03",
    };
  }
  if (r.editedBy) {
    return {
      labelKey: "taxonomy.provenanceEditedAdded",
      className: "border-green-03/40 bg-green-03/10 text-green-03",
    };
  }
  if (origin === "extended") {
    return {
      labelKey: "taxonomy.provenanceExtendedTef",
      className: "border-purple-03/40 bg-purple-03/10 text-purple-03",
    };
  }
  if (origin === "broadened") {
    return {
      labelKey: "taxonomy.provenanceBroadenedTef",
      className: "border-blue-03/40 bg-blue-03/10 text-blue-03",
    };
  }
  return {
    labelKey: "taxonomy.provenanceOriginal",
    className: "border-gray-03 bg-gray-03/40 text-gray-02",
  };
}
import {
  TransitionElementEditForm,
  toFormDraft,
  formDraftToFields,
  ACTIVITY_SHIFT_CATEGORIES,
  type TransitionElementFormDraft,
} from "./components/TransitionElementEditForm";

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-gray-02">{label}</span>
      <p className="text-gray-01 whitespace-pre-wrap break-words">
        {value || <span className="text-gray-02 italic">—</span>}
      </p>
    </div>
  );
}

function DetailPanel({
  stableId,
  onSaved,
}: {
  stableId: string;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [current, setCurrent] = useState<TransitionElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<TransitionElementFormDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<TransitionElement[] | null>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setIsEditing(false);
    setShowHistory(false);
    setVersions(null);
    getCurrentTransitionElement(stableId)
      .then(setCurrent)
      .catch((err) =>
        toast.error(
          err instanceof Error ? err.message : "Failed to load element",
        ),
      )
      .finally(() => setIsLoading(false));
  }, [stableId]);

  const startEditing = () => {
    if (!current) return;
    setDraft(toFormDraft(current));
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!draft) return;
    const editedBy = resolveQaReviewerForSave(user);
    if (!editedBy) return;
    setIsSaving(true);
    try {
      const updated = await updateTransitionElement(stableId, {
        ...formDraftToFields(draft),
        editedBy,
      });
      setCurrent(updated);
      setIsEditing(false);
      setVersions(null);
      toast.success(
        `Saved — now version ${updated.version} (version 1 kept as the original)`,
      );
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next && versions === null) {
      setIsLoadingVersions(true);
      getTransitionElementVersions(stableId)
        .then(setVersions)
        .catch((err) =>
          toast.error(
            err instanceof Error ? err.message : "Failed to load history",
          ),
        )
        .finally(() => setIsLoadingVersions(false));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 text-blue-03 animate-spin" />
      </div>
    );
  }
  if (!current) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-01">{current.shortLabel}</h3>
          <p className="text-xs text-gray-02 font-mono">{current.stableId}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center rounded-full border border-blue-03/30 bg-blue-03/10 px-2 py-0.5 text-[11px] font-medium text-blue-03">
            {t("taxonomy.versionBadge", { version: current.version })}
          </span>
          {!isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startEditing}
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              {t("taxonomy.edit")}
            </Button>
          )}
        </div>
      </div>

      {isEditing && draft ? (
        <div className="space-y-3 rounded-[16px] border border-blue-03/30 bg-blue-03/5 p-4">
          <TransitionElementEditForm draft={draft} onChange={setDraft} />
          <p className="text-xs text-gray-02">
            {t("taxonomy.saveNote")}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSaving}
              onClick={() => setIsEditing(false)}
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              {t("taxonomy.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={() => void handleSave()}
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              {t("taxonomy.save")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <ReadOnlyField
            label={t("taxonomy.fieldDescription")}
            value={current.description}
          />
          <ReadOnlyField
            label={t("taxonomy.fieldSectorPath")}
            value={current.sectorPath}
          />
          <ReadOnlyField
            label={t("taxonomy.fieldActsOn")}
            value={current.actsOnLabels.join(", ")}
          />
          <ReadOnlyField
            label={t("taxonomy.fieldShiftsTo")}
            value={current.shiftsToLabels.join(", ")}
          />
          <ReadOnlyField
            label={t("taxonomy.fieldCoBenefits")}
            value={current.coBenefits.join(", ")}
          />
          <div className="grid grid-cols-2 gap-3">
            <ReadOnlyField
              label={t("taxonomy.fieldActivityShiftCategory")}
              value={current.activityShiftCategory ?? ""}
            />
            <ReadOnlyField
              label={t("taxonomy.fieldSustainabilityClass")}
              value={current.sustainabilityClass ?? ""}
            />
          </div>
        </div>
      )}

      <div className="border-t border-gray-03/50 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleHistory}
          className="h-7 px-2 text-xs text-blue-03 hover:text-blue-04 hover:bg-blue-03/10"
        >
          <History className="w-3.5 h-3.5 mr-1.5" />
          {showHistory ? t("taxonomy.hideHistory") : t("taxonomy.showHistory")}
        </Button>
        {showHistory && (
          <div className="mt-2 space-y-1.5">
            {isLoadingVersions ? (
              <Loader2 className="w-4 h-4 text-blue-03 animate-spin" />
            ) : (
              versions?.map((v) => (
                <div
                  key={v.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-xs",
                    v.isCurrent ? "bg-blue-03/10" : "bg-gray-04/40",
                  )}
                >
                  <span className="text-gray-01 font-medium">
                    {v.version === 1
                      ? t("taxonomy.original")
                      : t("taxonomy.versionBadge", { version: v.version })}
                  </span>
                  <span className="text-gray-02">
                    {new Date(v.createdAt).toLocaleString()}
                  </span>
                  <span className="text-gray-02 truncate">
                    {v.editedBy ?? t("taxonomy.seeded")}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Mirrors the shadow-taxonomy "Create new real element" form, but
 * starting from a blank slate instead of a shadow element's own fields --
 * for adding a genuinely new taxonomy entry that has nothing to do with
 * any shadow-element review. */
function CreatePanel({
  onCreated,
  onCancel,
}: {
  onCreated: (stableId: string) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [draft, setDraft] = useState<TransitionElementFormDraft>(
    toFormDraft({
      shortLabel: "",
      description: "",
      sectorId: null,
      sectorPath: "",
      actsOnLabels: [],
      shiftsToLabels: [],
      coBenefits: [],
      sustainabilityClass: null,
    }),
  );
  const [category, setCategory] = useState<string>(
    ACTIVITY_SHIFT_CATEGORIES[0],
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!draft.shortLabel.trim() || !draft.description.trim()) {
      toast.error(t("taxonomy.createRequiredFields"));
      return;
    }
    const editedBy = resolveQaReviewerForSave(user);
    if (!editedBy) return;
    setIsSaving(true);
    try {
      const created = await createTransitionElement({
        ...formDraftToFields(draft),
        activityShiftCategory: category,
        editedBy,
      });
      toast.success(t("taxonomy.createSuccess", { stableId: created.stableId }));
      onCreated(created.stableId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-gray-01">{t("taxonomy.createTitle")}</h3>
      <label className="block text-sm">
        <span className="text-gray-02">
          {t("taxonomy.fieldActivityShiftCategory")}
        </span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 w-full h-9 rounded-md border border-blue-03 bg-gray-04/40 px-2.5 text-sm text-gray-01 focus:outline-none"
        >
          {ACTIVITY_SHIFT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <TransitionElementEditForm draft={draft} onChange={setDraft} />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isSaving}
          onClick={onCancel}
        >
          <X className="w-3.5 h-3.5 mr-1.5" />
          {t("taxonomy.cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isSaving}
          onClick={() => void handleSave()}
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5 mr-1.5" />
          )}
          {t("taxonomy.save")}
        </Button>
      </div>
    </div>
  );
}

export function TaxonomyTab() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedStableId, setSelectedStableId] = useState<string | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { results, isLoading, error, refresh } =
    useTransitionElementSearch(debouncedQuery);

  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-01">
            {t("taxonomy.title")}
          </h2>
          <p className="text-sm text-gray-02 mt-1 max-w-2xl">
            {t("taxonomy.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-w-none whitespace-nowrap"
            onClick={() => {
              setIsCreating(true);
              setSelectedStableId(null);
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            {t("taxonomy.createNew")}
          </Button>
          <button
            onClick={refresh}
            className="p-2 rounded-full hover:bg-gray-03/40 text-gray-02"
            aria-label={t("taxonomy.refresh")}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("taxonomy.searchPlaceholder")}
        className="h-10 w-full max-w-md rounded-md border border-gray-03 bg-gray-04/40 px-3 text-sm text-gray-01 focus:outline-none focus:border-blue-03"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-4 items-start">
        <div className="space-y-1.5">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 text-blue-03 animate-spin" />
            </div>
          ) : error ? (
            <p className="text-sm text-pink-03">{error}</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-gray-02">{t("taxonomy.noResults")}</p>
          ) : (
            results.map((r) => {
              const provenance = provenanceOf(r);
              return (
                <button
                  key={r.stableId}
                  onClick={() => setSelectedStableId(r.stableId)}
                  className={cn(
                    "w-full text-left rounded-[14px] border px-3 py-2 transition-colors",
                    selectedStableId === r.stableId
                      ? "border-blue-03 bg-blue-03/10"
                      : "border-gray-03/60 hover:bg-gray-04/60",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-01 truncate">
                      {r.shortLabel}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                        provenance.className,
                      )}
                    >
                      {t(provenance.labelKey, { version: r.version })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-02 truncate">
                    {r.sectorPath}
                  </p>
                </button>
              );
            })
          )}
        </div>

        <div className="rounded-[20px] border border-gray-03/50 bg-gray-05/40 p-4 min-h-[16rem]">
          {isCreating ? (
            <CreatePanel
              onCancel={() => setIsCreating(false)}
              onCreated={(stableId) => {
                setIsCreating(false);
                setSelectedStableId(stableId);
                refresh();
              }}
            />
          ) : selectedStableId ? (
            <DetailPanel
              key={selectedStableId}
              stableId={selectedStableId}
              onSaved={refresh}
            />
          ) : (
            <p className="text-sm text-gray-02">
              {t("taxonomy.selectPrompt")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
