import { useMemo } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import type { TagOption } from "@/tabs/editor/lib/types";
import { buildTagLabelBySlug } from "@/tabs/editor/lib/editor-tag-and-payload-utils";

export interface UploadTagsOptionsProps {
  tagOptions: TagOption[];
  tagsLoading?: boolean;
  tagsError?: string | null;
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
}

export function UploadTagsOptions({
  tagOptions,
  tagsLoading = false,
  tagsError = null,
  selectedTags,
  onSelectedTagsChange,
}: UploadTagsOptionsProps) {
  const { t } = useI18n();
  const tagLabelBySlug = useMemo(() => buildTagLabelBySlug(tagOptions), [tagOptions]);

  return (
    <>
      <span className="text-sm text-gray-02 shrink-0">{t("upload.tags")}:</span>
      <MultiSelectDropdown
        options={tagOptions.map((o) => o.slug)}
        selectedIds={selectedTags}
        onChange={onSelectedTagsChange}
        triggerLabel={t("upload.tags")}
        ariaLabel={t("upload.tagsAria")}
        loading={tagsLoading}
        loadingLabel={t("upload.tagsLoading")}
        emptyLabel={t("upload.tagsEmpty")}
        getOptionLabel={(slug) => tagLabelBySlug[slug] ?? slug}
        panelMinWidth={240}
      />

      {tagsError && (
        <div className="w-full">
          <div className="rounded-lg border border-gray-03 bg-gray-04/80 p-4 mt-2">
            <p className="text-gray-01 font-medium">{t("editor.tagOptions.loadError")}</p>
            <p className="text-sm text-gray-02 mt-1">{tagsError}</p>
          </div>
        </div>
      )}
    </>
  );
}

