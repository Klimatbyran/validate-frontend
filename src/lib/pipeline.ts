import { Edge, Node, Position } from "@xyflow/react";
import { Pipeline, PipelineNode } from "./types";

export function getInitialNode(pipeline: Pipeline) {
    const noneEndNodes = pipeline.filter(node => node.next && node.next.target.length > 0);
    for(const node of noneEndNodes) {
        if(noneEndNodes.find(n => n.next?.target.includes(node.id)) === undefined) {
            return node;
        }
    }
    return undefined;
}

export function buildPipelineGraph(pipeline: Pipeline): { nodes: Node[], edges: Edge[] } {
    pipeline = removeOrphanNodes(pipeline);

    const nodes: Node[] = [];
    for(const pipelineNode of pipeline) {
      const node: Node ={
        id: pipelineNode.id,
        data: {
          label: pipelineNode.name
        },
        position: {
          x: 0,
          y: 0
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };

      if(pipelineNode.next === undefined || pipelineNode.next?.target.length === 0) {
        node.sourcePosition = undefined;
      }

      if(getPreviousNodes(pipeline, pipelineNode.id).length === 0) {
        node.targetPosition = undefined;
      } 

      nodes.push(node);
    }

    const edges: Edge[] = [];
    for(const node of pipeline) {
        edges.push(...buildPipelineSubgraph(pipeline, node));
    }

    return { nodes, edges };
}

export function buildPipelineSubgraph(pipeline: Pipeline, node: PipelineNode): Edge[] {
    const graph: Edge[] = [];
    if(node.next) {
        for(const target of node.next.target) {
            const nextNode = getNode(pipeline, target);
            if(!nextNode) continue;
            graph.push({id: `${node.id}-${nextNode.id}`, source: node.id, target: nextNode.id});
        }
    }
    return graph;
}

export function getPreviousNodes(pipeline: Pipeline, nodeId: string): PipelineNode[] {
    const previousNodes: PipelineNode[] = [];
    for(const node of pipeline) {
        if(node.next?.target.includes(nodeId))
            previousNodes.push(node);
    }
    return previousNodes;
}

export function removeOrphanNodes(pipeline: Pipeline) {
    const cleanedPipeline = pipeline.filter(node => {
        return pipeline.find(n => n.next?.target.includes(node.id)) !== undefined;
    })
    const initialNode = getInitialNode(pipeline);
    if(initialNode) 
        cleanedPipeline.push(initialNode);

    return cleanedPipeline;
}

export function getNode(pipeline: Pipeline, id: string) {
    return pipeline.find(node => node.id === id);
}

export function findFirstConvergenceNode(startNode: PipelineNode, pipeline: Pipeline): string | null {
  if (!startNode || !startNode.next || !startNode.next.target) return null;
  
  // Get the immediate next nodes (branches)
  const initialBranches = startNode.next.target;
  if (initialBranches.length <= 1) return null; // No branching
  
  // Track visited nodes for each branch
  const branchPaths: Map<string, Set<string>> = new Map();
  
  // Initialize with starting branches
  initialBranches.forEach(branch => {
    branchPaths.set(branch, new Set([branch]));
  });
  
  // BFS queue of [nodeId, branchId]
  const queue: [string, string][] = [];
  initialBranches.forEach(branch => {
    queue.push([branch, branch]);
  });
    
  while (queue.length > 0) {
    const [currentId, branchId] = queue.shift()!;
    
    // Check if this node appears in all branch paths
    let allBranchesContain = true;
    for (const branch of initialBranches) {
      if (!branchPaths.get(branch)?.has(currentId)) {
        allBranchesContain = false;
        break;
      }
    }
    
    if (allBranchesContain) {
      return currentId; // First convergence point found
    }
    
    // Get next nodes
    const currentNode = pipeline.find(node => node.id === currentId);
    if (currentNode?.next?.target) {
      for (const nextId of currentNode.next.target) {
        // Add to branch path
        branchPaths.get(branchId)?.add(nextId);
        
        // Add to queue
        queue.push([nextId, branchId]);
      }
    }
  }
  
  return null;
}