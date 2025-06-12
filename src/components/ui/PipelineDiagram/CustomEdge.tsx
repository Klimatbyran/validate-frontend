import { EdgeProps } from "@xyflow/react";

const WaypointOffsetEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
}: EdgeProps) => {
   // Define horizontal straight section height
  const pathHeight = sourceY + 50;
  
  const transitionDistance = 50;
  
  // Calculate horizontal section start and end points
  const horizontalStartX = sourceX + transitionDistance;
  const horizontalEndX = targetX - transitionDistance;
  
  // SVG Path: S-curve from source going up, straight horizontal section, S-curve to target
  const customPath = `
    M ${sourceX},${sourceY}
    C ${sourceX + transitionDistance/2},${sourceY} ${sourceX + transitionDistance/2},${pathHeight} ${horizontalStartX},${pathHeight}
    L ${horizontalEndX},${pathHeight}
    C ${horizontalEndX + transitionDistance/2},${pathHeight} ${targetX - transitionDistance/2},${targetY} ${targetX},${targetY}
  `;
  return (
    <g className="react-flow__edge">
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={customPath}
        markerEnd={markerEnd}
      />
    </g>
  );
};

export default WaypointOffsetEdge;