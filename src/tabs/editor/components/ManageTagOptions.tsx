import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/ui/dialog";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { toast } from "sonner";
import type { TagOption } from "../lib/types";
import { TAG_OPTION_SLUG_REGEX } from "../lib/types";
import {
  fetchTagOptions,
  createTagOption,
  updateTagOption,
  deleteTagOption,
} from "../lib/tag-options-api";

export function ManageTagOptions() {
  const { t } = useI18n();
  const [options, setOptions] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOption, setDeleteConfirmOption] = useState<TagOption | null>(null);
  const [editing, setEditing] = useState<TagOption | null>(null);
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");

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
    setSlug("");
    setLabel("");
    setDialogOpen(true);
  };

  const openEdit = (opt: TagOption) => {
    setEditing(opt);
    setSlug(opt.slug);
    setLabel(opt.label ?? "");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setSlug("");
    setLabel("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slugTrim = slug.trim();
    if (!slugTrim) {
      toast.error(t("editor.tagOptions.slugRequired"));
      return;
    }
    if (!TAG_OPTION_SLUG_REGEX.test(slugTrim)) {
      toast.error(t("editor.tagOptions.slugInvalid"));
      return;
    }
    setActionLoading(true);
    try {
      if (editing) {
        await updateTagOption(editing.id, {
          slug: slugTrim,
          label: label.trim() || null,
        });
        toast.success(t("editor.tagOptions.updated"));
      } else {
        await createTagOption({
          slug: slugTrim,
          label: label.trim() || null,
        });
        toast.success(t("editor.tagOptions.created"));
      }
      closeDialog();
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
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
      {/* Always show description and Add button so users can add tags even when list fails to load */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-02">
          {t("editor.tagOptions.description")}
        </p>
        <Button variant="primary" size="sm" onClick={openAdd} disabled={actionLoading}>
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
        <div className="rounded-lg border border-gray-03 bg-gray-04/80 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-03 bg-gray-04 text-gray-02 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">{t("editor.tagOptions.slug")}</th>
                <th className="px-4 py-3 font-medium">{t("editor.tagOptions.label")}</th>
                <th className="px-4 py-3 font-medium w-28">{t("editor.tagOptions.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {options.map((opt) => (
                <tr key={opt.id} className="border-b border-gray-03/50 hover:bg-gray-04/50">
                  <td className="px-4 py-3 text-gray-01 font-mono text-sm">{opt.slug}</td>
                  <td className="px-4 py-3 text-gray-01">{opt.label ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(opt)}
                        disabled={actionLoading}
                        className="p-2 rounded-full text-gray-02 hover:text-gray-01 hover:bg-gray-03 disabled:opacity-50"
                        aria-label={t("editor.tagOptions.edit")}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(opt)}
                        disabled={actionLoading}
                        className="p-2 rounded-full text-gray-02 hover:text-red-500 hover:bg-gray-03 disabled:opacity-50"
                        aria-label={t("editor.tagOptions.delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal – same style as add/edit */}
      <Dialog open={!!deleteConfirmOption} onOpenChange={(open) => !open && closeDeleteConfirm()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editor.tagOptions.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {deleteConfirmOption
                ? t("editor.tagOptions.confirmDelete", { slug: deleteConfirmOption.slug })
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeDeleteConfirm}>
              {t("editor.tagOptions.cancel")}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("editor.tagOptions.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("editor.tagOptions.editTitle") : t("editor.tagOptions.addTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("editor.tagOptions.dialogDescription")} {t("editor.tagOptions.slugFormatHint")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="tag-option-slug" className="block text-sm font-medium text-gray-01 mb-1">
                {t("editor.tagOptions.slug")} *
              </label>
              <input
                id="tag-option-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. large-cap"
                className="w-full px-3 py-2 rounded-lg border border-gray-03 bg-gray-05 text-gray-01 placeholder:text-gray-03 focus:outline-none focus:ring-2 focus:ring-blue-03"
                required
              />
              {editing && (
                <p className="text-xs text-gray-02 mt-1">
                  {t("editor.tagOptions.slugChangeHint")}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="tag-option-label" className="block text-sm font-medium text-gray-01 mb-1">
                {t("editor.tagOptions.label")}
              </label>
              <input
                id="tag-option-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t("editor.tagOptions.labelPlaceholder")}
                className="w-full px-3 py-2 rounded-lg border border-gray-03 bg-gray-05 text-gray-01 placeholder:text-gray-03 focus:outline-none focus:ring-2 focus:ring-blue-03"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeDialog}>
                {t("auth.back")}
              </Button>
              <Button type="submit" variant="primary" disabled={actionLoading}>
                {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editing ? t("editor.tagOptions.save") : t("editor.tagOptions.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
