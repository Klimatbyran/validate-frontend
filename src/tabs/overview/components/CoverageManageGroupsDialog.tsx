import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { ConfirmDialog } from "@/ui/confirm-dialog";
import { Modal } from "@/ui/modal";
import type { CoverageListGroup } from "@/tabs/overview/lib/coverage-types";
import { slugFromLabel } from "@/tabs/overview/lib/coverage-list-groups";

type CoverageManageGroupsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: CoverageListGroup[];
  onCreate: (input: { slug: string; label: string }) => Promise<void>;
  onUpdate: (
    groupId: string,
    input: { slug?: string; label?: string },
  ) => Promise<void>;
  onDelete: (groupId: string) => Promise<void>;
};

export function CoverageManageGroupsDialog({
  open,
  onOpenChange,
  groups,
  onCreate,
  onUpdate,
  onDelete,
}: CoverageManageGroupsDialogProps) {
  const { t } = useI18n();
  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CoverageListGroup | null>(
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

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.label.localeCompare(b.label)),
    [groups],
  );

  const handleCreate = async () => {
    if (!canCreate) return;
    setIsSaving(true);
    try {
      await onCreate({ label: label.trim(), slug: slug.trim() });
      setLabel("");
      setSlug("");
      setSlugTouched(false);
      toast.success(t("overview.coverage.groupCreated"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("overview.coverage.groupSaveError"),
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
      toast.success(t("overview.coverage.groupUpdated"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("overview.coverage.groupSaveError"),
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
      toast.success(t("overview.coverage.groupDeleted"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("overview.coverage.groupDeleteError"),
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
        title={t("overview.coverage.manageGroupsTitle")}
        description={t("overview.coverage.manageGroupsHint")}
      >
        <div className="space-y-6">
          <div className="space-y-3 rounded-md border border-gray-03 p-3">
            <p className="text-sm font-medium text-gray-01">
              {t("overview.coverage.addGroup")}
            </p>
            <label className="block space-y-1">
              <span className="text-sm text-gray-02">
                {t("overview.coverage.groupLabel")}
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
                {t("overview.coverage.groupSlug")}
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
              {t("overview.coverage.createGroup")}
            </Button>
          </div>

          <div className="space-y-2">
            {sortedGroups.map((group) => {
              const isEditing = editingId === group.id;
              return (
                <div
                  key={group.id}
                  className="rounded-md border border-gray-03 p-3 space-y-2"
                >
                  {isEditing ? (
                    <>
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-02">
                          {t("overview.coverage.groupLabel")}
                        </span>
                        <input
                          className="w-full rounded-md border border-gray-03 bg-gray-05 px-3 py-2 text-sm"
                          value={editLabel}
                          onChange={(event) => setEditLabel(event.target.value)}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-sm text-gray-02">
                          {t("overview.coverage.groupSlug")}
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
                          {group.label}
                        </p>
                        <p className="text-xs text-gray-02 font-mono">
                          {group.slug} ·{" "}
                          {t("overview.coverage.groupListCount", {
                            count: group.listCount,
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingId(group.id);
                            setEditLabel(group.label);
                            setEditSlug(group.slug);
                          }}
                        >
                          {t("overview.coverage.editGroup")}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setDeleteTarget(group)}
                        >
                          {t("overview.coverage.deleteGroup")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {sortedGroups.length === 0 ? (
              <p className="text-sm text-gray-02">
                {t("overview.coverage.noGroupsYet")}
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
        title={t("overview.coverage.confirmDeleteGroupTitle")}
        description={
          deleteTarget
            ? t("overview.coverage.confirmDeleteGroup", {
                name: deleteTarget.label,
                count: deleteTarget.listCount,
              })
            : ""
        }
        cancelLabel={t("common.cancel")}
        confirmLabel={t("overview.coverage.deleteGroup")}
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </>
  );
}
