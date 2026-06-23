import { useI18n } from "@/contexts/I18nContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import type {
  OverviewRow,
  OverviewStatusColumn,
  OverviewStatusDetail,
} from "../lib/overview-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: OverviewRow | null;
  column: OverviewStatusColumn | null;
  detail: OverviewStatusDetail | null;
};

export function OverviewStatusModal({
  open,
  onOpenChange,
  row,
  column,
  detail,
}: Props) {
  const { t } = useI18n();

  if (!row || !column || !detail) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t(`overview.columns.${column}`)} — {row.companyName}
          </DialogTitle>
          <DialogDescription>
            {row.reportYear}
            {row.wikidataId ? ` · ${row.wikidataId}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-01">{detail.summary}</p>
          {detail.details.length > 0 ? (
            <ul className="space-y-1 text-sm text-gray-02 list-disc pl-5">
              {detail.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}

          {detail.links?.length ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {detail.links.map((link) => (
                <a
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noreferrer" : undefined}
                  className="inline-flex items-center rounded-md border border-gray-03 px-3 py-1.5 text-xs font-medium text-blue-03 hover:bg-gray-03/30"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
