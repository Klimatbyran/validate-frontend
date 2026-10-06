import { useState } from "react";
import { Loader2, Play, RefreshCw, ExternalLink, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/ui/button";
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

function MunicipalityRow({
  source,
  onChanged,
}: {
  source: MunicipalitySource;
  onChanged: (next: MunicipalitySource) => void;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const hasPlan = Boolean(source.url);

  const save = async (edit: MunicipalitySourceEdit) => {
    const updated = await updateMunicipalitySource(source.id, edit);
    onChanged(updated);
  };

  const handleRun = async () => {
    if (!source.url) return;
    setIsRunning(true);
    try {
      await runMunicipalitySource(source.id, source.url);
      toast.success(`Started pipeline for ${source.municipality}`);
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
            onSave={(next) => save({ url: next || null })}
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
          onSave={(next) =>
            save({ adoptedYear: next ? Number(next) : null })
          }
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
        {source.lastRunAt
          ? new Date(source.lastRunAt).toLocaleString()
          : "—"}
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

export function MunicipalitySourcesTab() {
  const { t } = useI18n();
  const [county, setCounty] = useState("");
  const { sources, isLoading, error, refresh } = useMunicipalitySources(county);
  const [overrides, setOverrides] = useState<Map<string, MunicipalitySource>>(
    new Map(),
  );
  const [isRunningRegion, setIsRunningRegion] = useState(false);

  const rows = sources.map((s) => overrides.get(s.id) ?? s);
  const foundCount = rows.filter((r) => r.url).length;

  const handleChanged = (next: MunicipalitySource) => {
    setOverrides((prev) => new Map(prev).set(next.id, next));
  };

  // Real cost: one real fetch + extraction per municipality with a url,
  // started all at once — confirm with the actual count first, same
  // reasoning as the single-row run but scaled up.
  const handleRunRegion = async () => {
    if (!county || foundCount === 0) return;
    const confirmed = window.confirm(
      `Start the pipeline for all ${foundCount} municipalities with a url in ${county}? This spends real API tokens — ${foundCount} real runs, not a test.`,
    );
    if (!confirmed) return;

    setIsRunningRegion(true);
    try {
      const urls = rows.filter((r) => r.url).map((r) => r.url!);
      const result = await runMunicipalityRegion(county, urls);
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
          const existing = sources.find((s) => s.id === started.id);
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
        {county && foundCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isRunningRegion}
            onClick={() => void handleRunRegion()}
            className="border-green-03/40 text-green-03 hover:bg-green-03/10 hover:border-green-03"
            title={`Start the pipeline for all ${foundCount} municipalities with a url in ${county}`}
          >
            {isRunningRegion ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 mr-1.5" />
            )}
            {t("municipalitySources.runRegion", { count: foundCount })}
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
        <p className="text-sm text-gray-02">
          {t("municipalitySources.empty")}
        </p>
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
              {rows.map((source) => (
                <MunicipalityRow
                  key={source.id}
                  source={source}
                  onChanged={handleChanged}
                />
              ))}
            </DataTableBody>
          </DataTable>
        </DataTableShell>
      )}
    </div>
  );
}
