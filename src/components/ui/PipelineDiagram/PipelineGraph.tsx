/* eslint-disable @typescript-eslint/no-explicit-any */
import dagre from '@dagrejs/dagre';
import { useEffect } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Edge,
  Node,
  Position,
  BezierEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { buildPipelineGraph } from '@/lib/pipeline';
import PipelineNode from './PipelineNode';
import WaypointOffsetEdge from './CustomEdge';
import { Pipeline } from '@/lib/types';

const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({})); 

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  dagreGraph.setGraph({ rankdir: 'LR', ranksep: 20, nodesep: 20  });
 
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 172, height: 36, ...node.data });
  });
 
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target, {
      weight: edge.source === 'nlmParsePDF' && edge.target === 'precheck' ? 100 : 1,
      type: 'smoothstep' 
    });
  });
 
  dagre.layout(dagreGraph);
 
  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,

      position: {
        x: nodeWithPosition.x - 172 / 2,
        y: nodeWithPosition.y - 36 / 2,
      },
    };
 
    return newNode;
  });
 
  return { nodes: newNodes, edges };
};

export function PipelineGraph({pipeline}: {pipeline: Pipeline}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);

  useEffect(() => {
    const {nodes, edges} = buildPipelineGraph(pipeline || []);
    const result = getLayoutedElements(nodes, edges);
    setNodes(result.nodes);
    setEdges(result.edges);
    },
    [pipeline, setNodes, setEdges],
  );
 
  return (
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={{custom: PipelineNode}}
        edgeTypes={{custom: WaypointOffsetEdge, default: BezierEdge}}
        colorMode='dark'
        fitView
      >        
      </ReactFlow>
  );
};