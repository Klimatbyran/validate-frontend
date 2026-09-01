import type { SuggestEditorConfig } from "./ReviewControls";
import type { PipelineReview } from "../hooks/usePipelineReviews";

export const COMMITMENT_THEME_OPTIONS = [
  "energy",
  "transport",
  "buildings",
  "food",
  "waste",
  "nature",
  "consumption",
  "adaptation",
  "governance",
  "other",
] as const;

export type ThemeSuggestion = { theme: string };
export type SimilarGroupSuggestion = { similarGroupId: string | null };
export type ExtractCommitmentSuggestion = {
  /** Positive framing: quote was found verbatim (or acceptably) in the plan. */
  foundInDocument: boolean;
};
export type ClimateFilterSuggestion = {
  climateRelevant: boolean;
  adaptation: boolean | null;
};
export type ActionableFilterSuggestion = {
  actionable: boolean;
};
export type TeMatchSuggestion = {
  /** null = remove; otherwise keep/replace with this TE stableId */
  selectedStableId: string | null;
  selectedShortLabel?: string | null;
};

export type TeMatchAddSuggestion = {
  action: "add";
  selectedStableId: string | null;
  selectedShortLabel: string;
  selectedDescription?: string | null;
  /** True when choosing the pipeline's suggested-new TE (no taxonomy id yet). */
  isSuggestedNew?: boolean;
};

function isExtractCommitmentSuggestion(
  value: unknown,
): value is ExtractCommitmentSuggestion {
  if (!value || typeof value !== "object") return false;
  return (
    typeof (value as ExtractCommitmentSuggestion).foundInDocument === "boolean"
  );
}

function isClimateFilterSuggestion(
  value: unknown,
): value is ClimateFilterSuggestion {
  if (!value || typeof value !== "object") return false;
  const v = value as ClimateFilterSuggestion;
  return (
    typeof v.climateRelevant === "boolean" &&
    (v.adaptation === null || typeof v.adaptation === "boolean")
  );
}

function isActionableFilterSuggestion(
  value: unknown,
): value is ActionableFilterSuggestion {
  if (!value || typeof value !== "object") return false;
  return typeof (value as ActionableFilterSuggestion).actionable === "boolean";
}

function isThemeSuggestion(value: unknown): value is ThemeSuggestion {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as ThemeSuggestion).theme === "string"
  );
}

function isSimilarGroupSuggestion(
  value: unknown,
): value is SimilarGroupSuggestion {
  if (!value || typeof value !== "object") return false;
  const id = (value as SimilarGroupSuggestion).similarGroupId;
  return id === null || typeof id === "string";
}

function isTeMatchSuggestion(value: unknown): value is TeMatchSuggestion {
  if (!value || typeof value !== "object") return false;
  if ((value as TeMatchAddSuggestion).action === "add") return false;
  const selected = (value as TeMatchSuggestion).selectedStableId;
  return selected === null || typeof selected === "string";
}

function isTeMatchAddSuggestion(value: unknown): value is TeMatchAddSuggestion {
  if (!value || typeof value !== "object") return false;
  const v = value as TeMatchAddSuggestion;
  return (
    v.action === "add" &&
    typeof v.selectedShortLabel === "string" &&
    (v.selectedStableId === null || typeof v.selectedStableId === "string")
  );
}

export { isTeMatchAddSuggestion };

function YesNoSelect({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  help?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-02">
      {label}
      <select
        className="h-9 rounded-md border border-gray-03 bg-gray-04/40 px-2 text-sm text-gray-01"
        value={value ? "yes" : "no"}
        onChange={(e) => onChange(e.target.value === "yes")}
      >
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
      {help && <span className="text-[11px] text-gray-02">{help}</span>}
    </label>
  );
}

