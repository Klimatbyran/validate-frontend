import { useEffect, useState } from "react";
import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import type { RecoveredImage } from "./useClimatePlanDetail";

/** Lightweight — just the image gallery, for the docling job's own
 * dialog (ClimatePipelineTab, opened from the PDF-parsing swimlane pill)
 * which has no reason to pull the full plan detail GET /plans/:id
 * returns for StepResultDialog. */
export function useRecoveredImages(planId: string | null) {
  const [images, setImages] = useState<RecoveredImage[]>([]);

  useEffect(() => {
    if (!planId) {
      setImages([]);
      return;
    }
    let cancelled = false;
    fetch(`${getClimatePlansPipelineApiUrl()}/plans/${planId}/images`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json() as Promise<RecoveredImage[]>;
      })
      .then((data) => {
        if (!cancelled) setImages(data);
      })
      .catch(() => {
        if (!cancelled) setImages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  return images;
}
