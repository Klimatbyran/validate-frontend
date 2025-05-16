import dagre from '@dagrejs/dagre';
import { useEffect } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Edge,
  Node,
  Controls,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { usePipeline } from '@/hooks/usePipeline';
import { buildPipelineGraph } from '@/lib/pipeline';

const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({})); 

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({ rankdir: 'LR' });
 
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 172, height: 36, ...node.data });
  });
 
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
 
  dagre.layout(dagreGraph);
 
  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      position: {
        x: nodeWithPosition.x - 172 / 2,
        y: nodeWithPosition.y - 36 / 2,
      },
    };
 
    return newNode;
  });
 
  return { nodes: newNodes, edges };
};

export function PipelineGraph() {
  const { pipeline, isLoading, isError, error } = usePipeline();
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);

  useEffect(() => {
    const {nodes, edges} = buildPipelineGraph(pipeline || []);
    const layouted = getLayoutedElements(nodes, edges);
 
      setNodes([...layouted.nodes]);
      setEdges([...layouted.edges]);
    },
    [pipeline, setNodes, setEdges],
  );
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (isError) {
    return <div>Error: {error.message}</div>;
  }
  
 
  return (
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        colorMode='dark'
        fitView
      >        
      <Controls />
      </ReactFlow>
  );
};