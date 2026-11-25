import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/ui/dialog";
import {
  fetchRebuildPreview,
  startRebuild,
  resumeRebuild,
  type RebuildPreview,
  type RebuildRun,
  type RematchOutcome,
} from "../hooks/useShadowRebuild";

function defaultLabel() {
  const today = new Date().toISOString().slice(0, 10);
  return `before shadow rebuild ${today}`;
}

/** Confirm dialog for "snapshot -> delete all shadow elements -> rematch". */
export function ShadowRebuildDialog({
  open,
  onOpenChange,
  onStarted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStarted: (run: RebuildRun) => void;
}) {
  const [preview, setPreview] = useState<RebuildPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [label, setLabel] = useState(defaultLabel);
  const [includeReattached, setIncludeReattached] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setPreviewError(null);
    setLabel(defaultLabel());
    fetchRebuildPreview()
      .then(setPreview)
      .catch((err) =>
        setPreviewError(err instanceof Error ? err.message : String(err)),
      );
  }, [open]);

  const total = preview
    ? preview.attachedShifts +
      (includeReattached ? preview.reattachedShifts : 0)
    : 0;

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const run = await startRebuild({
        label: label.trim() || undefined,
        includeReattached,
      });
      toast.success("Snapshot taken. Rebuild started.");
      onStarted(run);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start rebuild",
      );
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Rebuild shadow taxonomy</DialogTitle>
          <DialogDescription>
            Takes a snapshot, deletes every shadow element, then rematches their
            commitments against the current TEF. Shadow elements are only
            recreated where the TEF still has a real gap.
          </DialogDescription>
        </DialogHeader>

        {previewError && <p className="text-sm text-pink-03">{previewError}</p>}
        {!preview && !previewError && (
          <div className="flex items-center gap-2 text-sm text-gray-02 py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Counting…
          </div>
        )}

        {preview && (
          <div className="space-y-4 text-sm">
            <div className="rounded-md border border-pink-03/30 bg-pink-03/5 p-3 space-y-1">
              <p className="flex items-center gap-1.5 font-medium text-pink-03">
                <AlertTriangle className="w-4 h-4" />
                Deletes all {preview.shadowElements.total} shadow elements
              </p>
              <p className="text-xs text-gray-02">
                {preview.shadowElements.promoted} promoted ·{" "}
                {preview.shadowElements.preliminary} preliminary ·{" "}
                {preview.shadowElements.rejected} rejected ·{" "}
                {preview.shadowElements.merged} merged ·{" "}
                {preview.shadowElements.withComment} with a comment. Statuses
                and comments are kept in the snapshot and shown in the rematch
                report. They aren't copied onto the new elements.
              </p>
            </div>

            <p className="text-gray-01">
              Rematches <strong>{total}</strong> commitments across{" "}
              {preview.planCount} plans.
            </p>

            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={includeReattached}
                onChange={(e) => setIncludeReattached(e.target.checked)}
              />
              <span>
                Also rematch the {preview.reattachedShifts} commitments a
                reviewer reattached to a real TEF
                <span className="block text-xs text-gray-02">
                  Their manual choice is replaced by the new matching result. It
                  stays in the snapshot.
                </span>
              </span>
            </label>
            <p className="text-xs text-gray-02">
              {preview.notACommitmentShifts} commitments marked “not a
              commitment” are left alone.
            </p>

            <label className="block space-y-1">
              <span className="text-xs text-gray-02">Snapshot label</span>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="h-9 w-full rounded-md border border-gray-03 bg-gray-04/40 px-2.5 text-sm text-gray-01 focus:outline-none focus:border-blue-03"
              />
            </label>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isStarting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleStart()}
            variant="revoke"
            disabled={!preview || isStarting}
          >
            {isStarting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Snapshot & rebuild
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const BANNER_OUTCOMES: { key: RematchOutcome; label: string; text: string }[] =
  [
    { key: "real_tef", label: "real TEF", text: "text-green-03" },
    { key: "recovered", label: "AI-recovered", text: "text-teal-03" },
    { key: "shadow", label: "shadow", text: "text-purple-03" },
    { key: "no_match", label: "no match", text: "text-gray-02" },
  ];

/** Progress / result strip for the latest rebuild run. Hidden once a
 * completed run has been dismissed. */
export function ShadowRebuildBanner({
  run,
  onOpenReport,
  onResumed,
}: {
  run: RebuildRun | null;
  onOpenReport: (snapshotRunId: string) => void;
  onResumed: () => void;
}) {
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  if (!run || dismissedId === run.id) return null;

  const pct = run.totalShifts
    ? Math.round((run.doneShifts / run.totalShifts) * 100)
    : 0;
  const counts = (
    <span className="flex flex-wrap gap-x-2.5">
      {BANNER_OUTCOMES.filter((o) => (run.outcomeCounts[o.key] ?? 0) > 0).map(
        (o) => (
          <span key={o.key} className={o.text}>
            {run.outcomeCounts[o.key]} {o.label}
          </span>
        ),
      )}
    </span>
  );

  const handleResume = async () => {
    setIsResuming(true);
    try {
      await resumeRebuild(run.id);
      onResumed();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resume");
    } finally {
      setIsResuming(false);
    }
  };

  if (run.status === "queued" || run.status === "running") {
    return (
      <div className="rounded-md border border-blue-03/40 bg-blue-03/5 p-3 space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-03" />
          <span className="font-medium text-gray-01">
            {run.status === "queued" || !run.startedAt
              ? "Rebuild queued: clearing shadow taxonomy…"
              : `Rematching ${run.doneShifts} / ${run.totalShifts}`}
          </span>
          {counts}
        </div>
        {run.startedAt && (
          <div className="h-1.5 rounded-full bg-gray-03/40 overflow-hidden">
            <div
              className="h-full bg-blue-03 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  if (run.status === "reverted") {
    return (
      <div className="rounded-md border border-gray-03 bg-gray-04/30 p-3 text-sm flex flex-wrap items-center gap-2">
        <RotateCcw className="w-4 h-4 text-gray-02" />
        <span className="text-gray-02">
          The last rebuild was undone: its starting snapshot was restored.
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={() => setDismissedId(run.id)}
        >
          Dismiss
        </Button>
      </div>
    );
  }

  if (run.status === "failed") {
    return (
      <div className="rounded-md border border-pink-03/40 bg-pink-03/5 p-3 text-sm flex flex-wrap items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-pink-03" />
        <span className="text-gray-01">
          Rebuild failed after {run.doneShifts} / {run.totalShifts}:{" "}
          <span className="text-pink-03">{run.error}</span>
        </span>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onOpenReport(run.snapshotRunId)}
          >
            Report so far
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleResume()}
            disabled={isResuming}
          >
            {isResuming ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4 mr-1.5" />
            )}
            Resume
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-green-03/40 bg-green-03/5 p-3 text-sm flex flex-wrap items-center gap-2">
      <span className="font-medium text-gray-01">
        Rebuild done: {run.totalShifts} commitments rematched,{" "}
        {run.deletedShadowCount} old shadow elements cleared
      </span>
      {counts}
      <div className="ml-auto flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => onOpenReport(run.snapshotRunId)}
        >
          Open rematch report
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setDismissedId(run.id)}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
