import { useI18n } from "@/contexts/I18nContext";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableShell,
} from "@/ui/data-table";
import { SUSPICION_RULES, type SuspicionFinding } from "../types";
import {
  basisLabelKey,
  ruleBasis,
  ruleDescriptionKey,
  ruleLabelKey,
} from "../lib/finding-display";

const headerClass =
  "px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-02";

/**
 * What each rule looks for and how often it fired, so a reviewer can judge
 * whether a rule is pulling its weight before trusting its findings.
 */
export function SuspiciousRulesView({
  findings,
}: {
  findings: SuspicionFinding[];
}) {
  const { t, formatNumber } = useI18n();

  const counts = new Map<string, { total: number; high: number }>();
  for (const finding of findings) {
    const entry = counts.get(finding.rule) ?? { total: 0, high: 0 };
    entry.total++;
    if (finding.severity === "high") entry.high++;
    counts.set(finding.rule, entry);
  }

  return (
    <DataTableShell>
      <DataTable>
        <DataTableHead>
          <tr>
            <th className={headerClass}>{t("suspicious.table.rule")}</th>
            <th className={headerClass}>
              {t("suspicious.table.comparedWith")}
            </th>
            <th className={headerClass}>{t("suspicious.table.description")}</th>
            <th className={`${headerClass} text-right`}>
              {t("suspicious.table.findings")}
            </th>
            <th className={`${headerClass} text-right`}>
              {t("suspicious.severity.high")}
            </th>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {SUSPICION_RULES.map((rule) => {
            const entry = counts.get(rule) ?? { total: 0, high: 0 };
            return (
              <tr key={rule}>
                <td className="px-4 py-3 text-gray-01 whitespace-nowrap">
                  {t(ruleLabelKey(rule))}
                </td>
                <td className="px-4 py-3 text-gray-02 whitespace-nowrap">
                  {t(basisLabelKey(ruleBasis(rule)))}
                </td>
                <td className="px-4 py-3 text-gray-02">
                  {t(ruleDescriptionKey(rule))}
                </td>
                <td className="px-4 py-3 text-right text-gray-01">
                  {formatNumber(entry.total)}
                </td>
                <td className="px-4 py-3 text-right text-pink-02">
                  {formatNumber(entry.high)}
                </td>
              </tr>
            );
          })}
        </DataTableBody>
      </DataTable>
    </DataTableShell>
  );
}
