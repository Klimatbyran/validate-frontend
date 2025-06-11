import { Handle, Position } from "@xyflow/react";
import "./pipeline-node.css"
import { AlertCircle, CheckCircle2, CircleSlash, Clock, XCircle } from "lucide-react";
import { useContext } from "react";
import { JobDetailContext } from "@/components/contexts/JobDetailContext";

interface PipelineMultiNodeProps {
    data: {
      label: string;
      jobs: {        
        status?: string;
        jobId: string;
      }[]
    };
    isConnectable: boolean;
    id: string;
}


function PipelineMultiNode({ data, isConnectable, id }: PipelineMultiNodeProps) {
  const { togglePopover } = useContext(JobDetailContext);

  return (
    <div className="h-fit">
      <Handle
        className="react-flow__handle react-flow__handle-left nodrag"
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />
      <div className="flex flex-col gap-2">
      {(data.jobs ?? []).map((job) => (
        <div className="flex items-center gap-2 bg-gray-03 p-2 rounded-md cursor-pointer node-task" onClick={() => togglePopover({id: job.jobId, queue: id})}>
          {job.status && getStatusIcon(job.status)}
          <strong className="text-xs">{data.label}</strong>
        </div>
      ))} 
      </div>     
      <Handle
        className="react-flow__handle react-flow__handle-right nodrag"
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
    </div>
  );
}

function getStatusIcon(status?: string) {
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
    case "delayed":
      return (
        <div className={`bg-purple-03 p-1 h-6 self-center rounded-full`}>
          <AlertCircle className="w-4 h-4" />
        </div>
      );
    case "skipped":
      return (
        <div className={`bg-gray-03 p-1 h-6 self-center rounded-full`}>
          <CircleSlash className="w-4 h-4" />
        </div>
      );
    default:
      return (
        <div className={`bg-blue-03 p-1 h-6 self-center rounded-full`}>
          <Clock className="w-4 h-4 animate-spin" />
        </div>
      );
  }
}

export default PipelineMultiNode;