import { Process, ProcessStatus } from "@/lib/types";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  XCircle,
} from "lucide-react";
import moment from "moment";
import { RunningClock } from "./running-clock";
import { PipelineGraph } from "./PipelineDiagram/PipelineGraph";

interface ProcessCardProps {
  process: Process;
  className?: string;
  extended: boolean;
  extend: () => void;
}

const getStatusIcon = (status?: ProcessStatus) => {
  switch (status) {
    case "completed":
      return (
        <div className={`bg-green-03 p-1 h-6 self-center rounded-full`}>
          <CheckCircle2 className="w-4 h-4" />
        </div>
      );
    case "failed":
      return (
        <div className={`bg-red-03 p-1 h-6 self-center rounded-full`}>
          <XCircle className="w-4 h-4" />
        </div>
      );
    case "waiting":
      return (
        <div className={`bg-purple-03 p-1 h-6 self-center rounded-full`}>
          <AlertCircle className="w-4 h-4" />
        </div>
      );
    default:
      return (
        <div className={`bg-blue-03 p-1 h-6 self-center rounded-full`}>
          <Clock className="w-4 h-4 animate-spin" />
        </div>
      );
  }
};

const humanizeStartTime = (startedAt?: number) => {
  if (startedAt) {
    return (
      <span title={moment(startedAt).format("YYYY-MM-DD HH:mm:ss")}>
        {moment.duration(Date.now() - startedAt).humanize()} ago
      </span>
    );
  } else {
    return <span>-</span>;
  }
};

export function ProcessCard({
  process,
  className,
  extended,
  extend,
}: ProcessCardProps) {
  return (
    <div className={`w-full px-4 ${className}`}>
      <div
        className={`h-[80px] flex items-center justify-between`}
        onClick={extend}
      >
        <div className="flex item-center">
            {extended ? (
              <ChevronDown className="w-4 h-4 text-gray-02 self-center me-2" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-02 self-center me-2" />
            )}
          {getStatusIcon(process.status)}
          <div className="ms-1">
            <h4
              className={`text-lg font-bold ${
                process.company === undefined ? "italic" : ""
              }`}
            >
              {process.company ?? "unknown"}
            </h4>
            <div className="text-sm italic">{process.year}</div>
          </div>
        </div>
        <div className="text-sm">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 me-1 mb-1"></Calendar>
            {humanizeStartTime(process.startedAt)}
          </div>
          <div className="flex items-center">
            <RunningClock
              startedAt={process.startedAt}
              finishedAt={process.finishedAt}
            ></RunningClock>
          </div>
        </div>
      </div>
      {extended && 
      <div>
        <PipelineGraph jobs={process.jobs} />
      </div>
      }
    </div>
  );
}
