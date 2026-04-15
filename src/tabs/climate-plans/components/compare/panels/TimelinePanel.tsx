import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import type { MunicipalityClimatePlan } from "../../../lib/types";
import { Badge } from "../badges";
import { MUNICIPALITY_COLORS } from "../shared";

interface TimelineEvent {
  year: number;
  label: string;
  type: "plan_start" | "plan_end" | "milestone" | "target";
  municipalityIndex: number;
  municipalityName: string;
}

export function TimelinePanel({ municipalities }: { municipalities: MunicipalityClimatePlan[] }) {
  const { t } = useI18n();
  const events: TimelineEvent[] = [];

  municipalities.forEach((m, mi) => {
    const ts = m.planScope?.temporal_scope;
    const et = m.emissionTargets;

    if (ts?.plan_period_start) {
      events.push({
        year: Number(ts.plan_period_start),
        label: t("climate.compare.planStart"),
        type: "plan_start",
        municipalityIndex: mi,
        municipalityName: m.name,
      });
    }
    if (ts?.plan_period_end) {
      events.push({
        year: Number(ts.plan_period_end),
        label: t("climate.compare.planEnd"),
        type: "plan_end",
        municipalityIndex: mi,
        municipalityName: m.name,
      });
    }

    // Extract years from milestones
    ts?.interim_milestones?.forEach((milestone) => {
      const yearMatch = milestone.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        events.push({
          year: Number(yearMatch[1]),
          label: milestone,
          type: "milestone",
          municipalityIndex: mi,
          municipalityName: m.name,
        });
      }
    });

    // Target years from commitments
    et?.own_commitments?.forEach((c) => {
      if (c.target_year) {
        const shortLabel = c.reduction_percentage
          ? `${c.reduction_percentage}% reduction`
          : c.absolute_target || c.goal_description.slice(0, 40);
        events.push({
          year: Number(c.target_year),
          label: shortLabel,
          type: "target",
          municipalityIndex: mi,
          municipalityName: m.name,
        });
      }
    });

    if (et?.primary_target?.target_year) {
      events.push({
        year: Number(et.primary_target.target_year),
        label: t("climate.compare.primaryTarget"),
        type: "target",
        municipalityIndex: mi,
        municipalityName: m.name,
      });
    }
  });

  // Deduplicate events with same year + label + municipality
  const seen = new Set<string>();
  const uniqueEvents = events.filter((e) => {
    const key = `${e.year}-${e.label}-${e.municipalityIndex}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Get year range
  const years = uniqueEvents.map((e) => e.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const yearRange = maxYear - minYear || 1;

  // Group events by year for stacking
  const eventsByYear = new Map<number, TimelineEvent[]>();
  uniqueEvents.forEach((e) => {
    const existing = eventsByYear.get(e.year) || [];
    existing.push(e);
    eventsByYear.set(e.year, existing);
  });

  const typeIcons: Record<TimelineEvent["type"], string> = {
    plan_start: "▶",
    plan_end: "■",
    milestone: "◆",
    target: "★",
  };

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {municipalities.map((m, i) => {
          const color = MUNICIPALITY_COLORS[i % MUNICIPALITY_COLORS.length];
          return (
            <div key={m.id} className="flex items-center gap-2">
              <span className={cn("w-3 h-3 rounded-full", color.bg)} />
              <span className="text-sm text-gray-01">{m.name}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-3 ml-auto text-xs text-gray-02">
          <span>▶ {t("climate.compare.legendStart")}</span>
          <span>■ {t("climate.compare.legendEnd")}</span>
          <span>◆ {t("climate.compare.legendMilestone")}</span>
          <span>★ {t("climate.compare.legendTarget")}</span>
        </div>
      </div>

      {/* Visual timeline */}
      <div className="relative">
        {/* Track */}
        <div className="h-1 bg-gray-03/30 rounded-full mx-8" />

        {/* Year labels along the track */}
        <div className="relative h-0 mx-8">
          {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i)
            .filter((y) => y % 5 === 0 || y === minYear || y === maxYear)
            .map((year) => (
              <div
                key={year}
                className="absolute -top-3 transform -translate-x-1/2"
                style={{ left: `${((year - minYear) / yearRange) * 100}%` }}
              >
                <div className="w-px h-2 bg-gray-03/50 mx-auto" />
                <div className="text-xs text-gray-03 mt-1">{year}</div>
              </div>
            ))}
        </div>

        {/* Events */}
        <div className="relative mt-8 min-h-[120px]">
          {Array.from(eventsByYear.entries())
            .sort(([a], [b]) => a - b)
            .map(([year, yearEvents]) => {
              const leftPct = ((year - minYear) / yearRange) * 100;
              return (
                <div
                  key={year}
                  className="absolute flex flex-col items-center gap-1"
                  style={{
                    left: `calc(${leftPct}% + 32px)`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {yearEvents.map((e, i) => {
                    const color =
                      MUNICIPALITY_COLORS[e.municipalityIndex % MUNICIPALITY_COLORS.length];
                    return (
                      <div key={i} className="group relative flex flex-col items-center">
                        <span className={cn("text-sm cursor-default", color.text)}>
                          {typeIcons[e.type]}
                        </span>
                        {/* Tooltip */}
                        <div className="hidden group-hover:block absolute bottom-full mb-2 z-10">
                          <div
                            className={cn(
                              "rounded-lg px-3 py-2 text-xs whitespace-nowrap border",
                              color.bgFaint,
                              color.border,
                              color.text
                            )}
                          >
                            <div className="font-medium">{e.municipalityName}</div>
                            <div className="text-gray-01">{e.label}</div>
                            <div className="text-gray-02">{e.year}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <span className="text-xs text-gray-02 font-medium">{year}</span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Detail cards below */}
      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: `repeat(${municipalities.length}, 1fr)` }}
      >
        {municipalities.map((m, mi) => {
          const ts = m.planScope?.temporal_scope;
          const color = MUNICIPALITY_COLORS[mi % MUNICIPALITY_COLORS.length];
          if (!ts)
            return (
              <div key={m.id} className="text-gray-02 text-sm">
                {t("climate.compare.noData")}
              </div>
            );
          return (
            <div key={m.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={cn("w-2.5 h-2.5 rounded-full", color.bg)} />
                <span className="text-sm font-medium text-gray-01">{m.name}</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="blue">
                  {ts.plan_period_start} – {ts.plan_period_end}
                </Badge>
                {ts.has_revision_cycle && (
                  <Badge variant="green">{t("climate.compare.hasRevisionCycle")}</Badge>
                )}
                {!ts.has_revision_cycle && <Badge>{t("climate.compare.noRevisionCycle")}</Badge>}
              </div>

              {ts.revision_cycle_description && (
                <div className="text-xs text-gray-02 bg-gray-03/20 rounded-lg p-3">
                  {ts.revision_cycle_description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

