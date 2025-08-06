import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { QueueJob } from "@/lib/types";

export function getStatusIcon(job: QueueJob) {
  if (job.failedReason) {
    return <XCircle className="w-6 h-6 text-red-03" />;
  }
  if (job.finishedOn) {
    return <CheckCircle2 className="w-6 h-6 text-green-03" />;
  }
  if (job.processedOn) {
    return <MessageSquare className="w-6 h-6 text-blue-03" />;
  }
  return <AlertTriangle className="w-6 h-6 text-yellow-03" />;
}

export function getStatusColor(job: QueueJob) {
  if (job.failedReason) {
    return "text-red-03";
  }
  if (job.finishedOn) {
    return "text-green-03";
  }
  if (job.processedOn) {
    return "text-blue-03";
  }
  return "text-yellow-03";
}

export function getStatusText(job: QueueJob) {
  if (job.failedReason) {
    return "Misslyckades";
  }
  if (job.finishedOn) {
    return "Slutförd";
  }
  if (job.processedOn) {
    return "Bearbetas";
  }
  return "Väntar";
}

export function getFilteredJobData(job: QueueJob) {
  const data = job.data;
  if (typeof data === "string" && isJsonString(data)) {
    return JSON.parse(data);
  }
  return data;
}

export function getFilteredJobDataWithoutSchema(job: QueueJob) {
  const data = getFilteredJobData(job);
  if (data && typeof data === "object" && data.schema) {
    const { schema, ...dataWithoutSchema } = data;
    return dataWithoutSchema;
  }
  return data;
}

export function getDocumentUrl(job: QueueJob) {
  return job.data.url || null;
}

function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}
