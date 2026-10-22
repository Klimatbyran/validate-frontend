import { cn } from "@/lib/utils";

export function MethodologyPanel({
  title,
  data,
  calculation,
  extra,
}: {
  title?: string;
  data: string;
  calculation: string;
  extra?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-03/40 bg-gray-05/40 px-3 py-2.5 text-xs text-gray-02 space-y-1.5">
      <div className="font-semibold text-gray-01 uppercase tracking-wide">
        {title ?? "How this is calculated"}
      </div>
      <p>
        <span className="font-medium text-gray-01">Data: </span>
        {data}
      </p>
      <p>
        <span className="font-medium text-gray-01">Calculation: </span>
        {calculation}
      </p>
      {extra ? <p className={cn("italic")}>{extra}</p> : null}
    </div>
  );
}
