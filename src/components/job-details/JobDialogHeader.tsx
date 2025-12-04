import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { QueueJob } from "@/lib/types";
import { getWikidataInfo } from "@/lib/utils";

interface JobDialogHeaderProps {
  job: QueueJob;
}

export function JobDialogHeader({ job }: JobDialogHeaderProps) {
  return (
    <DialogHeader>
      <div className="flex items-center justify-between">
        <div>
          <DialogTitle className="text-2xl mb-2">
            {job.data.companyName || job.data.company}
          </DialogTitle>
          {getWikidataInfo(job)?.node && (
            <div className="text-sm text-gray-02 mb-2">
              WikidataID: {getWikidataInfo(job)?.node}
            </div>
          )}
          {job.data.description && (
            <DialogDescription className="text-base">
              {job.data.description}
            </DialogDescription>
          )}
        </div>
      </div>
    </DialogHeader>
  );
}
