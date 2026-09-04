import type { ReactNode } from "react";

type EnvBadgeProps = {
  env: "prod" | "stage" | "local";
  children: ReactNode;
};

const ENV_CLASSES: Record<EnvBadgeProps["env"], string> = {
  prod: "bg-pink-03/15 text-pink-02 border-pink-03/30",
  stage: "bg-blue-03/15 text-blue-02 border-blue-03/30",
  local: "bg-gray-03/50 text-gray-01 border-gray-02/30",
};

export function EnvBadge({ env, children }: EnvBadgeProps) {
  const className = ENV_CLASSES[env];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}
