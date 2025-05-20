import { Handle, Position } from "@xyflow/react";
import "./pipeline-node.css"

interface PipelineNodeProps {
    data: {
      label: string;
    };
    isConnectable: boolean;
}


function PipelineNode({ data, isConnectable }: PipelineNodeProps) {
  return (
    <>
      <Handle
        className="react-flow__handle react-flow__handle-left nodrag"
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />
      <div>
       <strong>{data.label}</strong>
      </div>
      <Handle
        className="react-flow__handle react-flow__handle-right nodrag"
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
    </>
  );
}

export default PipelineNode;