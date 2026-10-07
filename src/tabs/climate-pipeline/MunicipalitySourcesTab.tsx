import { useEffect, useState } from "react";
import { Loader2, Play, Plus, RefreshCw, ExternalLink, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/ui/button";
import { Modal } from "@/ui/modal";
import { cn } from "@/lib/utils";
import {
  DataTableShell,
  DataTable,
  DataTableHead,
  DataTableBody,
} from "@/ui/data-table";
import { useI18n } from "@/contexts/I18nContext";
import {
  useMunicipalitySources,
  updateMunicipalitySource,
  createMunicipalitySource,
  runMunicipalitySource,
  runMunicipalityRegion,
  type MunicipalitySource,
  type MunicipalitySourceEdit,
} from "@/tabs/climate-pipeline/hooks/useMunicipalitySources";

// Stable regardless of what's currently loaded/filtered, so the dropdown
// always offers every county — including ones with zero rows matching
// the current filter, same reasoning as the swimlane-shows-all-steps
// pattern elsewhere in this app.
const COUNTIES = [
  "Blekinge län",
  "Dalarnas län",
  "Gotlands län",
  "Gävleborgs län",
  "Hallands län",
  "Jämtlands län",
  "Jönköpings län",
  "Kalmar län",
  "Kronobergs län",
  "Norrbottens län",
  "Skåne län",
  "Stockholms län",
  "Södermanlands län",
  "Uppsala län",
  "Värmlands län",
  "Västerbottens län",
  "Västernorrlands län",
  "Västmanlands län",
  "Västra Götalands län",
  "Örebro län",
  "Östergötlands län",
];

/** Plain text + a pencil by default — click either to switch to an actual
 * input/textarea, auto-focused; saves and reverts to plain text on blur,
 * only writing if the value actually changed. Much less visually noisy
 * across ~290 rows than always-on input boxes, same "click to reveal the
 * real control" idea as JsonPreviewCell elsewhere in this app. multiline
 * wraps (break-words, or break-all for url — a url is one long unbroken
 * "word" with no spaces, so ordinary word-wrap has nowhere to break). */
function EditableCell({
  value,
  onSave,
  placeholder,
  type = "text",
  multiline = false,
  breakAll = false,
  className = "",
}: {
  value: string;
  onSave: (next: string) => Promise<void>;
  placeholder?: string;
  type?: "text" | "number";
  multiline?: boolean;
  breakAll?: boolean;
  className?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = () => {
    setDraft(value);
    setIsEditing(true);
  };

  const commit = async () => {
    setIsEditing(false);
    if (draft === value) return;
    setIsSaving(true);
    try {
      await onSave(draft);
    } catch (err) {
      setDraft(value);
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={startEditing}
        disabled={isSaving}
        className={cn(
          "group flex w-full min-w-0 items-start gap-1.5 rounded-md px-1.5 py-1 text-left",
          "hover:bg-gray-04/60",
          className,
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 text-sm",
            value ? "text-gray-01" : "text-gray-02 italic",
            breakAll ? "break-all" : "break-words",
            !multiline && "truncate",
          )}
        >
          {value || placeholder}
        </span>
        {isSaving ? (
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-gray-02 mt-0.5" />
        ) : (
          <Pencil className="h-3 w-3 shrink-0 text-gray-02 opacity-0 group-hover:opacity-100 mt-0.5" />
        )}
      </button>
    );
  }

  const sharedClassName = cn(
    "w-full min-w-0 rounded-md border border-blue-03 bg-gray-04/40 px-2.5 py-2 text-sm text-gray-01",
    "focus:outline-none",
    className,
  );

  return multiline ? (
    <textarea
      autoFocus
      value={draft}
      placeholder={placeholder}
      rows={3}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setDraft(value);
          setIsEditing(false);
        }
      }}
      className={cn(
        sharedClassName,
        "resize-none h-24",
        breakAll ? "break-all" : "break-words",
      )}
    />
  ) : (
    <input
      autoFocus
      type={type}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(value);
          setIsEditing(false);
        }
      }}
      className={cn(sharedClassName, "h-9")}
    />
  );
}