export function extractCommitmentSuggestEditor(args: {
  unverified: boolean;
}): SuggestEditorConfig {
  const foundInDocument = !args.unverified;

  return {
    title: "Suggested extraction judgment",
    getInitialDraft: (review, defaultSuggestedValue) => {
      if (isExtractCommitmentSuggestion(review?.suggestedValue)) {
        return review.suggestedValue;
      }
      if (isExtractCommitmentSuggestion(defaultSuggestedValue)) {
        return defaultSuggestedValue;
      }
      return { foundInDocument } satisfies ExtractCommitmentSuggestion;
    },
    render: ({ draft, setDraft }) => {
      const suggestion = isExtractCommitmentSuggestion(draft)
        ? draft
        : { foundInDocument };
      return (
        <YesNoSelect
          label="Found in document?"
          value={suggestion.foundInDocument}
          onChange={(next) =>
            setDraft({
              foundInDocument: next,
            } satisfies ExtractCommitmentSuggestion)
          }
          help="Yes = this text appears in the plan (extraction is correct). No = invented or not findable."
        />
      );
    },
  };
}

export function climateFilterSuggestEditor(args: {
  climateRelevant: boolean | null;
  adaptation: boolean | null;
}): SuggestEditorConfig {
  const climateRelevant = args.climateRelevant ?? false;
  const adaptation = args.adaptation;

  return {
    title: "Suggested climate filter",
    getInitialDraft: (review, defaultSuggestedValue) => {
      if (isClimateFilterSuggestion(review?.suggestedValue)) {
        return review.suggestedValue;
      }
      if (isClimateFilterSuggestion(defaultSuggestedValue)) {
        return defaultSuggestedValue;
      }
      return {
        climateRelevant,
        adaptation,
      } satisfies ClimateFilterSuggestion;
    },
    render: ({ draft, setDraft }) => {
      const suggestion = isClimateFilterSuggestion(draft)
        ? draft
        : { climateRelevant, adaptation };
      return (
        <div className="space-y-2">
          <YesNoSelect
            label="Climate relevant?"
            value={suggestion.climateRelevant}
            onChange={(next) =>
              setDraft({
                ...suggestion,
                climateRelevant: next,
              } satisfies ClimateFilterSuggestion)
            }
          />
          <label className="flex flex-col gap-1 text-xs text-gray-02">
            Adaptation
            <select
              className="h-9 rounded-md border border-gray-03 bg-gray-04/40 px-2 text-sm text-gray-01"
              value={
                suggestion.adaptation === null
                  ? "unset"
                  : suggestion.adaptation
                    ? "yes"
                    : "no"
              }
              onChange={(e) => {
                const value = e.target.value;
                setDraft({
                  ...suggestion,
                  adaptation: value === "unset" ? null : value === "yes",
                } satisfies ClimateFilterSuggestion);
              }}
            >
              <option value="unset">—</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        </div>
      );
    },
  };
}

export function actionableFilterSuggestEditor(
  actionable: boolean | null,
): SuggestEditorConfig {
  const current = actionable ?? false;
  return {
    title: "Suggested actionable filter",
    getInitialDraft: (review, defaultSuggestedValue) => {
      if (isActionableFilterSuggestion(review?.suggestedValue)) {
        return review.suggestedValue;
      }
      if (isActionableFilterSuggestion(defaultSuggestedValue)) {
        return defaultSuggestedValue;
      }
      return { actionable: current } satisfies ActionableFilterSuggestion;
    },
    render: ({ draft, setDraft }) => {
      const suggestion = isActionableFilterSuggestion(draft)
        ? draft
        : { actionable: current };
      return (
        <YesNoSelect
          label="Actionable?"
          value={suggestion.actionable}
          onChange={(next) =>
            setDraft({
              actionable: next,
            } satisfies ActionableFilterSuggestion)
          }
        />
      );
    },
  };
}

