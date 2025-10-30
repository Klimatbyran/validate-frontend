/**
 * Workflow Configuration System
 *
 * This file centralizes all workflow-related configuration including:
 * - Queue display names (Swedish translations)
 * - Pipeline step definitions
 * - Field mappings and groupings
 *
 * This replaces hardcoded arrays and makes the system more maintainable.
 */

export interface WorkflowStage {
  id: string;
  name: string;
  description?: string;
}

export interface PipelineStep {
  id: string;
  name: string;
  description?: string;
  stageIds: string[];
  order: number;
}

/**
 * Queue Display Names
 * Maps technical queue IDs to Swedish display names
 */
export const QUEUE_DISPLAY_NAMES: Record<string, string> = {
  // Preprocessing
  nlmParsePDF: "PDF Parsning NLM",
  nlmExtractTables: "Tabellextraktion",
  precheck: "Förkontroll",
  parsePdf: "PDF Parsning",
  doclingParsePDF: "PDF Parsining docling",

  // AI Data Extraction
  guessWikidata: "Wikidata",
  diffReportingPeriods: "Räkenskapsår",
  extractEmissions: "Utsläppsdata",
  followUpScope12: "Uppföljning Scope 1&2",
  followUpScope3: "Uppföljning Scope 3",
  followUpBiogenic: "Uppföljning Biogenisk",
  followUpEconomy: "Uppföljning Ekonomi",
  followUpGoals: "Uppföljning Mål",
  followUpInitiatives: "Uppföljning Initiativ",
  followUpFiscalYear: "Uppföljning Räkenskapsår",
  followUpCompanyTags: "Uppföljning Företagstaggar",
  followUpBaseYear: "Uppföljning Basår",
  followUpIndustryGics: "Uppföljning Bransch GICS",
  diffIndustry: "Bransch",
  diffGoals: "Klimatmål",
  diffInitiatives: "Initiativ",
  diffBaseYear: "Basår",
  checkDB: "DB Kontroll",

  // Finalize
  sendCompanyLink: "Granskning",
  saveToAPI: "API Lagring",
  wikipediaUpload: "Wikipedia",
  diffTags: "Taggar",
  indexMarkdown: "Markdown",
};

/**
 * Pipeline Steps Configuration
 * Defines the logical grouping of workflow stages into pipeline steps
 */
export const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "preprocessing",
    name: "Preprocessing",
    description: "Initial document processing and preparation",
    stageIds: ["nlmParsePDF", "nlmExtractTables", "precheck", "parsePdf", "doclingParsePDF"],
    order: 1,
  },
  {
    id: "data-extraction",
    name: "AI Data Extraction",
    description: "AI-powered data extraction and analysis",
    stageIds: [
      "guessWikidata",
      "diffReportingPeriods",
      "extractEmissions",
      "followUpScope12",
      "followUpScope3",
      "followUpBiogenic",
      "followUpEconomy",
      "followUpGoals",
      "followUpInitiatives",
      "followUpFiscalYear",
      "followUpCompanyTags",
      "followUpBaseYear",
      "followUpIndustryGics",
      "diffIndustry",
      "diffGoals",
      "diffInitiatives",
      "diffBaseYear",
      "checkDB",
    ],
    order: 2,
  },
  {
    id: "finalize",
    name: "Finalize",
    description: "Final processing and data storage",
    stageIds: [
      "sendCompanyLink",
      "saveToAPI",
      "wikipediaUpload",
      "diffTags",
      "indexMarkdown",
    ],
    order: 3,
  },
];

/**
 * Get display name for a queue ID
 */
export function getQueueDisplayName(queueId: string): string {
  return QUEUE_DISPLAY_NAMES[queueId] || queueId;
}

/**
 * Get all workflow stages with display names
 */
export function getWorkflowStages(): WorkflowStage[] {
  return Object.entries(QUEUE_DISPLAY_NAMES).map(([id, name]) => ({
    id,
    name,
  }));
}

/**
 * Get pipeline step for a given queue ID
 */
export function getPipelineStepForQueue(
  queueId: string
): PipelineStep | undefined {
  return PIPELINE_STEPS.find((step) => step.stageIds.includes(queueId));
}

/**
 * Get all queue IDs for a pipeline step
 */
export function getQueuesForPipelineStep(stepId: string): string[] {
  const step = PIPELINE_STEPS.find((s) => s.id === stepId);
  return step?.stageIds || [];
}

/**
 * Get all field names (display names) for a pipeline step
 */
export function getFieldNamesForPipelineStep(stepId: string): string[] {
  const queueIds = getQueuesForPipelineStep(stepId);
  return queueIds.map(getQueueDisplayName);
}

/**
 * Get all field names across all pipeline steps
 */
export function getAllFieldNames(): string[] {
  return Object.values(QUEUE_DISPLAY_NAMES);
}

/**
 * Check if a queue ID is valid
 */
export function isValidQueueId(queueId: string): boolean {
  return queueId in QUEUE_DISPLAY_NAMES;
}

/**
 * Get pipeline step by ID
 */
export function getPipelineStep(stepId: string): PipelineStep | undefined {
  return PIPELINE_STEPS.find((step) => step.id === stepId);
}

/**
 * Get all pipeline steps sorted by order
 */
export function getAllPipelineSteps(): PipelineStep[] {
  return [...PIPELINE_STEPS].sort((a, b) => a.order - b.order);
}
