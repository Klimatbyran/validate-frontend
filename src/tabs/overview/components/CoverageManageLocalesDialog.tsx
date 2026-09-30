import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { ConfirmDialog } from "@/ui/confirm-dialog";
import { Modal } from "@/ui/modal";
import type { CoverageListLocale } from "@/tabs/overview/lib/coverage-types";
import { slugFromLabel } from "@/tabs/overview/lib/coverage-list-groups";

type CoverageManageLocalesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locales: CoverageListLocale[];
  onCreate: (input: { slug: string; label: string }) => Promise<void>;
  onUpdate: (
    localeId: string,
    input: { slug?: string; label?: string },
  ) => Promise<void>;
  onDelete: (localeId: string) => Promise<void>;
};

export function CoverageManageLocalesDialog({
  open,
  onOpenChange,
  locales,
  onCreate,
  onUpdate,
  onDelete,
}: CoverageManageLocalesDialogProps) {
  const { t } = useI18n();
  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CoverageListLocale | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLabel("");
    setSlug("");
    setSlugTouched(false);
    setEditingId(null);
  }, [open]);

  const canCreate = label.trim().length > 0 && slug.trim().length > 0;

  const sortedLocales = useMemo(
    () => [...locales].sort((a, b) => a.label.localeCompare(b.label)),
    [locales],
  );

  const handleCreate = async () => {
    if (!canCreate) return;
    setIsSaving(true);
    try {
      await onCreate({ label: label.trim(), slug: slug.trim() });
      setLabel("");
      setSlug("");
      setSlugTouched(false);
      toast.success(t("overview.coverage.localeCreated"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("overview.coverage.localeSaveError"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editLabel.trim() || !editSlug.trim()) return;
    setIsSaving(true);
    try {
      await onUpdate(editingId, {
        label: editLabel.trim(),
        slug: editSlug.trim(),
      });
      setEditingId(null);
      toast.success(t("overview.coverage.localeUpdated"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("overview.coverage.localeSaveError"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
      toast.success(t("overview.coverage.localeDeleted"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("overview.coverage.localeDeleteError"),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        size="2xl"
        scrollable
        title={t("overview.coverage.manageLocalesTitle")}
        description={t("overview.coverage.manageLocalesHint")}
      >
        <div className="space-y-6">
          <div className="space-y-3 rounded-md border border-gray-03 p-3">
            <p className="text-sm font-medium text-gray-01">
              {t("overview.coverage.addLocale")}
            </p>
            <label className="block space-y-1">
              <span className="text-sm text-gray-02">
                {t("overview.coverage.localeLabel")}
              </span>
              <input
                className="w-full rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm"
                value={label}
                onChange={(event) => {
                  const next = event.target.value;
                  setLabel(next);
                  if (!slugTouched) setSlug(slugFromLabel(next));
                }}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-gray-02">
                {t("overview.coverage.localeSlug")}
              </span>
              <input
                className="w-full rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm font-mono"
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(event.target.value);
                }}
              />
            </label>
            <Button
              onClick={() => void handleCreate()}
              disabled={!canCreate || isSaving}
            >
              {t("overview.coverage.createLocale")}
            </Button>
          </div>

          <div className="space-y-2">
            {sortedLocales.map((locale) => {
              const isEditing = editingId === locale.id;
              return (
                <div
                  key={locale.id}
                  className="rounded-md border border-gray-03 p-3 space-y-2"
                >
                  {isEditing ? (
                    <>
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-02">
                          {t("overview.coverage.localeLabel")}
                        </span>
                        <input
                          className="w-full rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm"
                          value={editLabel}
                          onChange={(event) => setEditLabel(event.target.value)}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-02">
                          {t("overview.coverage.localeSlug")}
                        </span>
                        <input
                          className="w-full rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm font-mono"
                          value={editSlug}
                          onChange={(event) => setEditSlug(event.target.value)}
                        />
                      </label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => void handleSaveEdit()}
                          disabled={isSaving}
                        >
                          {t("common.save")}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingId(null)}
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-01">
                          {locale.label}
                        </p>
                        <p className="text-xs text-gray-02 font-mono">
                          {locale.slug} ·{" "}
                          {t("overview.coverage.localeListCount", {
                            count: locale.listCount,
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingId(locale.id);
                            setEditLabel(locale.label);
                            setEditSlug(locale.slug);
                          }}
                        >
                          {t("overview.coverage.editLocale")}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setDeleteTarget(locale)}
                        >
                          {t("overview.coverage.deleteLocale")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {sortedLocales.length === 0 ? (
              <p className="text-sm text-gray-02">
                {t("overview.coverage.noLocalesYet")}
              </p>
            ) : null}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTarget(null);
        }}
        title={t("overview.coverage.confirmDeleteLocaleTitle")}
        description={
          deleteTarget
            ? t("overview.coverage.confirmDeleteLocale", {
                name: deleteTarget.label,
                count: deleteTarget.listCount,
              })
            : ""
        }
        cancelLabel={t("common.cancel")}
        confirmLabel={t("overview.coverage.deleteLocale")}
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </>
  );
}