export function themeSuggestEditor(
  currentTheme: string,
  themeOptions: readonly string[] = COMMITMENT_THEME_OPTIONS,
): SuggestEditorConfig {
  const options = themeOptions.includes(currentTheme)
    ? themeOptions
    : currentTheme && currentTheme !== "(none)"
      ? [currentTheme, ...themeOptions]
      : [...themeOptions];

  return {
    title: "Suggested theme for this commitment",
    getInitialDraft: (review, defaultSuggestedValue) => {
      if (isThemeSuggestion(review?.suggestedValue)) {
        return review.suggestedValue;
      }
      if (isThemeSuggestion(defaultSuggestedValue)) {
        return defaultSuggestedValue;
      }
      return {
        theme: currentTheme === "(none)" ? "other" : currentTheme,
      } satisfies ThemeSuggestion;
    },
    render: ({ draft, setDraft }) => {
      const theme = isThemeSuggestion(draft)
        ? draft.theme
        : currentTheme === "(none)"
          ? "other"
          : currentTheme;
      return (
        <label className="flex flex-col gap-1 text-xs text-gray-02">
          Theme
          <select
            className="h-9 rounded-md border border-gray-03 bg-gray-04/40 px-2 text-sm text-gray-01"
            value={theme}
            onChange={(e) =>
              setDraft({ theme: e.target.value } satisfies ThemeSuggestion)
            }
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      );
    },
  };
}

