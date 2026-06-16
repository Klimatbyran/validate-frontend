import {
  getStageGarboQueueArchiveUrl,
  getStagePipelineUrl,
} from "@/config/api-env";
import type { RunReportsPipelineConfig } from "@/hooks/useRunReportsPipeline";

const BATCHES_LIMIT = 500;

/** Stage pipeline + Garbo batches for Overview Prod → Stage runs. */
export const STAGE_RUN_REPORTS_PIPELINE_CONFIG: RunReportsPipelineConfig = {
  batchesApiUrl: getStageGarboQueueArchiveUrl("/batches"),
  batchesListUrl: getStageGarboQueueArchiveUrl(
    `/batches?limit=${BATCHES_LIMIT}`,
  ),
  parsePdfEndpoint: getStagePipelineUrl("/queues/parsePdf"),
  toastKeys: {
    partial: "overview.prodToStage.runPartial",
    success: "overview.prodToStage.runSuccess",
    error: "overview.prodToStage.runError",
  },
};
