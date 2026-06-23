import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Minus,
  RotateCw,
  XCircle,
} from "lucide-react";
import type { OverviewStatusKind } from "../lib/overview-types";

const STATUS_ICON_CLASS: Record<OverviewStatusKind, string> = {
  ok: "text-green-03",
  missing: "text-gray-03",
  warning: "text-orange-03",
  error: "text-pink-03",
  progress: "text-blue-03",
  partial: "text-orange-03",
};

type Props = {
  kind: OverviewStatusKind;
  title: string;
  onClick?: () => void;
};

export function OverviewStatusIcon({ kind, title, onClick }: Props) {
  const className = `w-4 h-4 ${STATUS_ICON_CLASS[kind]}`;
  const Icon =
    kind === "ok"
      ? CheckCircle2
      : kind === "error"
        ? XCircle
        : kind === "progress"
          ? RotateCw
          : kind === "warning" || kind === "partial"
            ? AlertCircle
            : kind === "missing"
              ? Minus
              : HelpCircle;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={title}
      className={`inline-flex items-center justify-center rounded p-1 ${
        onClick
          ? "hover:bg-gray-03/40 focus:outline-none focus:ring-2 focus:ring-blue-03"
          : "cursor-default"
      }`}
    >
      <Icon
        className={`${className}${kind === "progress" ? " animate-spin-slow" : ""}`}
      />
    </button>
  );
}
