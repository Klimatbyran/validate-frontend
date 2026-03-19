import { cn } from "@/lib/utils";

export function DataTableShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-gray-04/80 backdrop-blur-sm rounded-lg overflow-hidden",
        className
      )}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <table className={cn("min-w-full text-left text-sm", className)}>
      {children}
    </table>
  );
}

export function DataTableHead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <thead className={cn("bg-gray-03/50", className)}>{children}</thead>;
}

export function DataTableBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tbody className={cn("divide-y divide-gray-03/50", className)}>
      {children}
    </tbody>
  );
}