export function similarGroupSuggestEditor(
  currentGroupId: string | null,
  groupOptions: string[],
): SuggestEditorConfig {
  const uniqueValue = "";
  const options = [
    { value: uniqueValue, label: "(unique — no group)" },
    ...groupOptions.map((id) => ({ value: id, label: id })),
  ];

  return {
    title: "Suggested group for this commitment",
    getInitialDraft: (
      review: PipelineReview | undefined,
      defaultSuggestedValue,
    ) => {
      if (isSimilarGroupSuggestion(review?.suggestedValue)) {
        return review.suggestedValue;
      }
      if (isSimilarGroupSuggestion(defaultSuggestedValue)) {
        return defaultSuggestedValue;
      }
      return {
        similarGroupId: currentGroupId,
      } satisfies SimilarGroupSuggestion;
    },
    render: ({ draft, setDraft }) => {
      const selected = isSimilarGroupSuggestion(draft)
        ? (draft.similarGroupId ?? uniqueValue)
        : (currentGroupId ?? uniqueValue);
      return (
        <label className="flex flex-col gap-1 text-xs text-gray-02">
          Similar group
          <select
            className="h-9 rounded-md border border-gray-03 bg-gray-04/40 px-2 text-sm text-gray-01 font-mono"
            value={selected}
            onChange={(e) =>
              setDraft({
                similarGroupId:
                  e.target.value === uniqueValue ? null : e.target.value,
              } satisfies SimilarGroupSuggestion)
            }
          >
            {options.map((option) => (
              <option key={option.value || "unique"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      );
    },
  };
}

export function teMatchSelectEditor(args: {
  current: { stableId: string; shortLabel: string; score: number };
  candidates: Array<{ stableId: string; shortLabel: string; score: number }>;
}): SuggestEditorConfig {
  const { current, candidates } = args;
  const removeValue = "__remove__";

  const options = [
    {
      value: current.stableId,
      label: `${current.shortLabel} (current · ${current.score.toFixed(2)})`,
    },
    ...candidates
      .filter((c) => c.stableId !== current.stableId)
      .map((c) => ({
        value: c.stableId,
        label: `${c.shortLabel} (${c.score.toFixed(2)})`,
      })),
    { value: removeValue, label: "Remove this match" },
  ];

  const labelById = new Map(
    [current, ...candidates].map((c) => [c.stableId, c.shortLabel] as const),
  );

  return {
    title: "Suggested TE for this match",
    getInitialDraft: (review, defaultSuggestedValue) => {
      if (isTeMatchSuggestion(review?.suggestedValue)) {
        return review.suggestedValue;
      }
      if (isTeMatchSuggestion(defaultSuggestedValue)) {
        return defaultSuggestedValue;
      }
      return {
        selectedStableId: current.stableId,
        selectedShortLabel: current.shortLabel,
      } satisfies TeMatchSuggestion;
    },
    render: ({ draft, setDraft }) => {
      const selected = isTeMatchSuggestion(draft)
        ? draft.selectedStableId
        : current.stableId;
      const selectValue = selected ?? removeValue;
      return (
        <label className="flex flex-col gap-1 text-xs text-gray-02">
          Transition element
          <select
            className="h-9 max-w-full rounded-md border border-gray-03 bg-gray-04/40 px-2 text-sm text-gray-01"
            value={selectValue}
            onChange={(e) => {
              const value = e.target.value;
              if (value === removeValue) {
                setDraft({
                  selectedStableId: null,
                  selectedShortLabel: null,
                } satisfies TeMatchSuggestion);
                return;
              }
              setDraft({
                selectedStableId: value,
                selectedShortLabel: labelById.get(value) ?? null,
              } satisfies TeMatchSuggestion);
            }}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {candidates.length === 0 && (
            <span className="text-[11px] text-gray-02">
              No alternate candidates on this shift — only keep or remove.
            </span>
          )}
        </label>
      );
    },
  };
}

export function teMatchAddEditor(args: {
  candidates: Array<{ stableId: string; shortLabel: string; score: number }>;
  suggestedNew?: { shortLabel: string; description: string } | null;
}): SuggestEditorConfig {
  const { candidates, suggestedNew } = args;
  const suggestedNewValue = "__suggested_new__";
  const unsetValue = "";

  const options = [
    { value: unsetValue, label: "Select a TE to add…" },
    ...candidates.map((c) => ({
      value: c.stableId,
      label: `${c.shortLabel} (${c.score.toFixed(2)})`,
    })),
    ...(suggestedNew
      ? [
          {
            value: suggestedNewValue,
            label: `${suggestedNew.shortLabel} (suggested new)`,
          },
        ]
      : []),
  ];

  const labelById = new Map(
    candidates.map((c) => [c.stableId, c.shortLabel] as const),
  );

  return {
    title: "Add a TE match",
    getInitialDraft: (review, defaultSuggestedValue) => {
      if (isTeMatchAddSuggestion(review?.suggestedValue)) {
        return review.suggestedValue;
      }
      if (isTeMatchAddSuggestion(defaultSuggestedValue)) {
        return defaultSuggestedValue;
      }
      const first = candidates[0];
      if (first) {
        return {
          action: "add",
          selectedStableId: first.stableId,
          selectedShortLabel: first.shortLabel,
        } satisfies TeMatchAddSuggestion;
      }
      if (suggestedNew) {
        return {
          action: "add",
          selectedStableId: null,
          selectedShortLabel: suggestedNew.shortLabel,
          selectedDescription: suggestedNew.description,
          isSuggestedNew: true,
        } satisfies TeMatchAddSuggestion;
      }
      return {
        action: "add",
        selectedStableId: null,
        selectedShortLabel: "",
      } satisfies TeMatchAddSuggestion;
    },
    render: ({ draft, setDraft }) => {
      const suggestion = isTeMatchAddSuggestion(draft) ? draft : null;
      const selectValue = suggestion?.isSuggestedNew
        ? suggestedNewValue
        : (suggestion?.selectedStableId ?? unsetValue);

      if (options.length <= 1) {
        return (
          <p className="text-xs text-gray-02 italic">
            No unused candidates available to add on this shift.
          </p>
        );
      }

      return (
        <label className="flex flex-col gap-1 text-xs text-gray-02">
          Add transition element
          <select
            className="h-9 max-w-full rounded-md border border-gray-03 bg-gray-04/40 px-2 text-sm text-gray-01"
            value={selectValue}
            onChange={(e) => {
              const value = e.target.value;
              if (value === unsetValue) {
                setDraft({
                  action: "add",
                  selectedStableId: null,
                  selectedShortLabel: "",
                } satisfies TeMatchAddSuggestion);
                return;
              }
              if (value === suggestedNewValue && suggestedNew) {
                setDraft({
                  action: "add",
                  selectedStableId: null,
                  selectedShortLabel: suggestedNew.shortLabel,
                  selectedDescription: suggestedNew.description,
                  isSuggestedNew: true,
                } satisfies TeMatchAddSuggestion);
                return;
              }
              setDraft({
                action: "add",
                selectedStableId: value,
                selectedShortLabel: labelById.get(value) ?? "",
                isSuggestedNew: false,
              } satisfies TeMatchAddSuggestion);
            }}
          >
            {options.map((option) => (
              <option key={option.value || "unset"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      );
    },
  };
}
