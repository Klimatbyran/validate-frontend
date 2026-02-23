import React from "react";
import { CheckCircle2, Loader2, HelpCircle, AlertTriangle } from "lucide-react";
import {
  getStatusConfig,
  getStatCardValueColor,
  getStatCardLabelColor,
} from "@/lib/status-config";
import { PipelineProgressBar } from "@/ui/multi-progress-bar";

/**
 * Base stat card component with consistent styling
 */
interface StatCardProps {
  value: string | number;
  label: string;
  color?: "gray" | "green" | "blue" | "orange" | "pink";
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatCard({
  value,
  label,
  color = "gray",
  icon,
  size = "md",
  className = "",
}: StatCardProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };

  return (
    <div className={`bg-gray-03/50 rounded-lg p-4 ${className}`}>
      <div
        className={`${sizeClasses[size]} font-bold ${getStatCardValueColor(
          color
        )}`}
      >
        {value}
      </div>
      <div
        className={`text-xs ${getStatCardLabelColor(
          color
        )} mt-1 flex items-center gap-1`}
      >
        {icon}
        {label}
      </div>
    </div>
  );
}

/**
 * Compact stat card for field breakdown
 */
interface CompactStatCardProps {
  value: number;
  label: string;
  color?: "gray" | "green" | "blue" | "orange" | "pink";
  className?: string;
  onClick?: () => void;
}

export function CompactStatCard({
  value,
  label,
  color = "gray",
  className = "",
  onClick,
}: CompactStatCardProps) {
  const Component = onClick ? "button" : "div";
  const baseClasses = `text-center p-3 bg-gray-03/50 rounded-lg transition-all ${className}`;
  const interactiveClasses = onClick
    ? "hover:bg-gray-03 hover:shadow-sm cursor-pointer active:scale-95"
    : "";

  return (
    <Component
      className={`${baseClasses} ${interactiveClasses}`}
      onClick={onClick}
    >
      <div className={`text-lg font-bold ${getStatCardValueColor(color)}`}>
        {value}
      </div>
      <div className={`text-xs ${getStatCardLabelColor(color)}`}>{label}</div>
    </Component>
  );
}

/**
 * Pipeline step card with progress bar
 */
interface PipelineStepCardProps {
  name: string;
  completed: number;
  processing: number;
  failed: number;
  needsApproval: number;
  waiting: number;
  total: number;
  className?: string;
  onNeedsApprovalClick?: () => void;
  onFailedClick?: () => void;
  onStepClick?: () => void;
}

export function PipelineStepCard({
  name,
  completed,
  processing,
  failed,
  needsApproval,
  waiting,
  total,
  className = "",
  onNeedsApprovalClick,
  onFailedClick,
  onStepClick,
}: PipelineStepCardProps) {
  const completionPercent = total > 0 ? (completed / total) * 100 : 0;

  // Determine step status for icon
  let stepStatus:
    | "completed"
    | "processing"
    | "failed"
    | "waiting"
    | "needs_approval" = "waiting";
  if (failed > 0) stepStatus = "failed";
  else if (needsApproval > 0) stepStatus = "needs_approval";
  else if (processing > 0) stepStatus = "processing";
  else if (completed === total) stepStatus = "completed";

  const config = getStatusConfig(stepStatus);
  const StepIcon = config.icon;

  const CardComponent = onStepClick ? "button" : "div";
  const cardBaseClasses = `bg-gray-03/50 rounded-lg p-4 transition-all ${className}`;
  const cardInteractiveClasses = onStepClick
    ? "hover:bg-gray-03 hover:shadow-sm cursor-pointer active:scale-[0.98]"
    : "";

  return (
    <CardComponent
      className={`${cardBaseClasses} ${cardInteractiveClasses}`}
      onClick={onStepClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-01">{name}</span>
        <span className="text-xs font-bold text-gray-01">
          {completionPercent.toFixed(0)}% completed
        </span>
      </div>

      <PipelineProgressBar
        completed={completed}
        processing={processing}
        failed={failed}
        needsApproval={needsApproval}
        waiting={waiting}
        total={total}
        className="mb-2"
      />

      <div className="flex items-center justify-between text-xs text-gray-02">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-green-03" />
          {completed}
        </span>
        <span className="flex items-center gap-1">
          <Loader2 className="w-3 h-3 text-blue-03" />
          {processing}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNeedsApprovalClick?.();
          }}
          disabled={!onNeedsApprovalClick || needsApproval === 0}
          className={`flex items-center gap-1 transition-all ${
            onNeedsApprovalClick && needsApproval > 0
              ? "hover:text-orange-03 cursor-pointer hover:scale-110"
              : ""
          }`}
        >
          <HelpCircle className="w-3 h-3 text-orange-03" />
          {needsApproval}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFailedClick?.();
          }}
          disabled={!onFailedClick || failed === 0}
          className={`flex items-center gap-1 transition-all ${
            onFailedClick && failed > 0
              ? "hover:text-pink-03 cursor-pointer hover:scale-110"
              : ""
          }`}
        >
          <AlertTriangle className="w-3 h-3 text-pink-03" />
          {failed}
        </button>
        <span className="flex items-center gap-1">
          <StepIcon className="w-3 h-3 text-gray-02" />
          {waiting}
        </span>
      </div>
    </CardComponent>
  );
}