const SOURCE_BADGE: Record<
  MunicipalitySource["source"],
  { labelKey: string; className: string } | null
> = {
  seed: null,
  companion: {
    labelKey: "municipalitySources.sourceCompanion",
    className: "border-purple-03/40 bg-purple-03/10 text-purple-03",
  },
  manual: {
    labelKey: "municipalitySources.sourceManual",
    className: "border-gray-03 bg-gray-03/40 text-gray-02",
  },
};

function MunicipalityRow({
  source,
  showMunicipalityName,
  onChanged,
}: {
  source: MunicipalitySource;
  /** False for every row after the first in a municipality's group — the
   * name only needs to appear once, with the rest distinguished by their
   * own documentTitle underneath it. */
  showMunicipalityName: boolean;
  onChanged: (next: MunicipalitySource) => void;
}) {
  const { t } = useI18n();
  const [isRunning, setIsRunning] = useState(false);
  const hasPlan = Boolean(source.url);
  const badge = SOURCE_BADGE[source.source];

  const save = async (edit: MunicipalitySourceEdit) => {
    const updated = await updateMunicipalitySource(source.id, edit);
    onChanged(updated);
  };

  const handleRun = async () => {
    if (!source.url) return;
    setIsRunning(true);
    try {
      await runMunicipalitySource(source.id, source.url);
      toast.success(
        `Started pipeline for ${source.municipality}${source.documentTitle ? ` (${source.documentTitle})` : ""}`,
      );
      onChanged({ ...source, lastRunAt: new Date().toISOString() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start run");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <tr
      className={cn(
        "border-l-2",
        hasPlan ? "border-l-green-03/50" : "border-l-orange-03/40",
      )}
    >
      <td className="px-3 py-2 text-sm text-gray-01 align-top whitespace-nowrap">
        {showMunicipalityName ? (
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                hasPlan ? "bg-green-03" : "bg-orange-03",
              )}
              title={hasPlan ? "Plan found" : "No plan found yet"}
            />
            {source.municipality}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 pl-3.5">
            <span className="text-gray-03">↳</span>
            <EditableCell
              value={source.documentTitle ?? ""}
              placeholder={t("municipalitySources.untitledDocument")}
              className="text-gray-02"
              onSave={(next) => save({ documentTitle: next || null })}
            />
          </span>
        )}
        {badge && (
          <span
            className={cn(
              "ml-1.5 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
              badge.className,
            )}
          >
            {t(badge.labelKey)}
          </span>
        )}
      </td>
      <td className="px-3 py-2 align-top whitespace-nowrap">
        <span className="inline-flex items-center rounded-full border border-blue-03/30 bg-blue-03/10 px-2 py-0.5 text-[11px] font-medium text-blue-03">
          {source.county.replace(" län", "")}
        </span>
      </td>
      <td className="px-3 py-2 align-top">
        <EditableCell
          value={source.planName ?? ""}
          placeholder="Plan name"
          multiline
          onSave={(next) => save({ planName: next || null })}
        />
      </td>
      <td className="px-3 py-2 align-top">
        <div className="flex items-start gap-1.5">
          <EditableCell
            value={source.url ?? ""}
            placeholder="https://…"
            multiline
            breakAll
            onSave={(next) => save({ url: next.trim() || null })}
          />
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 shrink-0 text-gray-02 hover:text-blue-03"
              title="Open source"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </td>
      <td className="px-3 py-2 align-top">
        <EditableCell
          value={source.adoptedYear?.toString() ?? ""}
          placeholder="Year"
          type="number"
          className="max-w-[5rem]"
          onSave={(next) => save({ adoptedYear: next ? Number(next) : null })}
        />
      </td>
      <td className="px-3 py-2 align-top">
        <EditableCell
          value={source.notes ?? ""}
          placeholder="Notes"
          multiline
          onSave={(next) => save({ notes: next || null })}
        />
      </td>
      <td className="px-3 py-2 text-xs text-gray-02 align-top whitespace-nowrap">
        {source.lastRunAt ? new Date(source.lastRunAt).toLocaleString() : "—"}
      </td>
      <td className="px-3 py-2 align-top">
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!source.url || isRunning}
            onClick={handleRun}
            title={
              source.url ? "Start the pipeline for this url" : "No url set"
            }
            className={cn(
              source.url &&
                "border-green-03/40 text-green-03 hover:bg-green-03/10 hover:border-green-03",
            )}
          >
            {isRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </td>
    </tr>
  );
}

function AddDocumentModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (created: MunicipalitySource) => void;
}) {
  const { t } = useI18n();
  const [municipality, setMunicipality] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [url, setUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setMunicipality("");
    setDocumentTitle("");
    setUrl("");
  };

  const handleSubmit = async () => {
    if (!municipality.trim() || !documentTitle.trim()) return;
    setIsSaving(true);
    try {
      const createdRow = await createMunicipalitySource({
        municipality: municipality.trim(),
        documentTitle: documentTitle.trim(),
        url: url.trim() || null,
      });
      toast.success(
        t("municipalitySources.addSuccess", { documentTitle, municipality }),
      );
      onCreated(createdRow);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("municipalitySources.addError"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={t("municipalitySources.addModalTitle")}
      description={t("municipalitySources.addModalDescription")}
    >
      <div className="space-y-3 mt-2">
        <label className="block text-sm">
          <span className="text-gray-02">
            {t("municipalitySources.addFieldMunicipality")}
          </span>
          <input
            autoFocus
            value={municipality}
            onChange={(e) => setMunicipality(e.target.value)}
            placeholder={t("municipalitySources.addFieldMunicipalityPlaceholder")}
            className="mt-1 w-full h-9 rounded-md border border-gray-03 bg-gray-04/40 px-2.5 text-sm text-gray-01 focus:outline-none focus:border-blue-03"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-02">
            {t("municipalitySources.addFieldDocumentTitle")}
          </span>
          <input
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            placeholder={t("municipalitySources.addFieldDocumentTitlePlaceholder")}
            className="mt-1 w-full h-9 rounded-md border border-gray-03 bg-gray-04/40 px-2.5 text-sm text-gray-01 focus:outline-none focus:border-blue-03"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-02">
            {t("municipalitySources.addFieldUrl")}
          </span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full h-9 rounded-md border border-gray-03 bg-gray-04/40 px-2.5 text-sm text-gray-01 focus:outline-none focus:border-blue-03"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t("municipalitySources.addCancel")}
          </Button>
          <Button
            type="button"
            disabled={!municipality.trim() || !documentTitle.trim() || isSaving}
            onClick={() => void handleSubmit()}
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {t("municipalitySources.addSubmit")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function MunicipalitySourcesTab() {
  const { t } = useI18n();
  const [county, setCounty] = useState("");
  const { sources, isLoading, error, refresh } = useMunicipalitySources(county);
  const [overrides, setOverrides] = useState<Map<string, MunicipalitySource>>(
    new Map(),
  );
  const [created, setCreated] = useState<MunicipalitySource[]>([]);
  const [needsUrlOnly, setNeedsUrlOnly] = useState(false);
  // A stable set of ids, not a live re-check against current url/source —
  // filling in a row's url while this filter is on would otherwise yank
  // the row out of the list mid-edit, which reads as the edit having
  // failed. Recomputed when the filter is turned on, or when `sources`
  // itself changes (a real refetch — county switch, explicit refresh),
  // but not on every inline edit (those only touch `overrides`).
  const [needsUrlSnapshot, setNeedsUrlSnapshot] = useState<Set<
    string
  > | null>(null);
  const [isRunningRegion, setIsRunningRegion] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const needsUrl = (r: MunicipalitySource) => r.source !== "seed" && !r.url;

  useEffect(() => {
    if (!needsUrlOnly) {
      setNeedsUrlSnapshot(null);
      return;
    }
    setNeedsUrlSnapshot(new Set(sources.filter(needsUrl).map((r) => r.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally
    // not depending on `needsUrl` (a fresh function every render) or
    // `overrides`/`created` — see the state comment above.
  }, [needsUrlOnly, sources]);

  const merged = [
    ...sources,
    ...created.filter((c) => !sources.some((s) => s.id === c.id)),
  ];
  let rows = merged.map((s) => overrides.get(s.id) ?? s);
  if (needsUrlSnapshot) {
    rows = rows.filter((r) => needsUrlSnapshot.has(r.id));
  }
  const foundCount = rows.filter((r) => r.url).length;
  // Companion documents almost never have a url yet (someone has to go
  // find it), so in practice this is close to foundCount — but once they
  // do have one, a plain "run all" shouldn't silently sweep them in too;
  // that's a separate, explicit choice (see the two buttons below).
  const primaryFoundCount = rows.filter(
    (r) => r.url && r.source === "seed",
  ).length;
  // Matches the snapshot while the filter is on, so the count next to the
  // checkbox never disagrees with how many rows are actually showing —
  // live otherwise, so toggling it on reflects the true current count.
  const needsUrlCount = needsUrlSnapshot
    ? needsUrlSnapshot.size
    : merged.filter(needsUrl).length;

  const handleChanged = (next: MunicipalitySource) => {
    setOverrides((prev) => new Map(prev).set(next.id, next));
  };

  // Real cost: one real fetch + extraction per municipality with a url,
  // started all at once — confirm with the actual count first, same
  // reasoning as the single-row run but scaled up. includeCompanions
  // decides the subset: the municipality's own plans only, or those plus
  // any companion/manual documents that also have a url.
  const handleRunRegion = async (includeCompanions: boolean) => {
    const toRun = rows.filter(
      (r) => r.url && (includeCompanions || r.source === "seed"),
    );
    if (!county || toRun.length === 0) return;
    const confirmed = window.confirm(
      `Start the pipeline for ${toRun.length} document(s) with a url in ${county}${includeCompanions ? " (including companion documents)" : ""}? This spends real API tokens — ${toRun.length} real runs, not a test.`,
    );
    if (!confirmed) return;

    setIsRunningRegion(true);
    try {
      const result = await runMunicipalityRegion(
        county,
        toRun.map((r) => ({ id: r.id, url: r.url! })),
      );
      toast.success(
        `Started ${result.started.length} run(s) in ${county}` +
          (result.skippedNoUrl.length > 0
            ? ` (${result.skippedNoUrl.length} skipped, no url)`
            : ""),
      );
      const now = new Date().toISOString();
      setOverrides((prev) => {
        const next = new Map(prev);
        for (const started of result.started) {
          const existing = merged.find((s) => s.id === started.id);
          if (existing) next.set(started.id, { ...existing, lastRunAt: now });
        }
        return next;
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start region run",
      );
    } finally {
      setIsRunningRegion(false);
    }
  };

  // Groups consecutive rows sharing a municipality (the list is already
  // sorted by municipality from the API) so the name only renders once
  // per group — every row after the first shows its own documentTitle
  // instead.
  let previousMunicipality: string | null = null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-01">
            {t("municipalitySources.title")}
          </h2>
          <p className="text-sm text-gray-02 mt-1 max-w-2xl">
            {t("municipalitySources.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setIsAddOpen(true)}
            aria-label={t("municipalitySources.addDocument")}
            title={t("municipalitySources.addDocument")}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void refresh()}
            aria-label={t("municipalitySources.refresh")}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-gray-02 flex items-center gap-2">
          {t("municipalitySources.filterCounty")}
          <select
            className="h-9 max-w-[16rem] rounded-md border border-gray-03 bg-gray-04/40 px-2 text-sm text-gray-01"
            value={county}
            onChange={(e) => setCounty(e.target.value)}
          >
            <option value="">{t("municipalitySources.countyAll")}</option>
            {COUNTIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-02">
          <input
            type="checkbox"
            checked={needsUrlOnly}
            onChange={(e) => setNeedsUrlOnly(e.target.checked)}
            className="accent-purple-03"
          />
          {t("municipalitySources.needsUrl", { count: needsUrlCount })}
        </label>
        <span className="text-xs text-gray-02">
          {t("municipalitySources.count", { count: rows.length })}
        </span>
        {rows.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-green-03" />
            <span className="text-green-03">{foundCount} found</span>
            <span className="text-gray-02">·</span>
            <span className="h-1.5 w-1.5 rounded-full bg-orange-03" />
            <span className="text-orange-03">
              {rows.length - foundCount} missing
            </span>
          </span>
        )}
        {county && primaryFoundCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isRunningRegion}
            onClick={() => void handleRunRegion(false)}
            className="max-w-none whitespace-nowrap border-green-03/40 text-green-03 hover:bg-green-03/10 hover:border-green-03"
            title={`Start the pipeline for ${primaryFoundCount} municipality document(s) with a url in ${county} — not their companion documents`}
          >
            {isRunningRegion ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 mr-1.5" />
            )}
            {t("municipalitySources.runRegion", { count: primaryFoundCount })}
          </Button>
        )}
        {county && foundCount > primaryFoundCount && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isRunningRegion}
            onClick={() => void handleRunRegion(true)}
            className="max-w-none whitespace-nowrap border-purple-03/40 text-purple-03 hover:bg-purple-03/10 hover:border-purple-03"
            title={`Start the pipeline for all ${foundCount} documents with a url in ${county}, including companion documents`}
          >
            {isRunningRegion ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 mr-1.5" />
            )}
            {t("municipalitySources.runRegionWithCompanions", { count: foundCount })}
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center p-8">
          <Loader2 className="w-6 h-6 text-blue-03 animate-spin" />
        </div>
      )}
      {error && (
        <p className="text-sm text-pink-03">
          {t("municipalitySources.error", { error })}
        </p>
      )}
      {!isLoading && !error && rows.length === 0 && (
        <p className="text-sm text-gray-02">{t("municipalitySources.empty")}</p>
      )}
      {!isLoading && rows.length > 0 && (
        <DataTableShell>
          <DataTable className="table-fixed w-full min-w-[76rem]">
            <DataTableHead>
              <tr>
                <th className="px-3 py-2 w-[10%]">
                  {t("municipalitySources.colMunicipality")}
                </th>
                <th className="px-3 py-2 w-[9%]">
                  {t("municipalitySources.colCounty")}
                </th>
                <th className="px-3 py-2 w-[15%]">
                  {t("municipalitySources.colPlanName")}
                </th>
                <th className="px-3 py-2 w-[22%]">
                  {t("municipalitySources.colUrl")}
                </th>
                <th className="px-3 py-2 w-[7%]">
                  {t("municipalitySources.colYear")}
                </th>
                <th className="px-3 py-2 w-[18%]">
                  {t("municipalitySources.colNotes")}
                </th>
                <th className="px-3 py-2 w-[11%]">
                  {t("municipalitySources.colLastRun")}
                </th>
                <th className="px-3 py-2 w-[8%] text-center">
                  {t("municipalitySources.colRun")}
                </th>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {rows.map((source) => {
                const showMunicipalityName =
                  source.municipality !== previousMunicipality;
                previousMunicipality = source.municipality;
                return (
                  <MunicipalityRow
                    key={source.id}
                    source={source}
                    showMunicipalityName={showMunicipalityName}
                    onChanged={handleChanged}
                  />
                );
              })}
            </DataTableBody>
          </DataTable>
        </DataTableShell>
      )}

      <AddDocumentModal
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onCreated={(row) => setCreated((prev) => [...prev, row])}
      />
    </div>
  );
}
