/**
 * Catalog of fixed rules / hand-authored copy in Website visuals & related KPIs.
 * Numbers still come from live extracts; these pieces may need later retuning.
 */

export type WebsiteRuleFlagId =
  | "tef-focus-families"
  | "conversation-templates"
  | "focus-match-copy"
  | "six-sector-buckets"
  | "concreteness-prompt-thresholds"
  | "english-mock-copy"
  | "story-beat-structure";

export interface WebsiteRuleFlag {
  id: WebsiteRuleFlagId;
  /** Short chip label in the UI */
  label: string;
  /** Where the rule lives in code (for humans revisiting) */
  source: string;
  /** Why we may need to come back */
  note: string;
}

export const WEBSITE_RULE_FLAGS: WebsiteRuleFlag[] = [
  {
    id: "tef-focus-families",
    label: "Focus theme families",
    source: "website-kpis.ts → PUBLIC_FOCUS_FAMILIES",
    note: "Fixed keyword/sector rules that turn TEF hits into plain theme labels and the “what the plan focuses on” sentence. Retune when new measure patterns show up.",
  },
  {
    id: "conversation-templates",
    label: "Conversation / ask lines",
    source:
      "website-kpis.ts → conversationStartersEn; plan-concreteness.ts → concretenessAskPromptEn; website-story-metrics national starters",
    note: "Hand-written English templates filled with live counts. Editorial — keep, rewrite, or cut before public ship.",
  },
  {
    id: "focus-match-copy",
    label: "Biggest-source answer copy",
    source: "website-kpis.ts → focusMatchPlainEn",
    note: "Yes / Partly / Not really wording is fixed; the verdict still comes from live gap + measures.",
  },
  {
    id: "six-sector-buckets",
    label: "Six sectors + Other",
    source: "tef-framework.ts TEF_SECTORS; website-story-metrics STORY_SECTORS",
    note: "Public sector table collapses TEFs into six emission sectors plus Other & cross-cutting. Grouping is by design, not per-municipality hardcoding.",
  },
  {
    id: "concreteness-prompt-thresholds",
    label: "Concreteness prompt thresholds",
    source: "plan-concreteness.ts → concretenessAskPromptEn",
    note: "When to emphasise broad wording vs incomplete who/what/when/how (e.g. share ≥ 0.4, n ≥ 5). Tune after fuller pipeline runs.",
  },
  {
    id: "english-mock-copy",
    label: "English mock copy",
    source: "Website visuals / story components",
    note: "Citizen-facing strings in these mocks are English-only for review. Swedish still needed before klimatkollen.se.",
  },
  {
    id: "story-beat-structure",
    label: "Story beat order & metaphors",
    source: "ClimatePlansStoryView beats",
    note: "Chapter order and visuals (orbit, constellation, split bar) are prototype UX — not pipeline data.",
  },
];

export function ruleFlagById(id: WebsiteRuleFlagId): WebsiteRuleFlag {
  const flag = WEBSITE_RULE_FLAGS.find((f) => f.id === id);
  if (!flag) throw new Error(`Unknown website rule flag: ${id}`);
  return flag;
}
