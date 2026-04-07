import { ExternalLink, Undo2 } from "lucide-react";
import { Button } from "@/ui/button";
import { IconActionButton } from "@/ui/icon-action-button";

export function ReportUrlBar({
  title,
  originalUrl,
  openLabel,
  value,
  placeholder,
  dirty,
  inputClassName,
  onChange,
  onReset,
  resetTitle,
}: {
  title: string;
  originalUrl: string | null;
  openLabel: string;
  value: string;
  placeholder: string;
  dirty: boolean;
  inputClassName: string;
  onChange: (next: string) => void;
  onReset: () => void;
  resetTitle: string;
}) {
  return (
    <div className="shrink-0 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-05/40 px-3 py-2">
      <div className="text-xs font-semibold text-gray-02 uppercase tracking-wide">{title}</div>
      <div className="flex flex-wrap items-center gap-2">
        {originalUrl && (
          <Button asChild size="sm" variant="secondary" className="min-w-0">
            <a href={originalUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              {openLabel}
            </a>
          </Button>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={
            inputClassName +
            " bg-gray-04 !w-[420px] !max-w-full placeholder:text-gray-02/70 " +
            (dirty ? " border-orange-03" : "")
          }
          placeholder={placeholder}
        />
        <IconActionButton variant="md" onClick={onReset} title={resetTitle} aria-label={resetTitle}>
          <Undo2 className="text-gray-02" />
        </IconActionButton>
      </div>
    </div>
  );
}

