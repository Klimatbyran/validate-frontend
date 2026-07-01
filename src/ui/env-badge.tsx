import type { ReactNode } from "react";

type EnvBadgeProps = {
  env: "prod" | "stage";
  children: ReactNode;
};

export function EnvBadge({ env, children }: EnvBadgeProps) {
  const className =
    env === "prod"
      ? "bg-pink-03/15 text-pink-02 border-pink-03/30"
      : "bg-blue-03/15 text-blue-02 border-blue-03/30";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}
