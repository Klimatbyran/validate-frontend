export interface ProgressSegment {
  value: number;
  color: string;
  label: string;
  title?: string;
}

interface MultiProgressBarProps {
  segments: ProgressSegment[];
  total: number;
  height?: "sm" | "md" | "lg";
  className?: string;
  showTooltips?: boolean;
}

export function MultiProgressBar({
  segments,
  total,
  height = "md",
  className = "",
  showTooltips = true,
}: MultiProgressBarProps) {
  const heightClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  // Calculate percentages for each segment
  const segmentsWithPercentages = segments.map((segment) => ({
    ...segment,
    percentage: total > 0 ? (segment.value / total) * 100 : 0,
  }));

  return (
    <div
      className={`w-full ${heightClasses[height]} bg-gray-02 rounded-full overflow-hidden flex ${className}`}
    >
      {segmentsWithPercentages.map((segment, index) => (
        <div
          key={index}
          className={`h-full ${segment.color} transition-all ${
            showTooltips ? "cursor-help" : ""
          }`}
          style={{ width: `${segment.percentage}%` }}
          title={showTooltips ? segment.title || segment.label : undefined}
        />
      ))}
    </div>
  );
}

/**
 * Predefined progress bar for pipeline step statuses
 */
interface PipelineProgressBarProps {
  completed: number;
  processing: number;
  failed: number;
  needsApproval: number;
  waiting: number;
  total: number;
  height?: "sm" | "md" | "lg";
  className?: string;
  showTooltips?: boolean;
}

export function PipelineProgressBar({
  completed,
  processing,
  failed,
  needsApproval,
  waiting,
  total,
  height = "md",
  className = "",
  showTooltips = true,
}: PipelineProgressBarProps) {
  const segments: ProgressSegment[] = [
    {
      value: completed,
      color: "bg-green-03",
      label: "Completed",
      title: `${completed} completed`,
    },
    {
      value: processing,
      color: "bg-blue-03",
      label: "Processing",
      title: `${processing} processing`,
    },
    {
      value: needsApproval,
      color: "bg-orange-03",
      label: "Needs Approval",
      title: `${needsApproval} needs approval`,
    },
    {
      value: failed,
      color: "bg-pink-03",
      label: "Failed",
      title: `${failed} failed`,
    },
    {
      value: waiting,
      color: "bg-gray-02",
      label: "Waiting",
      title: `${waiting} waiting`,
    },
  ];

  return (
    <MultiProgressBar
      segments={segments}
      total={total}
      height={height}
      className={className}
      showTooltips={showTooltips}
    />
  );
}
