import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { ConfirmDialog } from "@/ui/confirm-dialog";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { toast } from "sonner";
import type { ReportType } from "../../lib/types";
import {
  fetchReportTypes,
  createReportType,
  updateReportType,
  deleteReportType,
} from "../../lib/report-types-api";
import { ReportTypeFormModal } from "./ReportTypeFormModal";
import { ReportTypesTable } from "./ReportTypesTable";

export function ManageReportTypes() {
  const { t } = useI18n();
  const [options, setOptions] = useState<ReportType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ReportType | null>(null);
  const [deleteConfirmOption, setDeleteConfirmOption] =
    useState<ReportType | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchReportTypes();
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

  const openEdit = (opt: ReportType) => {
    setEditing(opt);
    setFormOpen(true);
  };

  const handleFormSubmit = async (slug: string, label: string | null) => {
    setActionLoading(true);
    try {
      if (editing) {
        await updateReportType(editing.id, { slug, label });
        toast.success(t("editor.reportTypes.updated"));
      } else {
        await createReportType({ slug, label });
        toast.success(t("editor.reportTypes.created"));
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

  const openDeleteConfirm = (opt: ReportType) => setDeleteConfirmOption(opt);
  const closeDeleteConfirm = () => setDeleteConfirmOption(null);

  const handleConfirmDelete = async () => {
    if (!deleteConfirmOption) return;
    setActionLoading(true);
    try {
      await deleteReportType(deleteConfirmOption.id);
      toast.success(t("editor.reportTypes.deleted"));
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
        <p className="text-sm text-gray-02">
          {t("editor.reportTypes.description")}
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={openAdd}
          disabled={actionLoading}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("editor.reportTypes.add")}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 bg-gray-04/80 backdrop-blur-sm rounded-lg">
          <LoadingSpinner label={t("editor.reportTypes.loading")} />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-gray-03 bg-gray-04/80 p-6">
          <p className="text-gray-01 font-medium">
            {t("editor.reportTypes.loadError")}
          </p>
          <p className="text-sm text-gray-02 mt-1">{error}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={load}>
            {t("common.refresh")}
          </Button>
        </div>
      ) : options.length === 0 ? (
        <div className="rounded-lg border border-gray-03 bg-gray-04/80 p-8 text-center text-gray-02">
          {t("editor.reportTypes.empty")}
        </div>
      ) : (
        <ReportTypesTable
          options={options}
          onEdit={openEdit}
          onDelete={openDeleteConfirm}
          disabled={actionLoading}
        />
      )}

      <ConfirmDialog
        open={!!deleteConfirmOption}
        onOpenChange={(open) => !open && closeDeleteConfirm()}
        title={t("editor.reportTypes.deleteTitle")}
        description={
          deleteConfirmOption
            ? t("editor.reportTypes.confirmDelete", {
                slug: deleteConfirmOption.slug,
              })
            : ""
        }
        cancelLabel={t("editor.reportTypes.cancel")}
        confirmLabel={t("editor.reportTypes.delete")}
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        isLoading={actionLoading}
      />

      <ReportTypeFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSubmit={handleFormSubmit}
        isSubmitting={actionLoading}
      />
    </div>
  );
}
