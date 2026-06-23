import {
  UploadBatchOptions,
  type UploadBatchOptionsProps,
} from "@/tabs/upload/components/UploadBatchOptions";

interface RegistryAddBatchOptionsProps {
  batch: UploadBatchOptionsProps;
}

/** Optional batch picker when adding registry entries. */
export function RegistryAddBatchOptions({
  batch,
}: RegistryAddBatchOptionsProps) {
  return (
    <div className="rounded-lg border border-gray-03 bg-gray-03/20 p-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <UploadBatchOptions {...batch} usePortal={false} />
      </div>
    </div>
  );
}
