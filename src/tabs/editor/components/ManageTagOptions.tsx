import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { ConfirmDialog } from "@/ui/confirm-dialog";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { toast } from "sonner";
import type { TagOption } from "../lib/types";
import {
  fetchTagOptions,
  createTagOption,
  updateTagOption,
  deleteTagOption,
} from "../lib/tag-options-api";
import { TagOptionFormModal } from "./TagOptionFormModal";
import { TagOptionsTable } from "./TagOptionsTable";

export function ManageTagOptions() {
  const { t } = useI18n();
  const [options, setOptions] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TagOption | null>(null);
  const [deleteConfirmOption, setDeleteConfirmOption] = useState<TagOption | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchTagOptions();
      setOptions(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (opt: TagOption) => {
    setEditing(opt);
    setFormOpen(true);
  };

  const handleFormSubmit = async (slug: string, label: string | null) => {
    setActionLoading(true);
    try {
      if (editing) {
        await updateTagOption(editing.id, { slug, label });
        toast.success(t("editor.tagOptions.updated"));
      } else {
        await createTagOption({ slug, label });
        toast.success(t("editor.tagOptions.created"));
      }
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
      throw e;
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteConfirm = (opt: TagOption) => setDeleteConfirmOption(opt);
  const closeDeleteConfirm = () => setDeleteConfirmOption(null);

  const handleConfirmDelete = async () => {
    if (!deleteConfirmOption) return;
    setActionLoading(true);
    try {
      await deleteTagOption(deleteConfirmOption.id);
      toast.success(t("editor.tagOptions.deleted"));
      closeDeleteConfirm();
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-02">{t("editor.tagOptions.description")}</p>
        <Button
          variant="primary"
          size="sm"
          onClick={openAdd}
          disabled={actionLoading}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("editor.tagOptions.add")}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 bg-gray-04/80 backdrop-blur-sm rounded-lg">
          <LoadingSpinner label={t("editor.tagOptions.loading")} />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-gray-03 bg-gray-04/80 p-6">
          <p className="text-gray-01 font-medium">{t("editor.tagOptions.loadError")}</p>
          <p className="text-sm text-gray-02 mt-1">{error}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={load}>
            {t("common.refresh")}
          </Button>
        </div>
      ) : options.length === 0 ? (
        <div className="rounded-lg border border-gray-03 bg-gray-04/80 p-8 text-center text-gray-02">
          {t("editor.tagOptions.empty")}
        </div>
      ) : (
        <TagOptionsTable
          options={options}
          onEdit={openEdit}
          onDelete={openDeleteConfirm}
          disabled={actionLoading}
        />
      )}

      <ConfirmDialog
        open={!!deleteConfirmOption}
        onOpenChange={(open) => !open && closeDeleteConfirm()}
        title={t("editor.tagOptions.deleteTitle")}
        description={
          deleteConfirmOption
            ? t("editor.tagOptions.confirmDelete", {
                slug: deleteConfirmOption.slug,
              })
            : ""
        }
        cancelLabel={t("editor.tagOptions.cancel")}
        confirmLabel={t("editor.tagOptions.delete")}
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        isLoading={actionLoading}
      />

      <TagOptionFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSubmit={handleFormSubmit}
        isSubmitting={actionLoading}
      />
    </div>
  );
}
